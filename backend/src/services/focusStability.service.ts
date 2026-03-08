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
