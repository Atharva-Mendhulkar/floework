import prisma from '../utils/prisma';

export async function seedSampleWorkspace(userId: string, projectId: string): Promise<void> {
    try {
        const sprint = await prisma.sprint.create({
            data: {
                name: 'Your first sprint',
                projectId: projectId,
                startDate: new Date(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            }
        });

        await prisma.task.createMany({
            data: [
                { title: 'Set up development environment', priority: 'S', status: 'Done',        sprintId: sprint.id, projectId: projectId, assigneeId: userId, isSample: true } as any,
                { title: 'Review authentication flow',     priority: 'M', status: 'In Progress', sprintId: sprint.id, projectId: projectId, assigneeId: userId, isSample: true } as any,
                { title: 'Write unit tests for API layer', priority: 'L', status: 'Backlog',     sprintId: sprint.id, projectId: projectId, assigneeId: userId, isSample: true } as any,
            ] as any
        });
        
        console.log(`[seed] Initialized Day 1 sample workspace for user ${userId}`);
    } catch (err) {
        console.error('[seed] Error seeding workspace:', err);
    }
}
