import { Worker, Queue, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import axios from 'axios';
import { decrypt } from '../utils/crypto';
import { logExecutionEvent } from '../services/executionGraph.service';

const prisma = new PrismaClient();
const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
});

const QUEUE_NAME = 'pr-status-checker';

export const prStatusCheckerQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection as any,
});

const openHours = (openedAt: Date) =>
  Math.floor((Date.now() - openedAt.getTime()) / 3_600_000);

// Set up repeatable job (e.g., in server.ts)
export const schedulePRStatusChecker = async () => {
    // Remove old repeatable jobs if any to avoid duplicates
    const jobs = await prStatusCheckerQueue.getRepeatableJobs();
    for (const job of jobs) {
        await prStatusCheckerQueue.removeRepeatableByKey(job.key);
    }
    
    await prStatusCheckerQueue.add('check-prs', {}, {
        repeat: {
            pattern: '*/30 * * * *', // Every 30 minutes
        }
    });
    console.log('[Worker] Scheduled PR status checker every 30m');
};

export const prStatusCheckerWorker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
        console.log(`[worker] Checking open PR statuses...`);
        
        const openPrs = await (prisma as any).linkedPR.findMany({
            where: { state: 'open' },
            include: { user: { include: { gitHubConnection: true } } }
        });

        for (const pr of openPrs) {
            try {
                if (!pr.user?.gitHubConnection?.accessToken) continue;
                
                const token = decrypt(pr.user.gitHubConnection.accessToken);
                
                const ghRes = await axios.get(`https://api.github.com/repos/${pr.owner}/${pr.repo}/pulls/${pr.prNumber}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/vnd.github.v3+json'
                    }
                });

                const data = ghRes.data;
                const newState = data.state; // 'open' or 'closed'
                const isMerged = data.merged;
                const finalState = isMerged ? 'merged' : newState;
                const openedAt = new Date(data.created_at);
                const mergedAt = data.merged_at ? new Date(data.merged_at) : null;

                const updatedPr = await (prisma as any).linkedPR.update({
                    where: { id: pr.id },
                    data: {
                        state: finalState,
                        prTitle: data.title,
                        openedAt,
                        mergedAt,
                        lastChecked: new Date()
                    }
                });

                if (pr.state !== finalState && (finalState === 'merged' || finalState === 'closed')) {
                    const waitHours = openHours(openedAt);
                    logExecutionEvent(pr.taskId, pr.userId, 'PR_MERGED', { waitHours, prNumber: pr.prNumber });
                }

                if (finalState === 'open' && openHours(openedAt) >= 24) {
                    // Check if a stall event was already fired
                    const stallEvents = await prisma.executionEvent.findMany({
                        where: {
                            taskId: pr.taskId,
                            eventType: 'PR_STALLED'
                        }
                    });

                    if (stallEvents.length === 0) {
                        logExecutionEvent(pr.taskId, pr.userId, 'PR_STALLED', { openHours: openHours(openedAt) });
                    }
                }
                
                // Note: Emit Socket.io event: task:pr_updated to sprint room
                // Since this worker might run in a separate process in production, 
                // emitting to Socket.IO directly requires Redis adapter or webhook.
                // Assuming monolithic pattern for now where IO is global, but typically workers don't have socket.io instance directly.
            } catch (err: any) {
                console.error(`[worker] Failed to check PR ${pr.owner}/${pr.repo}#${pr.prNumber}`, err.message);
            }
        }
    },
    { connection: redisConnection as any }
);
