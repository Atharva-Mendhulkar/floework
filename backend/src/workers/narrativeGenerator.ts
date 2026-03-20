import { Worker, Queue, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import { generateEffortNarrative, NarrativeInput } from '../services/narrativeTemplate';

const prisma = new PrismaClient();
const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
});

const QUEUE_NAME = 'narrative-generator';

export const narrativeGeneratorQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection as any,
});

function getISOWeekLabel(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export const narrativeGeneratorWorker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
        console.log(`[worker] Executing narrative-generator...`);
        const now = new Date();
        const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const past48Hours = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const currentWeekLabel = getISOWeekLabel(now);

        const users = await prisma.user.findMany({
            where: { weeklyReportEnabled: true }
        });

        for (const user of users) {
            // 1. Pull completed tasks
            const completedTasksData = await prisma.task.findMany({
                where: {
                    assigneeId: user.id,
                    status: 'Done',
                    updatedAt: { gte: past7Days }
                },
                include: {
                    focusSessions: true
                }
            });

            const completedTasks = completedTasksData.map((t: any) => {
                const totalSecs = t.focusSessions.reduce((sum: number, s: any) => sum + s.durationSecs, 0);
                return {
                    title: t.title,
                    effort: t.priority,
                    focusHours: totalSecs / 3600
                };
            });

            // 2. Pull stalled tasks
            const stalledTasksData = await prisma.task.findMany({
                where: {
                    assigneeId: user.id,
                    status: 'In Progress',
                    updatedAt: { lte: past48Hours } // Not updated in 48h
                },
                include: {
                    focusSessions: { orderBy: { endTime: 'desc' }, take: 1 },
                    executionEvents: { 
                        where: { eventType: 'PR_STALLED' },
                        orderBy: { timestamp: 'desc' },
                        take: 1
                    }
                }
            });

            const stalledTasks = stalledTasksData.filter((t: any) => {
                const latestSession = t.focusSessions[0];
                return !latestSession || (latestSession.endTime && latestSession.endTime < past48Hours);
            }).map((t: any) => {
                const daysStalled = Math.max(1, Math.floor((now.getTime() - t.updatedAt.getTime()) / (1000 * 3600 * 24)));
                const prStalledEvent = t.executionEvents.length > 0;
                return {
                    title: t.title,
                    daysStalled,
                    reason: prStalledEvent ? 'pr_stalled' : null
                };
            });

            // 3. Pull WeeklyFocusReport
            const weeklyReports = await (prisma as any).weeklyFocusReport.findMany({
                where: { userId: user.id },
                orderBy: { generatedAt: 'desc' },
                take: 4
            });

            const currentReport = weeklyReports.find((r: any) => r.weekLabel === currentWeekLabel);
            const pastReports = weeklyReports.filter((r: any) => r.weekLabel !== currentWeekLabel);
            
            let isPersonalBest = false;
            let sessionCount = 0;
            let avgSessionMins = 0;

            if (currentReport) {
                sessionCount = currentReport.sessionCount;
                avgSessionMins = currentReport.avgSessionMins;
                const pastMaxDeep = pastReports.length > 0 ? Math.max(...pastReports.map((r: any) => r.deepFocusHours)) : 0;
                if (currentReport.deepFocusHours > pastMaxDeep && pastReports.length >= 2) {
                    isPersonalBest = true;
                }
            }

            const focusStats = {
                sessionCount,
                avgSessionMins,
                isPersonalBest
            };

            // 4. afterHoursFlag
            const sessionsThisWeek = await prisma.focusSession.findMany({
                where: { userId: user.id, startTime: { gte: past7Days } }
            });
            
            const afterHoursFlag = sessionsThisWeek.some((s: any) => {
                const hour = s.startTime.getHours(); // defaults to server UTC unless timezone handled
                // Simplification for prototype: using server local time assumption
                return hour < 7 || hour >= 20;
            });

            // 5. Generate body
            const input: NarrativeInput = {
                completedTasks,
                stalledTasks,
                focusStats,
                afterHoursFlag
            };

            const body = generateEffortNarrative(input);

            // 6. Upsert EffortNarrative
            await (prisma as any).effortNarrative.upsert({
                where: {
                    userId_weekLabel: { userId: user.id, weekLabel: currentWeekLabel }
                },
                update: {
                    // Update only if it hasn't been edited by the user
                    body,
                    isEdited: false
                },
                create: {
                    userId: user.id,
                    weekLabel: currentWeekLabel,
                    body
                }
            });
            
            console.log(`[worker] Generated narrative for user=${user.id}`);
        }
    },
    { connection: redisConnection as any }
);

export async function scheduleNarrativeGenerator() {
    const repeatableJobs = await narrativeGeneratorQueue.getRepeatableJobs();
    const existing = repeatableJobs.find(j => j.name === 'narrative-job');
    if (!existing) {
        await narrativeGeneratorQueue.add('narrative-job', {}, {
            repeat: {
                pattern: '0 7 * * 1', // Every Monday 07:00 UTC
            }
        });
        console.log('[queue] Scheduled narrative-generator (Monday 07:00 UTC)');
    }
}
