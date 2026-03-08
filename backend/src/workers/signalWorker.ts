import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues/signalQueue';
import { computeTaskSignals } from '../services/executionSignals.service';
import { computeFocusStability } from '../services/focusStability.service';
import { invalidate, TTL_SECONDS } from '../utils/cache';

interface SignalJobData {
    taskId: string;
    userId: string;
    sessionStartTime: string;
}

export const signalWorker = new Worker<SignalJobData>(
    'execution-signals',
    async (job: Job<SignalJobData>) => {
        const { taskId, userId, sessionStartTime } = job.data;

        console.log(`[worker] Computing signals for task=${taskId} user=${userId}`);

        await computeTaskSignals(taskId, userId);
        await computeFocusStability(userId, new Date(sessionStartTime));

        // Bust caches so next request gets fresh data
        await invalidate(`signals:task:${taskId}:${userId}`);
        await invalidate(`stability:${userId}`);
        await invalidate(`narrative:${userId}`);

        console.log(`[worker] Signals computed and caches invalidated for user=${userId}`);
    },
    {
        connection: redisConnection,
        concurrency: 5,
    }
);

signalWorker.on('failed', (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

signalWorker.on('error', (err) => {
    console.warn('[worker] Worker error:', err.message);
});

export default signalWorker;
