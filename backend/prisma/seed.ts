import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Clearing old data...');
    await prisma.focusSession.deleteMany();
    await prisma.task.deleteMany();
    await prisma.project.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();

    console.log('Seeding Demo Team & Users...');
    const devTeam = await prisma.team.create({
        data: { name: 'Floework Engineering', description: 'Core product development team' }
    });

    const sarah = await prisma.user.create({
        data: { name: 'Sarah Chen', email: 'sarah@floework.com', password: 'password123', role: 'ADMIN' }
    });

    const james = await prisma.user.create({
        data: { name: 'James Park', email: 'james@floework.com', password: 'password123', role: 'MEMBER' }
    });

    await prisma.teamMember.createMany({
        data: [
            { userId: sarah.id, teamId: devTeam.id, teamRole: 'admin' },
            { userId: james.id, teamId: devTeam.id, teamRole: 'member' }
        ]
    });

    console.log('Seeding Demo Project...');
    const sprint = await prisma.project.create({
        data: { name: 'Sprint 14', description: 'Q1 Core Feature additions', teamId: devTeam.id }
    });

    console.log('Seeding Tasks...');
    await prisma.task.createMany({
        data: [
            { title: 'API Schema Design', projectId: sprint.id, assigneeId: sarah.id, status: 'done', phase: 'allocation' },
            { title: 'Component Library Pipeline', projectId: sprint.id, assigneeId: james.id, status: 'in-progress', phase: 'focus' },
            { title: 'Dashboard Layout', projectId: sprint.id, assigneeId: sarah.id, status: 'in-progress', phase: 'focus' },
            { title: 'Redux Setup', projectId: sprint.id, assigneeId: james.id, status: 'pending', phase: 'focus' },
            { title: 'Fix iOS Safari bugs', projectId: sprint.id, status: 'pending', phase: 'resolution' },
            { title: 'Q1 Marketing Page', projectId: sprint.id, status: 'done', phase: 'outcome' },
        ]
    });

    console.log('✅ Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
