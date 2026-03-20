import { Worker, Queue, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';

const prisma = new PrismaClient();
const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
});

const QUEUE_NAME = 'weekly-focus-auditor';

export const weeklyFocusAuditorQueue = new Queue(QUEUE_NAME, {
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

export const weeklyFocusAuditorWorker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
        console.log(`[worker] Executing weekly-focus-auditor...`);
        const now = new Date();
        const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const currentWeekLabel = getISOWeekLabel(now);

        const users = await prisma.user.findMany({
            where: { weeklyReportEnabled: true }
        });

        for (const user of users) {
            const sessions = await prisma.focusSession.findMany({
                where: {
                    userId: user.id,
                    startTime: { gte: past7Days }
                }
            });

            const deepSessions = sessions.filter((s: any) => s.durationSecs >= 25 * 60 && s.interrupts <= 2);
            const deepFocusHours = deepSessions.reduce((acc: number, s: any) => acc + s.durationSecs, 0) / 3600;
            const sessionCount = sessions.length;
            const avgSessionMins = sessionCount > 0 ? (sessions.reduce((acc: number, s: any) => acc + s.durationSecs, 0) / sessionCount) / 60 : 0;

            const pastRecords = await prisma.weeklyFocusReport.findMany({
                where: { userId: user.id },
                orderBy: { generatedAt: 'desc' },
                take: 4
            });

            const bestPast = pastRecords.length > 0 ? Math.max(...pastRecords.map((r: any) => r.deepFocusHours)) : 0;
            const bestWeekHours = Math.max(bestPast, deepFocusHours);

            let topFragmentor: string | null = null;

            if (sessions.length > 0) {
                // Group by day (0=Sun, 1=Mon, etc)
                const dayGroups: Record<number, { interrupts: number, durationSecs: number, hoursCount: number, hoursSum: number }> = {};
                for (const s of sessions) {
                    const day = s.startTime.getDay();
                    if (!dayGroups[day]) {
                        dayGroups[day] = { interrupts: 0, durationSecs: 0, hoursCount: 0, hoursSum: 0 };
                    }
                    dayGroups[day].interrupts += s.interrupts;
                    dayGroups[day].durationSecs += s.durationSecs;
                    dayGroups[day].hoursSum += s.startTime.getHours();
                    dayGroups[day].hoursCount++;
                }

                let worstDay = -1;
                let highestRatio = -1;
                let worstDayData = { interrupts: 0, durationSecs: 0, hoursSum: 0, hoursCount: 0 };

                for (const [dayStr, data] of Object.entries(dayGroups)) {
                    const durationHours = data.durationSecs / 3600;
                    if (durationHours > 0) {
                        const ratio = data.interrupts / durationHours;
                        if (ratio > highestRatio) {
                            highestRatio = ratio;
                            worstDay = parseInt(dayStr, 10);
                            worstDayData = data;
                        }
                    }
                }

                if (worstDay !== -1 && highestRatio > 0.5) { // Only if fragmentation is meaningful
                    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const dayName = days[worstDay];
                    const avgHour = worstDayData.hoursSum / worstDayData.hoursCount;
                    let timeOfDay = 'evening';
                    if (avgHour < 12) timeOfDay = 'morning';
                    else if (avgHour < 18) timeOfDay = 'afternoon';
                    
                    topFragmentor = `${dayName} ${timeOfDay} broke your longest focus blocks`;
                }
            }

            await prisma.weeklyFocusReport.upsert({
                where: {
                    userId_weekLabel: { userId: user.id, weekLabel: currentWeekLabel }
                },
                update: {
                    deepFocusHours,
                    sessionCount,
                    avgSessionMins,
                    topFragmentor,
                    bestWeekHours,
                    generatedAt: now
                },
                create: {
                    userId: user.id,
                    weekLabel: currentWeekLabel,
                    deepFocusHours,
                    sessionCount,
                    avgSessionMins,
                    topFragmentor,
                    bestWeekHours,
                    generatedAt: now
                }
            });
        }
    },
    { connection: redisConnection as any }
);

export async function scheduleWeeklyFocusAuditor() {
    const repeatableJobs = await weeklyFocusAuditorQueue.getRepeatableJobs();
    const existing = repeatableJobs.find(j => j.name === 'audit-job');
    if (!existing) {
        await weeklyFocusAuditorQueue.add('audit-job', {}, {
            repeat: {
                pattern: '0 6 * * 1', // Every Monday 06:00 UTC
            }
        });
        console.log('[queue] Scheduled weekly-focus-auditor (Monday 06:00 UTC)');
    }
}
