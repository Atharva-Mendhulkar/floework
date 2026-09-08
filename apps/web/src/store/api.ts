import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { CognitoAuthService } from '@/services/CognitoAuthService';
import { StorageService } from '@/services/StorageService';
import type { TaskNode, Project, User } from '@/data/mockData';
import { phases as defaultPhases } from '@/data/mockData';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Resilient Local State Stores (Dual-Engine Fallback) ─────────────────────
function getStoredTasks(): TaskNode[] {
    try {
        const raw = localStorage.getItem('floework_tasks_store');
        if (raw) return JSON.parse(raw);
    } catch {}
    const initial: TaskNode[] = (defaultPhases || []).flatMap(p => 
        (p.tasks || []).map(t => ({
            ...t,
            phase: p.id,
            status: t.status === 'done' ? 'done' : t.status === 'in-progress' ? 'in-progress' : 'pending',
            isStarred: t.id === 't1' || t.id === 't3',
            focusCount: t.focusCount || 0,
            version: t.version || 1
        }))
    );
    try {
        localStorage.setItem('floework_tasks_store', JSON.stringify(initial));
    } catch {}
    return initial;
}

function saveStoredTasks(tasks: TaskNode[]) {
    try {
        localStorage.setItem('floework_tasks_store', JSON.stringify(tasks));
    } catch {}
}

function getArchetypeTasks(useCase: string = 'software', projectId: string = 'proj-default-1'): TaskNode[] {
    switch (useCase) {
        case 'product':
            return [
                { id: 't-prod-1', title: 'User Journey Mapping', description: 'Map out key onboarding steps and friction points', status: 'done', phase: 'allocation', projectId, effort: 'M', focusCount: 4, priority: 'medium', isStarred: true, version: 1 },
                { id: 't-prod-2', title: 'Design System Tokens', description: 'Review HSL palette and typography scale', status: 'in-progress', phase: 'allocation', projectId, effort: 'L', focusCount: 7, priority: 'high', version: 1 },
                { id: 't-prod-3', title: 'Interactive Prototype Review', description: 'Team walkthrough of user dashboard flow', status: 'in-progress', hasFocus: true, phase: 'focus', projectId, effort: 'L', focusCount: 12, priority: 'high', version: 1 },
                { id: 't-prod-4', title: 'Usability Testing Analysis', description: 'Session recordings analysis with 5 beta users', status: 'pending', phase: 'focus', projectId, effort: 'M', focusCount: 2, priority: 'medium', version: 1 },
                { id: 't-prod-5', title: 'Accessibility Compliance Audit', description: 'WCAG AA contrast and screen reader review', status: 'pending', phase: 'resolution', projectId, effort: 'S', focusCount: 1, priority: 'low', version: 1 },
                { id: 't-prod-6', title: 'Design Spec Handoff', description: 'Final export for engineering sprint implementation', status: 'done', phase: 'outcome', projectId, effort: 'M', focusCount: 5, priority: 'high', version: 1 },
            ];
        case 'agency':
            return [
                { id: 't-agn-1', title: 'Client Scope & Milestones', description: 'Align deliverables and timeline expectations', status: 'done', phase: 'allocation', projectId, effort: 'M', focusCount: 3, priority: 'high', isStarred: true, version: 1 },
                { id: 't-agn-2', title: 'Creative Direction Moodboards', description: 'Present wireframes and visual moodboards', status: 'in-progress', phase: 'allocation', projectId, effort: 'L', focusCount: 6, priority: 'medium', version: 1 },
                { id: 't-agn-3', title: 'Core Production Sprint', description: 'Active development of client portal features', status: 'in-progress', hasFocus: true, phase: 'focus', projectId, effort: 'L', focusCount: 15, priority: 'high', version: 1 },
                { id: 't-agn-4', title: 'Client Feedback Integration', description: 'Address feedback notes from stakeholders', status: 'pending', phase: 'resolution', projectId, effort: 'M', focusCount: 4, priority: 'medium', version: 1 },
                { id: 't-agn-5', title: 'QA & Staging Sign-Off', description: 'Final acceptance testing before release', status: 'pending', phase: 'resolution', projectId, effort: 'S', focusCount: 2, priority: 'high', version: 1 },
                { id: 't-agn-6', title: 'Production Handover', description: 'Production deployment and client sign-off', status: 'done', phase: 'outcome', projectId, effort: 'S', focusCount: 3, priority: 'high', version: 1 },
            ];
        case 'solo':
            return [
                { id: 't-solo-1', title: 'Weekly Top 3 Priorities', description: 'Isolate high-leverage tasks for the week', status: 'done', phase: 'allocation', projectId, effort: 'S', focusCount: 2, priority: 'high', isStarred: true, version: 1 },
                { id: 't-solo-2', title: 'Deep Work: Core Architecture', description: '90 minutes uninterrupted focus on system design', status: 'in-progress', hasFocus: true, phase: 'focus', projectId, effort: 'L', focusCount: 10, priority: 'high', version: 1 },
                { id: 't-solo-3', title: 'Flow State Journaling', description: 'Track cognitive fatigue and energy peaks', status: 'in-progress', phase: 'focus', projectId, effort: 'S', focusCount: 4, priority: 'medium', version: 1 },
                { id: 't-solo-4', title: 'Eliminate Backlog Friction', description: 'Prune low-value noise and unblock dependencies', status: 'pending', phase: 'resolution', projectId, effort: 'M', focusCount: 1, priority: 'low', version: 1 },
                { id: 't-solo-5', title: 'Weekly Outcome Review', description: 'Review hours spent and completed deliverables', status: 'done', phase: 'outcome', projectId, effort: 'S', focusCount: 3, priority: 'medium', version: 1 },
            ];
        case 'software':
        default:
            return (initialPhases || []).flatMap((p) =>
                (p.tasks || []).map((t) => ({
                    ...t,
                    projectId,
                    isStarred: t.id === 't1' || t.id === 't3',
                    focusCount: t.focusCount || 0,
                    version: t.version || 1
                }))
            );
    }
}

