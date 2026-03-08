import { Queue, ConnectionOptions } from 'bullmq';

const connection: ConnectionOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
};

export const signalQueue = new Queue('execution-signals', {
    connection,
    defaultJobOptions: {
        removeOnComplete: 100,   // keep last 100 completed
        removeOnFail: 50,        // keep last 50 failed for inspection
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    },
});

signalQueue.on('error', (err) => {
    console.warn('[bull] Queue error (signals will run inline):', err.message);
});

export { connection as redisConnection };
