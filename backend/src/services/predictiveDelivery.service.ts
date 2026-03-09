import prisma from '../utils/prisma';

interface PredictionResult {
    projectId: string;
    deliveryProbability: number;
    requiredHours: number;
    teamCapacity: number;
    estimatedCompletionDate: Date | null;
    factors: string[];
}

export async function getProjectPrediction(projectId: string): Promise<PredictionResult> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { tasks: true, team: { include: { members: true } } },
    });

    if (!project) throw new Error("Project not found");

    const teamId = project.teamId;

    // 1. Calculate Historical Velocity per Priority for the Team
    // Find all completed tasks for this team (across all projects)
    const completedTasks = await prisma.task.findMany({
        where: { project: { teamId }, status: 'DONE' },
        include: { focusSessions: true },
    });

    // Bucket by priority
    const priorityStats: Record<string, { count: number; totalSecs: number }> = {
        low: { count: 0, totalSecs: 0 },
        medium: { count: 0, totalSecs: 0 },
        high: { count: 0, totalSecs: 0 },
    };

    for (const t of completedTasks) {
        const secs = t.focusSessions.reduce((a, s) => a + s.durationSecs, 0);
        if (secs > 0) {
            const p = t.priority.toLowerCase();
            if (priorityStats[p]) {
                priorityStats[p].count += 1;
                priorityStats[p].totalSecs += secs;
            }
        }
    }

    // Default estimates if no history (Low: 2h, Med: 4h, High: 8h)
    const getEstimateHrs = (priority: string) => {
        const p = priority.toLowerCase();
        const stat = priorityStats[p];
        if (stat && stat.count >= 3) {
            return (stat.totalSecs / stat.count) / 3600;
        }
        return p === 'low' ? 2 : p === 'high' ? 8 : 4;
    };

    // 2. Calculate Required Hours for Remaining Tasks
    const incompleteTasks = project.tasks.filter(t => t.status !== 'DONE');
    let requiredHours = 0;

    for (const t of incompleteTasks) {
        requiredHours += getEstimateHrs(t.priority);
    }

    if (requiredHours === 0) {
        return {
            projectId,
            deliveryProbability: 100,
            requiredHours: 0,
            teamCapacity: 0,
            estimatedCompletionDate: new Date(),
            factors: ['All tasks are completed.'],
        };
    }

    // 3. Calculate Team's Weekly Capacity
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const teamSessions = await prisma.focusSession.findMany({
        where: { user: { teams: { some: { teamId } } }, startTime: { gte: fourWeeksAgo }, endTime: { not: null } },
    });

    const totalTeamFocusSecs = teamSessions.reduce((a, s) => a + s.durationSecs, 0);
    // Average weekly capacity over the last 4 weeks (maxed at 1 to prevent division by zero)
    let teamWeeklyCapacityHrs = Math.max((totalTeamFocusSecs / 3600) / 4, 1);

    // If a brand new team has essentially 0 focus hours, assume a baseline capacity (e.g. 5 hrs per member)
    if (teamWeeklyCapacityHrs < 1 && project.team.members.length > 0) {
        teamWeeklyCapacityHrs = project.team.members.length * 5;
    }

    // 4. Predict Delivery
    const factors: string[] = [];

    // Weeks required
    const weeksRequired = requiredHours / teamWeeklyCapacityHrs;
    const daysRequired = Math.ceil(weeksRequired * 7);

    const estimatedCompletionDate = new Date(Date.now() + daysRequired * 24 * 60 * 60 * 1000);

    // Let's assume a "target sprint" is 2 weeks from now. 
    // In a real app we'd map this to explicitly defined sprint boundaries.
    const targetDays = 14;

    factors.push(`Backlog requires ~${requiredHours.toFixed(1)} focus hours to complete.`);
    factors.push(`Team's trailing 4-week capacity averages ${teamWeeklyCapacityHrs.toFixed(1)} focus hours/week.`);

    let deliveryProbability = 100;

    if (daysRequired > targetDays) {
        const overtime = daysRequired / targetDays;
        deliveryProbability = Math.max(10, Math.round(100 / overtime));
        factors.push(`Completion trajectory exceeds typical 2-week sprint boundaries (Est: ${daysRequired} days).`);
        factors.push(`Slippage Risk Detected: Required effort exceeds historical team capacity.`);
    } else {
        const buffer = teamWeeklyCapacityHrs * 2 - requiredHours;
        factors.push(`Healthy buffer: Team has ~${buffer.toFixed(1)} capacity hours remaining in a 2-week window.`);
    }

    // Check for structural blockers in the current project
    const blockedTasksCount = await prisma.executionSignal.count({
        where: { task: { projectId }, blockerRisk: true }
    });

    if (blockedTasksCount > 0) {
        deliveryProbability -= (blockedTasksCount * 10);
        factors.push(`Structural Blockers: ${blockedTasksCount} task(s) in this project have active blocker signals.`);
    }

    deliveryProbability = Math.max(0, Math.min(100, Math.round(deliveryProbability)));

    return {
        projectId,
        deliveryProbability,
        requiredHours: parseFloat(requiredHours.toFixed(1)),
        teamCapacity: parseFloat(teamWeeklyCapacityHrs.toFixed(1)),
        estimatedCompletionDate,
        factors,
    };
}