function getStoredMessages(projectId: string): any[] {
    try {
        const raw = localStorage.getItem(`floework_messages_${projectId}`);
        if (raw) return JSON.parse(raw);
    } catch {}
    const initial = [
        {
            id: 'msg-1',
            content: 'Team, the API schema and auth integration are verified. Focus sessions sprint is live!',
            author: { id: 'usr-1', name: 'Sarah Chen', avatarUrl: null },
            createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: 'msg-2',
            content: 'Great update! Execution Graph dependencies are flowing smoothly without bottlenecks.',
            author: { id: 'usr-2', name: 'Marcus Johnson', avatarUrl: null },
            createdAt: new Date(Date.now() - 1800000).toISOString()
        }
    ];
    try {
        localStorage.setItem(`floework_messages_${projectId}`, JSON.stringify(initial));
    } catch {}
    return initial;
}

function saveStoredMessages(projectId: string, msgs: any[]) {
    try {
        localStorage.setItem(`floework_messages_${projectId}`, JSON.stringify(msgs));
    } catch {}
}

function getStoredSprints(projectId: string): any[] {
    try {
        const raw = localStorage.getItem(`floework_sprints_${projectId}`);
        if (raw) return JSON.parse(raw);
    } catch {}
    const initial = [
        { id: 'sprint-1', name: 'Sprint 1', startDate: '2026-09-01', endDate: '2026-09-14' },
        { id: 'sprint-2', name: 'Sprint 2', startDate: '2026-09-15', endDate: '2026-09-28' }
    ];
    try {
        localStorage.setItem(`floework_sprints_${projectId}`, JSON.stringify(initial));
    } catch {}
    return initial;
}

function saveStoredSprints(projectId: string, sprints: any[]) {
    try {
        localStorage.setItem(`floework_sprints_${projectId}`, JSON.stringify(sprints));
    } catch {}
}

async function authFetch(endpoint: string, options: RequestInit = {}) {
    const token = CognitoAuthService.getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((options.headers as any) || {})
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(json.error || json.message || `API error ${res.status}`);
    }
    return json;
}

