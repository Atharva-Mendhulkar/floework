/**
 * alertGenerator.ts
 * BullMQ worker that generates system alerts for users based on detected signals.
 *
 * Alert types generated:
 * - BURNOUT_RISK: burnout score > 70
 * - BLOCKER_TASK: a task has blockerRisk flagged in ExecutionSignal
 * - STALE_PR: a linked PR hasn't changed state in > 7 days
 * - HIGH_FRAGMENTATION: effortDensity < 0.3 across multiple tasks
 */
import { Queue, Worker } from 'bullmq';
import prisma from '../utils/prisma';
import { getBurnoutSignal } from '../services/advancedAnalytics.service';

const QUEUE_NAME = 'alert-generator';

let alertGeneratorQueue: Queue | null = null;
let alertGeneratorWorker: Worker | null = null;

async function createAlertIfNotExists(
    userId: string,
    type: string,
    message: string,
    relatedId?: string
) {
    // Avoid duplicate alerts — check if an unread alert of this type already exists
    const existing = await prisma.alert.findFirst({
        where: { userId, type, isRead: false, ...(relatedId ? { relatedId } : {}) } as any,
    });
    if (existing) return;

    await prisma.alert.create({
        data: { userId, type, message, ...(relatedId ? { relatedId } : {}) } as any,
    });
}

async function processUser(userId: string) {
    const burnoutData = await getBurnoutSignal(userId);
    const latestWeek = burnoutData[burnoutData.length - 1];

    // Alert 1: High burnout risk
    if (latestWeek.burnoutRisk > 70) {
        await createAlertIfNotExists(
            userId,
            'BURNOUT_RISK',
            `Your burnout risk this week is ${latestWeek.burnoutRisk}%. Consider reducing session load or taking breaks.`
        );
    }

    // Alert 2: Blocked tasks (blockerRisk signal)
    const blockedSignals = await prisma.executionSignal.findMany({
        where: { userId, blockerRisk: true },
        include: { task: { select: { id: true, title: true, status: true } } },
    });

    for (const sig of blockedSignals) {
        if (sig.task.status === 'Done') continue; // resolved
        await createAlertIfNotExists(
            userId,
            'BLOCKER_TASK',
            `Task "${sig.task.title}" shows a structural blocker — high fragmentation and low progress velocity.`,
            sig.taskId
        );
    }

    // Alert 3: Stale open PRs (not updated in > 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const stalePRs = await (prisma as any).linkedPR.findMany({
        where: {
            userId,
            state: 'open',
            updatedAt: { lt: sevenDaysAgo },
        },
        include: { task: { select: { id: true, title: true } } }
    });

    for (const pr of stalePRs) {
        await createAlertIfNotExists(
            userId,
            'STALE_PR',
            `PR #${pr.prNumber} on "${pr.task.title}" has been open for over a week with no activity.`,
            pr.id
        );
    }

    // Alert 4: High fragmentation across tasks
    const fragmented = await prisma.executionSignal.count({
        where: { userId, effortDensity: { lt: 0.3 } }
    });

    if (fragmented >= 3) {
        await createAlertIfNotExists(
            userId,
            'HIGH_FRAGMENTATION',
            `${fragmented} of your tasks have highly fragmented focus sessions. Try longer, uninterrupted blocks.`
        );
    }
}

try {
    alertGeneratorQueue = new Queue(QUEUE_NAME, {
        connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT) || 6379 },
    });

    alertGeneratorWorker = new Worker(
        QUEUE_NAME,
        async (job) => {
            console.log(`[alertGenerator] Running for job ${job.id}`);

            const activeUserIds = await prisma.executionSignal.findMany({
                select: { userId: true },
                distinct: ['userId'],
            });

            let processed = 0;
            for (const { userId } of activeUserIds) {
                try {
                    await processUser(userId);
                    processed++;
                } catch (err) {
                    console.warn(`[alertGenerator] Failed for user ${userId}:`, (err as any)?.message);
                }
            }

            console.log(`[alertGenerator] Done — ${processed} users checked`);
            return { processed };
        },
        {
            connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT) || 6379 },
        }
    );

    alertGeneratorWorker.on('failed', (job, err) => {
        console.error(`[alertGenerator] Job ${job?.id} failed:`, err);
    });
} catch (err) {
    console.warn('[alertGenerator] Redis not available — alert generator disabled');
}

export { alertGeneratorQueue };

export async function scheduleAlertGenerator() {
    if (!alertGeneratorQueue) return;
    // Run every 6 hours
    await alertGeneratorQueue.add('generate-alerts', {}, {
        repeat: { pattern: '0 */6 * * *' },
    });
    await alertGeneratorQueue.add('generate-alerts-init', {});
    console.log('[alertGenerator] Scheduled every 6 hours + immediate run');
}
