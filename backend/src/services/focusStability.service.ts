import prisma from '../utils/prisma';

export async function computeFocusStability(userId: string, startTime: Date) {
    const dayOfWeek = startTime.getDay();
    const hourOfDay = startTime.getHours();

    const slotSessions = await prisma.focusSession.findMany({
        where: { userId, endTime: { not: null } },
    });

    const relevant = slotSessions.filter(
        (s) => s.startTime.getDay() === dayOfWeek && s.startTime.getHours() === hourOfDay
    );

    if (relevant.length === 0) return;

    const avgDuration = relevant.reduce((a, s) => a + s.durationSecs, 0) / relevant.length;
    const avgInterrupts = relevant.reduce((a, s) => a + s.interrupts, 0) / relevant.length;
    const focusScore = parseFloat(
        Math.min(1, avgDuration / Math.max(1, avgDuration + avgInterrupts * 300)).toFixed(3)
    );

    await prisma.focusStabilitySlot.upsert({
        where: { userId_dayOfWeek_hourOfDay: { userId, dayOfWeek, hourOfDay } },
        update: { focusScore, sampleCount: relevant.length },
        create: { userId, dayOfWeek, hourOfDay, focusScore, sampleCount: relevant.length },
    });
}

export async function getUserStabilityGrid(userId: string) {
    return prisma.focusStabilitySlot.findMany({ where: { userId } });
}

export type PeakWindow = { dayOfWeek: number; startHour: number; endHour: number; avgScore: number };

export async function getPeakWindows(userId: string): Promise<PeakWindow[]> {
    const slots = await prisma.focusStabilitySlot.findMany({ where: { userId } });
    if (slots.length < 5) return []; // Require baseline volume

    const scores = slots.map(s => s.focusScore).sort((a,b) => a - b);
    const p85Index = Math.floor(scores.length * 0.85);
    const threshold = scores[p85Index] || 0;

    const topSlots = slots.filter(s => s.focusScore >= threshold).sort((a,b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.hourOfDay - b.hourOfDay;
    });

    const blocks: PeakWindow[] = [];
    for (const slot of topSlots) {
        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock && lastBlock.dayOfWeek === slot.dayOfWeek && lastBlock.endHour === slot.hourOfDay) {
            lastBlock.endHour = slot.hourOfDay + 1;
            lastBlock.avgScore = parseFloat(((lastBlock.avgScore + slot.focusScore) / 2).toFixed(3));
        } else {
            blocks.push({
                dayOfWeek: slot.dayOfWeek,
                startHour: slot.hourOfDay,
                endHour: slot.hourOfDay + 1,
                avgScore: slot.focusScore
            });
        }
    }

    return blocks.sort((a,b) => b.avgScore - a.avgScore).slice(0, 3);
}
