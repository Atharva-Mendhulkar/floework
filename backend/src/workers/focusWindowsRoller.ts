/**
 * focusWindowsRoller.ts
 * BullMQ worker that recomputes peak focus windows for all active users weekly.
 * Calls the existing focusStability service and persists results per user.
 */
import { Queue, Worker } from 'bullmq';
import prisma from '../utils/prisma';
import { getPeakWindows } from '../services/focusStability.service';

const QUEUE_NAME = 'focus-windows-roller';

let focusWindowsQueue: Queue | null = null;
let focusWindowsWorker: Worker | null = null;

try {
    focusWindowsQueue = new Queue(QUEUE_NAME, {
        connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT) || 6379 },
    });

    focusWindowsWorker = new Worker(
        QUEUE_NAME,
        async (job) => {
            console.log(`[focusWindowsRoller] Running for job ${job.id}`);

            // Get all users who have had at least one focus session
            const activeUserIds = await prisma.focusSession.findMany({
                where: { endTime: { not: null } },
                select: { userId: true },
                distinct: ['userId'],
            });

            let processed = 0;
            let errors = 0;

            for (const { userId } of activeUserIds) {
                try {
                    // Recompute peak windows — service upserts FocusStabilitySlot records
                    await getPeakWindows(userId);
                    processed++;
                } catch (err) {
                    errors++;
                    console.warn(`[focusWindowsRoller] Failed for user ${userId}:`, (err as any)?.message);
                }
            }

            console.log(`[focusWindowsRoller] Done — ${processed} users processed, ${errors} errors`);
            return { processed, errors };
        },
        {
            connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT) || 6379 },
        }
    );

    focusWindowsWorker.on('failed', (job, err) => {
        console.error(`[focusWindowsRoller] Job ${job?.id} failed:`, err);
    });
} catch (err) {
    console.warn('[focusWindowsRoller] Redis not available — focus windows worker disabled');
}

export { focusWindowsQueue };

export async function scheduleFocusWindowsRoller() {
    if (!focusWindowsQueue) return;
    // Run immediately on startup, then every Sunday at midnight (via repeat in BullMQ)
    await focusWindowsQueue.add('roll-focus-windows', {}, {
        repeat: { pattern: '0 0 * * 0' }, // Weekly on Sunday midnight
    });
    // Also run once immediately for fresh data
    await focusWindowsQueue.add('roll-focus-windows-init', {});
    console.log('[focusWindowsRoller] Scheduled weekly + immediate run');
}