export const api = createApi({
    reducerPath: 'api',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Task', 'Project', 'User', 'FocusSession', 'Signal', 'Alert', 'Message', 'Billing'],
    endpoints: (builder) => ({
        getUsers: builder.query<{ success: boolean; data: User[] }, void>({
            queryFn: async () => {
                try {
                    const session = CognitoAuthService.getSession();
                    const currentMember: User = {
                        id: session?.user?.id || 'usr-default',
                        email: session?.user?.email || 'dev@floework.dev',
                        name: session?.user?.name || 'Lead Architect',
                        role: 'admin',
                        avatarUrl: session?.user?.avatarUrl,
                        initials: (session?.user?.name || 'LA').substring(0, 2).toUpperCase(),
                        color: 'bg-indigo-500'
                    };
                    return { data: { success: true, data: [currentMember] } };
                } catch (err: any) {
                    return { error: { status: 500, data: err.message } };
                }
            },
            providesTags: ['User'],
        }),
        getProjects: builder.query<{ success: boolean; data: Project[] }, void>({
            queryFn: async () => {
                try {
                    const workspaces = await authFetch('/api/workspaces').catch(() => []);
                    const list = Array.isArray(workspaces) ? workspaces : [];
                    const projects: Project[] = list.map((w: any) => ({
                        id: w.id,
                        name: w.name || 'Core Platform',
                        sprintName: 'Sprint 1',
                        teamId: w.id,
                        createdAt: w.created_at || new Date().toISOString()
                    }));
                    if (projects.length === 0) {
                        const storedName = localStorage.getItem('floework_active_project') || localStorage.getItem('floework_active_workspace') || 'Core Platform';
                        const storedId = localStorage.getItem('floework_active_project_id') || 'proj-default-1';
                        const storedSprint = localStorage.getItem('floework_active_sprint') || 'Sprint 1';
                        projects.push({
                            id: storedId,
                            name: storedName,
                            sprintName: storedSprint,
                            teamId: 'team-default-1',
                            createdAt: new Date().toISOString()
                        });
                    }
                    return { data: { success: true, data: projects } };
                } catch {
                    const storedName = localStorage.getItem('floework_active_project') || localStorage.getItem('floework_active_workspace') || 'Core Platform';
                    const storedId = localStorage.getItem('floework_active_project_id') || 'proj-default-1';
                    const storedSprint = localStorage.getItem('floework_active_sprint') || 'Sprint 1';
                    return {
                        data: {
                            success: true,
                            data: [{
                                id: storedId,
                                name: storedName,
                                sprintName: storedSprint,
                                teamId: 'team-default-1',
                                createdAt: new Date().toISOString()
                            }]
                        }
                    };
                }
            },
            providesTags: ['Project'],
        }),
        getTasks: builder.query<{ success: boolean; data: TaskNode[] }, { projectId?: string; sprintId?: string | null } | void>({
            queryFn: async (args) => {
                const projectId = typeof args === 'object' ? args?.projectId : undefined;
                const sprintId = typeof args === 'object' ? args?.sprintId : undefined;

                try {
                    let url = `/api/bff/tasks?projectId=${projectId || 'fallback-id'}`;
                    if (sprintId !== undefined && sprintId !== null) {
                        url += `&sprintId=${sprintId}`;
                    }

                    const data = await authFetch(url);

                    if (Array.isArray(data) && data.length > 0) {
                        const statusToPhase: Record<string, string> = {
                            backlog: 'allocation',
                            in_progress: 'focus',
                            review: 'resolution',
                            done: 'outcome'
                        };

                        const statusToUiStatus: Record<string, any> = {
                            backlog: 'pending',
                            in_progress: 'in-progress',
                            review: 'in-progress',
                            done: 'done'
                        };

                        const tasks: TaskNode[] = data.map((t: any) => ({
                            id: t.id,
                            title: t.title,
                            description: t.description || '',
                            status: statusToUiStatus[t.status] || 'pending',
                            phase: statusToPhase[t.status] || 'allocation',
                            priority: t.priority === 'H' ? 'high' : t.priority === 'L' ? 'low' : 'medium',
                            dueDate: t.due_date,
                            projectId: t.project_id,
                            sprintId: t.sprint_id,
                            version: t.version || 1,
                            isStarred: Boolean(t.is_starred),
                            focusCount: t.focus_count || 0,
                            assignee: t.assignee_id ? {
                                id: t.assignee_id,
                                name: t.assignee_name || 'Assignee',
                                avatarUrl: t.assignee_avatar_url,
                                initials: (t.assignee_name || 'A').substring(0, 2).toUpperCase()
                            } : undefined,
                            createdAt: t.created_at,
                            updatedAt: t.updated_at
                        }));

                        saveStoredTasks(tasks);
                        return { data: { success: true, data: tasks } };
                    }
                } catch {
                    // Fall back cleanly to stored tasks
                }

                let tasks = getStoredTasks();
                if (sprintId) {
                    tasks = tasks.filter(t => (t as any).sprintId === sprintId);
                }
                return { data: { success: true, data: tasks } };
            },
            providesTags: ['Task'],
        }),
        getTaskDependencies: builder.query<{ success: boolean; data: any[] }, string>({
            queryFn: async (projectId) => {
                try {
                    const res = await authFetch(`/api/tasks/dependencies?projectId=${projectId}`);
                    return { data: { success: true, data: res.edges || [] } };
                } catch {
                    return { data: { success: true, data: [] } };
                }
            },
            providesTags: ['Task'],
        }),
        addDependency: builder.mutation<{ success: boolean; data: any }, { sourceId: string; targetId: string; type?: string; projectId?: string }>({
            queryFn: async ({ sourceId, targetId, type, projectId = 'fallback-id' }) => {
                try {
                    const data = await authFetch('/api/tasks/dependencies', {
                        method: 'POST',
                        body: JSON.stringify({
                            projectId,
                            sourceTaskId: sourceId,
                            targetTaskId: targetId,
                            dependencyType: type || 'BLOCKS'
                        })
                    });
                    return { data: { success: true, data } };
                } catch (err: any) {
                    return { error: { status: 400, data: err.message } };
                }
            },
            invalidatesTags: ['Task'],
        }),
        getTask: builder.query<TaskNode, string>({
            queryFn: async (id) => {
                try {
                    const tasks = await authFetch(`/api/bff/tasks`);
                    const t = (tasks || []).find((item: any) => item.id === id);
                    if (!t) return { error: { status: 404, data: 'Task not found' } };
                    return { data: t };
                } catch (err: any) {
                    return { error: { status: 500, data: err.message } };
                }
            },
            providesTags: ['Task'],
        }),
        updateTask: builder.mutation<{ success: boolean; data: TaskNode }, { id: string; status?: string; phase?: string; title?: string; description?: string; dueDate?: string; priority?: string; assigneeId?: string; version?: number; projectId?: string; sprintId?: string | null }>({
            queryFn: async ({ id, ...updateData }) => {
                try {
                    await authFetch('/api/tasks', {
                        method: 'PATCH',
                        body: JSON.stringify({ id, ...updateData })
                    });
                } catch {
                    // Fall back to client storage
                }

                const currentTasks = getStoredTasks();
                const idx = currentTasks.findIndex(t => t.id === id);
                let updatedTask: any = { id, ...updateData };
                if (idx !== -1) {
                    currentTasks[idx] = {
                        ...currentTasks[idx],
                        ...updateData,
                        version: (currentTasks[idx].version || 1) + 1,
                        updatedAt: new Date().toISOString()
                    };
                    updatedTask = currentTasks[idx];
                    saveStoredTasks(currentTasks);
                }

                return { data: { success: true, data: updatedTask } };
            },
            invalidatesTags: ['Task'],
        }),
        createTask: builder.mutation<{ success: boolean; data: TaskNode }, { title: string; description?: string; projectId: string; assigneeId?: string; dueDate?: string; priority?: string; sprintId?: string | null }>({
            queryFn: async (taskData) => {
                const session = CognitoAuthService.getSession();
                const newTask: TaskNode = {
                    id: 'task-' + Date.now(),
                    title: taskData.title,
                    description: taskData.description || '',
                    status: 'pending',
                    phase: 'allocation',
                    priority: taskData.priority || 'medium',
                    dueDate: taskData.dueDate,
                    projectId: taskData.projectId || 'proj-default-1',
                    focusCount: 0,
                    version: 1,
                    isStarred: false,
                    assignee: {
                        id: session?.user?.id || 'usr-default',
                        name: session?.user?.name || 'User',
                        initials: (session?.user?.name || 'U').substring(0, 2).toUpperCase(),
                        color: 'bg-blue-500'
                    },
                    createdAt: new Date().toISOString()
                };

                try {
                    const data = await authFetch('/api/tasks', {
                        method: 'POST',
                        body: JSON.stringify({
                            title: taskData.title,
                            description: taskData.description,
                            project_id: taskData.projectId,
                            assignee_id: taskData.assigneeId,
                            due_date: taskData.dueDate,
                            priority: taskData.priority,
                            sprint_id: taskData.sprintId
                        })
                    });
                    if (data?.id) newTask.id = data.id;
                } catch {
                    // Stored fallback
                }

                const currentTasks = getStoredTasks();
                saveStoredTasks([newTask, ...currentTasks]);
                return { data: { success: true, data: newTask } };
            },
            invalidatesTags: ['Task'],
        }),
        toggleTaskStar: builder.mutation<{ success: boolean; data: any }, { id: string; isStarred: boolean }>({
            queryFn: async ({ id, isStarred }) => {
                try {
                    await authFetch('/api/tasks', {
                        method: 'PATCH',
                        body: JSON.stringify({ id, is_starred: isStarred })
                    });
                } catch {}

                const currentTasks = getStoredTasks();
                const idx = currentTasks.findIndex(t => t.id === id);
                if (idx !== -1) {
                    currentTasks[idx] = { ...currentTasks[idx], isStarred };
                    saveStoredTasks(currentTasks);
                }

                return { data: { success: true, data: { id, isStarred } } };
            },
            invalidatesTags: ['Task'],
        }),
        login: builder.mutation<any, any>({
            queryFn: async ({ email, password }) => {
                try {
                    const session = await CognitoAuthService.signIn(email, password);
                    return { data: session };
                } catch (err: any) {
                    return { error: { status: 401, data: err.message } };
                }
            },
        }),
        register: builder.mutation<any, any>({
            queryFn: async ({ email, password, name }) => {
                try {
                    const res = await CognitoAuthService.signUp(email, password, name);
                    return { data: res };
                } catch (err: any) {
                    return { error: { status: 400, data: err.message } };
                }
            },
        }),
        forgotPassword: builder.mutation<{ success: boolean; message: string }, { email: string }>({
            queryFn: async ({ email }) => {
                try {
                    await CognitoAuthService.forgotPassword(email);
                    return { data: { success: true, message: 'Recovery instructions sent.' } };
                } catch (err: any) {
                    return { error: { status: 400, data: err.message } };
                }
            },
        }),
        resetPassword: builder.mutation<{ success: boolean; message: string }, { token: string; password: string }>({
            queryFn: async ({ token, password }) => {
                try {
                    const session = CognitoAuthService.getSession();
                    const email = session?.user?.email || '';
                    await CognitoAuthService.confirmForgotPassword(email, token, password);
                    return { data: { success: true, message: 'Password reset successful.' } };
                } catch (err: any) {
                    return { error: { status: 400, data: err.message } };
                }
            },
        }),
        googleLogin: builder.mutation<any, { idToken: string }>({
            queryFn: async () => ({ data: { success: true } }),
        }),
        setupWorkspace: builder.mutation<{ success: boolean; data?: any; message?: string }, { workspaceName?: string; projectName?: string; sprintName?: string; useCase?: string; useSandbox?: boolean; seedTasks?: boolean }>({
            queryFn: async ({ workspaceName = 'Engineering Core', projectName = 'Core Platform', sprintName = 'Sprint 1', useCase = 'software', useSandbox = false, seedTasks = true }) => {
                const teamId = 'team-' + Date.now();
                const projId = 'proj-' + Date.now();

                try {
                    await authFetch('/api/workspaces', {
                        method: 'POST',
                        body: JSON.stringify({ name: workspaceName })
                    });
                } catch {}

                const project: Project = {
                    id: projId,
                    name: projectName,
                    teamId: teamId
                };

                try {
                    localStorage.setItem('floework_active_workspace', workspaceName);
                    localStorage.setItem('floework_active_project', projectName);
                    localStorage.setItem('floework_active_project_id', projId);
                    localStorage.setItem('floework_active_sprint', sprintName);
                    localStorage.setItem('floework_onboarding_use_case', useCase);
                    localStorage.setItem('floework_onboarding_v1_complete', 'true');
                } catch {}

                // Save custom initial sprint
                saveStoredSprints(projId, [
                    {
                        id: 'sprint-1',
                        name: sprintName || 'Sprint 1',
                        status: 'ACTIVE',
                        startDate: new Date().toISOString(),
                        endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
                        projectId: projId
                    }
                ]);

                // Seed appropriate sample tasks for the chosen use case
                if (seedTasks || useSandbox) {
                    const sampleTasks = getArchetypeTasks(useCase, projId);
                    saveStoredTasks(sampleTasks);
                }

                return { data: { success: true, data: project } };
            },
            invalidatesTags: ['Project', 'Task'],
        }),
        getMyTeams: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => {
                try {
                    const data = await authFetch('/api/workspaces');
                    return { data: { success: true, data: Array.isArray(data) ? data : [] } };
                } catch {
                    return { data: { success: true, data: [] } };
                }
            },
            providesTags: ['Project'],
        }),
        createTeam: builder.mutation<{ success: boolean; data: any }, { name: string; description?: string }>({
            queryFn: async ({ name }) => {
                try {
                    const data = await authFetch('/api/workspaces', {
                        method: 'POST',
                        body: JSON.stringify({ name })
                    });
                    return { data: { success: true, data } };
                } catch (err: any) {
                    return { error: { status: 400, data: err.message } };
                }
            },
            invalidatesTags: ['Project'],
        }),
        inviteToTeam: builder.mutation<{ success: boolean; data: any }, { teamId: string; email: string; role?: string }>({
            queryFn: async ({ teamId, email, role }) => {
                try {
                    const data = await authFetch('/api/workspaces/invites', {
                        method: 'POST',
                        body: JSON.stringify({ team_id: teamId, email, role })
                    });
                    return { data: { success: true, data } };
                } catch (err: any) {
                    return { error: { status: 400, data: err.message } };
                }
            },
        }),
        getWorkspaceMembers: builder.query<{ success: boolean; data: any[] }, string>({
            queryFn: async (workspaceId) => {
                try {
                    const data = await authFetch(`/api/workspaces/members?id=${workspaceId}`);
                    return { data: { success: true, data: Array.isArray(data) ? data : [] } };
                } catch {
                    return { data: { success: true, data: [] } };
                }
            },
            providesTags: ['User'],
        }),
        updateWorkspaceMember: builder.mutation<{ success: boolean; data: any }, { workspaceId: string; userId: string; role: string }>({
            queryFn: async ({ workspaceId, userId, role }) => {
                try {
                    const data = await authFetch(`/api/workspaces/members?id=${workspaceId}&userId=${userId}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ role })
                    });
                    return { data: { success: true, data } };
                } catch (err: any) {
                    return { error: { status: 400, data: err.message } };
                }
            },
            invalidatesTags: ['User'],
        }),
        removeWorkspaceMember: builder.mutation<{ success: boolean; data: any }, { workspaceId: string; userId: string }>({
            queryFn: async ({ workspaceId, userId }) => {
                try {
                    await authFetch(`/api/workspaces/members?id=${workspaceId}&userId=${userId}`, {
                        method: 'DELETE'
                    });
                    return { data: { success: true, data: { userId } } };
                } catch (err: any) {
                    return { error: { status: 400, data: err.message } };
                }
            },
            invalidatesTags: ['User'],
        }),
        deleteWorkspace: builder.mutation<{ success: boolean; data: any }, string>({
            queryFn: async (id) => {
                try {
                    await authFetch(`/api/workspaces?id=${id}`, { method: 'DELETE' });
                    return { data: { success: true, data: { id } } };
                } catch (err: any) {
                    return { error: { status: 400, data: err.message } };
                }
            },
            invalidatesTags: ['Project'],
        }),
        updateWorkspace: builder.mutation<{ success: boolean; data: any }, { id: string; name: string; description?: string }>({
            queryFn: async ({ id, name }) => {
                return { data: { success: true, data: { id, name } } };
            },
            invalidatesTags: ['Project'],
        }),
        joinTeam: builder.mutation<{ success: boolean; data: any }, { token: string }>({
            queryFn: async ({ token }) => {
                try {
                    const data = await authFetch(`/api/workspaces/invites?token=${token}`, {
                        method: 'PUT'
                    });
                    return { data: { success: true, data } };
                } catch (err: any) {
                    return { error: { status: 400, data: err.message } };
                }
            },
            invalidatesTags: ['Project'],
        }),
        getProjectSprints: builder.query<{ success: boolean; data: any[] }, string>({
            queryFn: async (projectId = 'proj-default-1') => {
                const sprints = getStoredSprints(projectId);
                return { data: { success: true, data: sprints } };
            },
            providesTags: ['Project'],
        }),
        createProject: builder.mutation<{ success: boolean; data: Project }, { teamId: string; name: string; sprintName?: string }>({
            queryFn: async ({ teamId, name, sprintName = 'Sprint 1' }) => {
                const newProj: Project = {
                    id: 'proj-' + Math.random().toString(36).substring(2, 9),
                    name,
                    teamId,
                    createdAt: new Date().toISOString()
                };
                return { data: { success: true, data: newProj } };
            },
            invalidatesTags: ['Project'],
        }),
        createSprint: builder.mutation<{ success: boolean; data: any }, { projectId: string; name: string; startDate: string; endDate: string }>({
            queryFn: async ({ projectId = 'proj-default-1', name, startDate, endDate }) => {
                const newSprint = {
                    id: 'sprint-' + Date.now(),
                    name,
                    startDate,
                    endDate
                };
                const current = getStoredSprints(projectId);
                saveStoredSprints(projectId, [...current, newSprint]);
                return { data: { success: true, data: newSprint } };
            },
            invalidatesTags: ['Project'],
        }),
        updateSprint: builder.mutation<any, any>({
            queryFn: async () => ({ data: { success: true, data: {} } }),
            invalidatesTags: ['Task'],
        }),
        getFocusSessions: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
            providesTags: ['FocusSession'],
        }),
        startFocusSession: builder.mutation<{ success: boolean; data: any }, string>({
            queryFn: async (taskId) => {
                return { data: { success: true, data: { id: 'session-' + Date.now(), taskId, startedAt: new Date().toISOString() } } };
            },
            invalidatesTags: ['FocusSession'],
        }),
        stopFocusSession: builder.mutation<{ success: boolean; data: any }, { sessionId: string; aiAssisted?: boolean }>({
            queryFn: async ({ sessionId }) => {
                const session = CognitoAuthService.getSession();
                try {
                    await authFetch('/api/focus/complete', {
                        method: 'POST',
                        body: JSON.stringify({
                            userId: session?.user?.id || 'usr-default',
                            durationSecs: 1500,
                            sessionId
                        })
                    });
                } catch {
                    // Non-fatal
                }
                return { data: { success: true, data: { sessionId } } };
            },
            invalidatesTags: ['FocusSession', 'Task'],
        }),
        getDailyProductivity: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
        }),
        logProductivity: builder.mutation<any, any>({
            queryFn: async () => ({ data: { success: true, data: {} } }),
        }),
        getTeamStatus: builder.query<{ success: boolean; data: any[]; count: number }, void>({
            queryFn: async () => ({ data: { success: true, data: [], count: 0 } }),
        }),
        getAnalyticsDashboard: builder.query<{ success: boolean; data: { barData: any[]; burnoutData: any[] } }, void>({
            queryFn: async () => {
                return {
                    data: {
                        success: true,
                        data: {
                            barData: [
                                { day: 'Mon', focusHours: 6.2, velocity: 8 },
                                { day: 'Tue', focusHours: 7.1, velocity: 12 },
                                { day: 'Wed', focusHours: 5.8, velocity: 9 },
                                { day: 'Thu', focusHours: 8.4, velocity: 14 },
                                { day: 'Fri', focusHours: 6.9, velocity: 10 }
                            ],
                            burnoutData: [
                                { week: 'Week 1', score: 32 },
                                { week: 'Week 2', score: 28 },
                                { week: 'Week 3', score: 24 },
                                { week: 'Week 4', score: 22 }
                            ]
                        }
                    }
                };
            },
        }),
        getMessages: builder.query<{ success: boolean; data: any[] }, string>({
            queryFn: async (projectId = 'proj-default-1') => {
                const msgs = getStoredMessages(projectId);
                return { data: { success: true, data: msgs } };
            },
            providesTags: ['Message'],
        }),
        postMessage: builder.mutation<{ success: boolean; data: any }, { projectId: string; content: string }>({
            queryFn: async ({ projectId = 'proj-default-1', content }) => {
                const session = CognitoAuthService.getSession();
                const newMsg = {
                    id: 'msg-' + Date.now(),
                    content,
                    author: {
                        id: session?.user?.id || 'usr-default',
                        name: session?.user?.name || 'You',
                        avatarUrl: session?.user?.avatarUrl || null
                    },
                    createdAt: new Date().toISOString()
                };

                const current = getStoredMessages(projectId);
                saveStoredMessages(projectId, [...current, newMsg]);

                return { data: { success: true, data: newMsg } };
            },
            invalidatesTags: ['Message'],
        }),
        getProfile: builder.query<{ success: boolean; data: User }, void>({
            queryFn: async () => {
                const session = CognitoAuthService.getSession();
                const u = session?.user;
                const user: User = {
                    id: u?.id || 'usr-default',
                    email: u?.email || 'dev@floework.dev',
                    name: u?.name || 'Platform Engineer',
                    role: u?.role || 'admin',
                    avatarUrl: u?.avatarUrl,
                    initials: (u?.name || 'PE').substring(0, 2).toUpperCase(),
                    color: 'bg-emerald-500'
                };
                return { data: { success: true, data: user } };
            },
            providesTags: ['User'],
        }),
        updateProfile: builder.mutation<{ success: boolean; data: User }, Partial<User> & { password?: string; avatarFile?: File }>({
            queryFn: async (profileData) => {
                const session = CognitoAuthService.getSession();
                const userId = session?.user?.id || 'usr-default';
                let avatarUrl = profileData.avatarUrl;

                if (profileData.avatarFile) {
                    const token = CognitoAuthService.getToken() || '';
                    const upload = await StorageService.uploadAvatar(profileData.avatarFile, userId, token);
                    if (upload.publicUrl) {
                        avatarUrl = upload.publicUrl;
                    }
                }

                const updatedUser: User = {
                    id: userId,
                    email: profileData.email || session?.user?.email || '',
                    name: profileData.name || session?.user?.name || 'User',
                    role: profileData.role || session?.user?.role || 'admin',
                    avatarUrl,
                    initials: (profileData.name || session?.user?.name || 'U').substring(0, 2).toUpperCase(),
                    color: 'bg-emerald-500'
                };

                return { data: { success: true, data: updatedUser } };
            },
            invalidatesTags: ['User'],
        }),
        getAlerts: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
            providesTags: ['Alert'],
        }),
        markAlertRead: builder.mutation<any, string>({
            queryFn: async () => ({ data: { success: true } }),
            invalidatesTags: ['Alert'],
        }),
        markAllAlertsRead: builder.mutation<any, void>({
            queryFn: async () => ({ data: { success: true } }),
            invalidatesTags: ['Alert'],
        }),
        getTaskSignals: builder.query<{ success: boolean; data: any | null }, string>({
            queryFn: async () => ({ data: { success: true, data: null } }),
        }),
        getStabilityGrid: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
        }),
        getExecutionNarrative: builder.query<{ success: boolean; data: { summary: string; highlights: string[]; warnings: string[] } }, string>({
            queryFn: async (projectId) => {
                try {
                    const res = await authFetch(`/api/analytics/narrative?projectId=${projectId}`);
                    return { data: { success: true, data: res.data } };
                } catch {
                    return {
                        data: {
                            success: true,
                            data: {
                                summary: 'Workspace is operating with high velocity and stable focus distribution across core deliverables.',
                                highlights: ['All critical path tasks on schedule.', 'Zero blocking cycles detected in DAG.'],
                                warnings: []
                            }
                        }
                    };
                }
            },
        }),
        getRecentActivity: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
        }),
        getBillingStatus: builder.query<{ success: boolean; data: any }, void>({
            queryFn: async () => ({
                data: {
                    success: true,
                    data: { plan: 'pro', status: 'active', renewalDate: '2027-01-01' }
                }
            }),
            providesTags: ['Billing'],
        }),
        createCheckoutSession: builder.mutation<any, 'PRO' | 'TEAM'>({
            queryFn: async () => ({ data: { url: '/billing' } }),
        }),
        createPortalSession: builder.mutation<any, void>({
            queryFn: async () => ({ data: { url: '/billing' } }),
        }),
        getBottlenecks: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
        }),
        getBurnoutTrend: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
        }),
        getTaskReplay: builder.query<any, string>({
            queryFn: async () => ({ data: { success: true, events: [] } }),
        }),
        linkPR: builder.mutation<any, any>({
            queryFn: async () => ({ data: { success: true } }),
        }),
        getProjectPrediction: builder.query<any, string>({
            queryFn: async () => ({ data: { success: true, completionDate: '2026-10-15', confidence: 0.94 } }),
        }),
        getFocusReports: builder.query<any, void>({
            queryFn: async () => ({ data: { success: true, reports: [] } }),
        }),
        getCurrentFocusReport: builder.query<any, void>({
            queryFn: async () => ({ data: { success: true, current: null } }),
        }),
        getEstimationHint: builder.query<any, string>({
            queryFn: async () => ({ data: { success: true, hint: 'Estimated effort: 3-5 hours based on similar tasks.' } }),
        }),
        getEstimationAccuracy: builder.query<any, void>({
            queryFn: async () => ({ data: { success: true, accuracy: 0.88 } }),
        }),
        disconnectGitHub: builder.mutation<any, void>({
            queryFn: async () => ({ data: { success: true } }),
        }),
        getFocusWindows: builder.query<any, void>({
            queryFn: async () => ({ data: { success: true, windows: [] } }),
        }),
        getGoogleCalendarStatus: builder.query<any, void>({
            queryFn: async () => ({ data: { connected: false } }),
        }),
        disconnectGoogleCalendar: builder.mutation<any, void>({
            queryFn: async () => ({ data: { success: true } }),
        }),
        getNarratives: builder.query<any, void>({
            queryFn: async () => {
                return {
                    data: {
                        success: true,
                        narratives: [
                            {
                                id: 'narrative-active',
                                weekLabel: 'Week 36 (Current Sprint)',
                                generatedAt: new Date().toISOString(),
                                body: "Workspace execution velocity remains high across current deliverables. Team focus density reached 88% with zero critical path blockers. Technical resolution on the API schema design and component library pipeline has successfully unblocked downstream deliverables.",
                                highlights: [
                                    "API Schema Design completed ahead of milestone",
                                    "Component library pipeline achieved 12 deep focus sessions",
                                    "Cognito authentication and S3 storage integrations stabilized"
                                ],
                                warnings: []
                            }
                        ]
                    }
                };
            },
        }),
        getCurrentEffortNarrative: builder.query<any, void>({
            queryFn: async () => {
                try {
                    const res = await authFetch('/api/analytics/narrative?projectId=default');
                    if (res?.data) {
                        return { data: { success: true, data: { ...res.data, id: 'narrative-active', weekLabel: 'Current Sprint', generatedAt: new Date().toISOString() } } };
                    }
                } catch {}

                return {
                    data: {
                        success: true,
                        data: {
                            id: 'narrative-active',
                            weekLabel: 'Week 36 (Current Sprint)',
                            generatedAt: new Date().toISOString(),
                            body: "Workspace execution velocity remains high across current deliverables. Team focus density reached 88% with zero critical path blockers. Technical resolution on the API schema design and component library pipeline has successfully unblocked downstream deliverables.",
                            summary: "High execution velocity with 88% focus density. No critical path bottlenecks.",
                            highlights: [
                                "API Schema Design completed ahead of milestone",
                                "Component library pipeline achieved 12 deep focus sessions",
                                "Cognito authentication and S3 storage integrations stabilized"
                            ],
                            warnings: []
                        }
                    }
                };
            },
        }),
        updateNarrative: builder.mutation<any, any>({
            queryFn: async (data) => ({ data: { success: true, data } }),
        }),
        shareNarrative: builder.mutation<any, any>({
            queryFn: async () => ({ data: { success: true, shareUrl: window.location.origin + '/narrative/shared/demo-token-123' } }),
        }),
        revokeNarrativeShare: builder.mutation<any, any>({
            queryFn: async () => ({ data: { success: true } }),
        }),
        getSharedNarrative: builder.query<any, string>({
            queryFn: async () => ({ data: { success: true, content: 'Productivity narrative snapshot' } }),
        }),
        getAiDisplacement: builder.query<any, void>({
            queryFn: async () => ({ data: { success: true, metric: 0.15 } }),
        }),
        getHasRealTasks: builder.query<any, void>({
            queryFn: async () => ({ data: { hasRealTasks: true } }),
        }),
        deleteSampleTasks: builder.mutation<any, void>({
            queryFn: async () => {
                saveStoredTasks([]);
                return { data: { success: true } };
            },
            invalidatesTags: ['Task'],
        }),
    }),
});

export const {
    useGetUsersQuery,
    useGetProjectsQuery,
    useGetTasksQuery,
    useGetTaskDependenciesQuery,
    useAddDependencyMutation,
    useUpdateTaskMutation,
    useCreateTaskMutation,
    useToggleTaskStarMutation,
    useLoginMutation,
    useRegisterMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useSetupWorkspaceMutation,
    useGoogleLoginMutation,
    useGetMyTeamsQuery,
    useCreateTeamMutation,
    useInviteToTeamMutation,
    useJoinTeamMutation,
    useGetWorkspaceMembersQuery,
    useUpdateWorkspaceMemberMutation,
    useRemoveWorkspaceMemberMutation,
    useDeleteWorkspaceMutation,
    useUpdateWorkspaceMutation,
    useGetProjectSprintsQuery,
    useCreateSprintMutation,
    useCreateProjectMutation,
    useUpdateSprintMutation,
    useGetFocusSessionsQuery,
    useStartFocusSessionMutation,
    useStopFocusSessionMutation,
    useGetDailyProductivityQuery,
    useLogProductivityMutation,
    useGetTeamStatusQuery,
    useGetAnalyticsDashboardQuery,
    useGetMessagesQuery,
    usePostMessageMutation,
    useGetProfileQuery,
    useUpdateProfileMutation,
    useGetAlertsQuery,
    useMarkAlertReadMutation,
    useMarkAllAlertsReadMutation,
    useGetTaskSignalsQuery,
    useGetStabilityGridQuery,
    useGetExecutionNarrativeQuery,
    useGetBillingStatusQuery,
    useCreateCheckoutSessionMutation,
    useCreatePortalSessionMutation,
    useGetBottlenecksQuery,
    useGetBurnoutTrendQuery,
    useGetTaskReplayQuery,
    useLinkPRMutation,
    useGetProjectPredictionQuery,
    useGetFocusReportsQuery,
    useGetCurrentFocusReportQuery,
    useGetEstimationHintQuery,
    useGetEstimationAccuracyQuery,
    useDisconnectGitHubMutation,
    useGetFocusWindowsQuery,
    useGetGoogleCalendarStatusQuery,
    useDisconnectGoogleCalendarMutation,
    useGetNarrativesQuery,
    useGetCurrentEffortNarrativeQuery,
    useUpdateNarrativeMutation,
    useShareNarrativeMutation,
    useRevokeNarrativeShareMutation,
    useGetSharedNarrativeQuery,
    useGetAiDisplacementQuery,
    useGetHasRealTasksQuery,
    useDeleteSampleTasksMutation,
    useGetRecentActivityQuery,
} = api;
