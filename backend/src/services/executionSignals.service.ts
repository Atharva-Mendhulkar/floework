import prisma from '../utils/prisma';

export async function computeTaskSignals(taskId: string, userId: string) {
    const sessions = await prisma.focusSession.findMany({
        where: { taskId, userId, endTime: { not: null } },
        orderBy: { startTime: 'asc' },
    });

    if (sessions.length === 0) return null;

    const totalFocusSecs = sessions.reduce((s, r) => s + r.durationSecs, 0);
    const firstStart = sessions[0].startTime.getTime();
    const lastEnd = sessions[sessions.length - 1].endTime!.getTime();
    const spanSecs = Math.max((lastEnd - firstStart) / 1000, 1);

    const effortDensity = parseFloat((totalFocusSecs / spanSecs).toFixed(3));
    const totalInterrupts = sessions.reduce((s, r) => s + r.interrupts, 0);
    const resumeRate = parseFloat((totalInterrupts / sessions.length).toFixed(2));

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    const progressVelocity: string =
        task?.status === 'Done' ? 'high' :
            task?.status === 'In Progress' && effortDensity > 0.6 ? 'medium' : 'low';

    const blockerRisk = effortDensity < 0.4 && progressVelocity === 'low' && sessions.length > 2;

    await prisma.executionSignal.upsert({
        where: { taskId_userId: { taskId, userId } },
        update: { effortDensity, resumeRate, progressVelocity, blockerRisk, computedAt: new Date() },
        create: { taskId, userId, effortDensity, resumeRate, progressVelocity, blockerRisk },
    });

    return { effortDensity, resumeRate, progressVelocity, blockerRisk };
}

export async function getTaskSignals(taskId: string, userId: string) {
    return prisma.executionSignal.findUnique({
        where: { taskId_userId: { taskId, userId } },
    });
}
