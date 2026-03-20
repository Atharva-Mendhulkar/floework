import { Worker, Queue, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';

const prisma = new PrismaClient();
const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
});

const QUEUE_NAME = 'ai-displacement-roller';

export const aiDisplacementQueue = new Queue(QUEUE_NAME, {
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

const EFFORT_SCORE: Record<string, number> = { S: 1, M: 2, L: 3 };

function computeInsight(aiEfforts: string[], humanEfforts: string[]): string {
    if (aiEfforts.length === 0) return 'No AI-assisted tasks completed this week.';
    const aiAvg = aiEfforts.reduce((s, e) => s + (EFFORT_SCORE[e] ?? 2), 0) / aiEfforts.length;
    const humanAvg = humanEfforts.reduce((s, e) => s + (EFFORT_SCORE[e] ?? 2), 0) / (humanEfforts.length || 1);
    
    if (aiAvg < humanAvg - 0.4)
        return 'AI is handling your lighter tasks — your deep human work is trending harder.';
    if (aiAvg > humanAvg + 0.4)
        return 'AI is being used on your harder tasks — check if simpler work is being neglected.';
    return 'AI is saving time on work of similar complexity — consider redirecting it toward harder problems.';
}

export const aiDisplacementWorker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
        console.log(`[worker] Executing ai-displacement-roller...`);
        const now = new Date();
        const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const currentWeekLabel = getISOWeekLabel(now);

        const usersEnabledData = await prisma.user.findMany({
            where: { weeklyReportEnabled: true }
        });

        for (const user of usersEnabledData) {
            // Get all focus sessions within last week
            const sessionsThisWeek = await prisma.focusSession.findMany({
                where: {
                    userId: user.id,
                    startTime: { gte: past7Days }
                },
                include: {
                    task: true
                }
            });

            // Check if user has ANY aiAssisted session this week
            const hasAiSessionThisWeek = sessionsThisWeek.some((s: any) => s.aiAssisted);
            if (!hasAiSessionThisWeek) continue;

            let aiHoursSec = 0;
            let humanHoursSec = 0;
            const completedTasks = new Map<string, { effort: string; aiAssistedCount: number }>();

            for (const s of sessionsThisWeek) {
                if (s.aiAssisted) aiHoursSec += s.durationSecs;
                else humanHoursSec += s.durationSecs;

                // Track task if done this week (approx by checking its status)
                if (s.task.status === 'Done' && s.task.updatedAt >= past7Days) {
                    const tracking = completedTasks.get(s.task.id) || { effort: s.task.priority, aiAssistedCount: 0 };
                    if (s.aiAssisted) tracking.aiAssistedCount++;
                    completedTasks.set(s.task.id, tracking);
                }
            }

            const aiHours = Number((aiHoursSec / 3600).toFixed(2));
            const humanHours = Number((humanHoursSec / 3600).toFixed(2));

            const aiTaskEfforts: string[] = [];
            const humanTaskEfforts: string[] = [];

            Array.from(completedTasks.values()).forEach(t => {
                const effort = t.effort.toUpperCase() === 'HIGH' ? 'L' : t.effort.toUpperCase() === 'LOW' ? 'S' : 'M';
                if (t.aiAssistedCount > 0) aiTaskEfforts.push(effort);
                else humanTaskEfforts.push(effort);
            });

            const insightText = computeInsight(aiTaskEfforts, humanTaskEfforts);

            await (prisma as any).aIDisplacementSummary.upsert({
                where: {
                    userId_weekLabel: { userId: user.id, weekLabel: currentWeekLabel }
                },
                update: {
                    aiHours,
                    humanHours,
                    aiTaskEfforts: JSON.stringify(aiTaskEfforts),
                    humanTaskEfforts: JSON.stringify(humanTaskEfforts),
                    insightText
                },
                create: {
                    userId: user.id,
                    weekLabel: currentWeekLabel,
                    aiHours,
                    humanHours,
                    aiTaskEfforts: JSON.stringify(aiTaskEfforts),
                    humanTaskEfforts: JSON.stringify(humanTaskEfforts),
                    insightText
                }
            });
            console.log(`[worker] Generated AI Displacement roller for user=${user.id}`);
        }
    },
    { connection: redisConnection as any }
);

export async function scheduleAIDisplacementRoller() {
    const repeatableJobs = await aiDisplacementQueue.getRepeatableJobs();
    const existing = repeatableJobs.find(j => j.name === 'ai-displacement-job');
    if (!existing) {
        await aiDisplacementQueue.add('ai-displacement-job', {}, {
            repeat: {
                pattern: '0 23 * * 0', // Every Sunday 23:00 UTC
            }
        });
        console.log('[queue] Scheduled ai-displacement-roller (Sunday 23:00 UTC)');
    }
}
