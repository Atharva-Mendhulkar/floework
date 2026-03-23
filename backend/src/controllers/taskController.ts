import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { logExecutionEvent, getTaskExecutionTimeline } from '../services/executionGraph.service';
import { estimationLoggerQueue } from '../workers/estimationLogger';
import { prStatusCheckerQueue } from '../workers/prStatusChecker';

export const getTaskReplay = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const events = await getTaskExecutionTimeline(req.params.id);
        res.json({ success: true, count: events.length, data: events });
    } catch (error) {
        next(error);
    }
};

export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { projectId, starred } = req.query;
        const userId = (req as any).user?.id;

        // Build user-scoped filter — only return tasks in projects the user is a member of
        const memberFilter = {
            project: {
                team: {
                    members: { some: { userId } }
                }
            }
        };

        const filter: any = { ...memberFilter };
        if (projectId) filter.projectId = String(projectId);
        if (starred === 'true') filter.isStarred = true;

        const tasks = await (prisma as any).task.findMany({
            where: filter,
            include: { 
                assignee: { select: { id: true, name: true } },
                linkedPRs: { take: 1, orderBy: { openedAt: 'desc' } }
            },
        });

        res.json({ success: true, count: tasks.length, data: tasks });
    } catch (error) {
        next(error);
    }
};

export const updateTaskState = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, phase, title, description, dueDate, priority, assigneeId } = req.body;
        const userId = (req as any).user?.id;

        const oldTask = await prisma.task.findUnique({ where: { id: req.params.id } });
        if (!oldTask) return res.status(404).json({ success: false, message: 'Task not found' });

        // Ownership check: user must be assignee OR a member of the task's project team
        if (userId) {
            const membership = await prisma.teamMember.findFirst({
                where: {
                    userId,
                    team: { projects: { some: { id: oldTask.projectId } } }
                }
            });
            if (!membership) {
                return res.status(403).json({ success: false, message: 'Forbidden: you are not a member of this task\'s project' });
            }
        }

        const updateData: any = {};
        if (status !== undefined) updateData.status = status;
        if (phase !== undefined) updateData.phase = phase;
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (priority !== undefined) updateData.priority = priority;
        if (assigneeId !== undefined) updateData.assigneeId = assigneeId;

        const task = await prisma.task.update({
            where: { id: req.params.id },
            data: updateData,
        });

        if (status === 'Done' && oldTask.status !== 'Done') {
            estimationLoggerQueue.add('log-estimation-record', { taskId: task.id }).catch(console.error);
        }

        if (userId) {
            logExecutionEvent(task.id, userId, 'STATUS_CHANGE', { status, phase });
        }

        res.json({ success: true, data: task });
    } catch (error) {
        next(error);
    }
};

export const toggleTaskStar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { isStarred } = req.body;
        const userId = (req as any).user?.id;

        // Verify user has access to this task's project
        const task = await prisma.task.findUnique({ where: { id: req.params.id } });
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        if (userId) {
            const membership = await prisma.teamMember.findFirst({
                where: {
                    userId,
                    team: { projects: { some: { id: task.projectId } } }
                }
            });
            if (!membership) {
                return res.status(403).json({ success: false, message: 'Forbidden' });
            }
        }

        const updated = await prisma.task.update({
            where: { id: req.params.id },
            data: { isStarred },
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { title, description, projectId, assigneeId, dueDate, priority } = req.body;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            return next(new AppError('Project not found for the provided projectId', 404));
        }

        const task = await prisma.task.create({
            data: {
                title,
                description,
                projectId,
                assigneeId: assigneeId || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                priority
            },
        });

        const userId = (req as any).user?.id;
        if (userId) {
            logExecutionEvent(task.id, userId, 'TASK_CREATED', { title, priority });
        }

        res.status(201).json({ success: true, data: task });
    } catch (error) {
        next(error);
    }
};

function parsePRUrl(url: string): { owner: string; repo: string; prNumber: number } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], prNumber: parseInt(match[3]) };
}

export const linkPR = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { prUrl } = req.body;
        const taskId = req.params.id;
        const userId = (req as any).user.id;

        const prData = parsePRUrl(prUrl);
        if (!prData) {
            return res.status(400).json({ success: false, message: 'Invalid GitHub PR URL' });
        }

        const connection = await (prisma as any).gitHubConnection.findUnique({ where: { userId } });
        if (!connection) {
            return res.status(403).json({ success: false, message: 'GitHub account not connected.' });
        }

        // Technically we should fetch PR from GitHub to verify it exists and get initial state, 
        // but for now we create the LinkedPR and let the worker fetch it.
        const linkedPr = await (prisma as any).linkedPR.upsert({
            where: { taskId_owner_repo_prNumber: { taskId, owner: prData.owner, repo: prData.repo, prNumber: prData.prNumber } },
            update: {},
            create: {
                taskId,
                userId,
                owner: prData.owner,
                repo: prData.repo,
                prNumber: prData.prNumber,
            }
        });

        // Enqueue status checker immediately for the newly linked PR
        await prStatusCheckerQueue.add('check-prs', {}).catch(console.error);

        logExecutionEvent(taskId, userId, 'PR_LINKED', { prNumber: prData.prNumber, owner: prData.owner, repo: prData.repo });

        // Update task response includes linkedPr? Build.md says "Extend GET /tasks/:id response" - wait, getTasks already includes stuff. We'll update getTasks if needed.

        res.json({ success: true, data: linkedPr });
    } catch (error) {
        next(error);
    }
};

export const deleteSampleTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        
        const deleted = await prisma.task.deleteMany({
            where: { isSample: true, assigneeId: userId } as any
        });
        
        res.json({ success: true, count: deleted.count, message: 'Sample tasks cleared' });
    } catch (error) {
        next(error);
    }
};
