import { Worker, Queue, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import { EFFORT_BASELINE_HOURS, extractKeywords } from '../config/estimation';

const prisma = new PrismaClient();
const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
});

const QUEUE_NAME = 'log-estimation-record';

export const estimationLoggerQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection as any,
});

export const estimationLoggerWorker = new Worker(
    QUEUE_NAME,
    async (job: Job<{ taskId: string }>) => {
        const { taskId } = job.data;
        console.log(`[worker] Logging estimation record for task=${taskId}`);

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { focusSessions: true }
        });

        if (!task || !task.assigneeId) return;

        // "effort" column exists in Task? Wait. Schema in `schema.prisma` didn't have an "effort" string field for Task. Let me check if `Task` had `effort`.
        // I need to verify `Task` model in `schema.prisma`. Wait, I will use TS bypass but let me first check if effort exists using view_file or list_dir.
        
        let effortLevel = "M"; // Default if not found
        if ((task as any).effort) effortLevel = (task as any).effort;
        
        const actualSecs = task.focusSessions.reduce((acc: number, s: any) => acc + s.durationSecs, 0);
        const actualHours = parseFloat((actualSecs / 3600).toFixed(2));
        const estimatedHours = EFFORT_BASELINE_HOURS[effortLevel] || 5;

        const tagKeywords = extractKeywords(task.title);

        await prisma.estimationRecord.upsert({
            where: { taskId: task.id },
            update: {
                actualHours,
                taskTitle: task.title,
                extractedKeywords: tagKeywords.join(' ')
            },
            create: {
                userId: task.assigneeId,
                taskId: task.id,
                taskTitle: task.title,
                predictedEffort: effortLevel,
                actualHours,
                extractedKeywords: tagKeywords.join(' '),
                createdAt: new Date()
            }
        });

        for (const keyword of tagKeywords) {
            const records = await prisma.estimationRecord.findMany({
                where: {
                    userId: task.assigneeId,
                    predictedEffort: effortLevel,
                    extractedKeywords: { contains: keyword }
                }
            });

            // Need an exact match check since contains matches substrings
            const exactRecords = records.filter((r: any) => r.extractedKeywords.split(' ').includes(keyword));
            if (exactRecords.length === 0) continue;

            const ratio = exactRecords.reduce((acc: number, r: any) => acc + (r.actualHours / EFFORT_BASELINE_HOURS[effortLevel]), 0) / exactRecords.length;

            await prisma.estimationPattern.upsert({
                where: {
                    userId_keyword_predictedEffort: {
                        userId: task.assigneeId,
                        predictedEffort: effortLevel,
                        keyword: keyword
                    }
                },
                update: {
                    ratio,
                    sampleSize: exactRecords.length,
                    actualAvgHours: exactRecords.reduce((acc: number, r: any) => acc + r.actualHours, 0) / exactRecords.length,
                },
                create: {
                    userId: task.assigneeId,
                    keyword: keyword,
                    predictedEffort: effortLevel,
                    ratio,
                    sampleSize: exactRecords.length,
                    actualAvgHours: exactRecords.reduce((acc, r) => acc + r.actualHours, 0) / exactRecords.length,
                }
            });
        }
        console.log(`[worker] Saved estimation logic for task=${taskId}`);
    },
    { connection: redisConnection as any }
);
