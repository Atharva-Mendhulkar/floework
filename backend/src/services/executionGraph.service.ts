import prisma from '../utils/prisma';

export const logExecutionEvent = async (
    taskId: string,
    userId: string,
    eventType: string,
    metadata?: Record<string, any>
) => {
    try {
        const event = await prisma.executionEvent.create({
            data: {
                taskId,
                userId,
                eventType,
                metadata: metadata ? JSON.stringify(metadata) : null,
            },
        });
        return event;
    } catch (error) {
        console.error('Failed to log execution event:', error);
        // Fail silently so we don't block the main thread application flow
    }
};

export const getTaskExecutionTimeline = async (taskId: string) => {
    const events = await prisma.executionEvent.findMany({
        where: { taskId },
        orderBy: { timestamp: 'asc' },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    return events.map(e => ({
        ...e,
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
    }));
};
