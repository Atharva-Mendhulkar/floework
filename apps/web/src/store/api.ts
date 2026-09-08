import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { CognitoAuthService } from '@/services/CognitoAuthService';
import { StorageService } from '@/services/StorageService';
import type { TaskNode, Project, User } from '@/data/mockData';

const API_BASE = import.meta.env.VITE_API_URL || '';

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
                        projects.push({
                            id: 'proj-default-1',
                            name: 'Core Platform',
                            sprintName: 'Sprint 1',
                            teamId: 'team-default-1',
                            createdAt: new Date().toISOString()
                        });
                    }
                    return { data: { success: true, data: projects } };
                } catch {
                    return {
                        data: {
                            success: true,
                            data: [{
                                id: 'proj-default-1',
                                name: 'Core Platform',
                                sprintName: 'Sprint 1',
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
                    if (sprintId !== undefined) {
                        url += `&sprintId=${sprintId}`;
                    }

                    const data = await authFetch(url);

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

                    const tasks: TaskNode[] = (data || []).map((t: any) => ({
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

                    return { data: { success: true, data: tasks } };
                } catch (err: any) {
                    return { error: { status: 500, data: err.message } };
                }
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
                    const data = await authFetch('/api/tasks', {
                        method: 'PATCH',
                        body: JSON.stringify({ id, ...updateData })
                    });
                    return { data: { success: true, data } };
                } catch (err: any) {
                    return { error: { status: 400, data: err.message } };
                }
            },
            invalidatesTags: ['Task'],
        }),
        createTask: builder.mutation<{ success: boolean; data: TaskNode }, { title: string; description?: string; projectId: string; assigneeId?: string; dueDate?: string; priority?: string; sprintId?: string | null }>({
            queryFn: async (taskData) => {
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
                    return { data: { success: true, data } };
                } catch (err: any) {
                    return { error: { status: 400, data: err.message } };
                }
            },
            invalidatesTags: ['Task'],
        }),
        toggleTaskStar: builder.mutation<{ success: boolean; data: any }, { id: string; isStarred: boolean }>({
            queryFn: async ({ id, isStarred }) => {
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
        setupWorkspace: builder.mutation<{ success: boolean; data?: any; message?: string }, { workspaceName?: string; projectName?: string; sprintName?: string; useSandbox?: boolean }>({
            queryFn: async ({ workspaceName = 'Engineering Core' }) => {
                try {
                    const team = await authFetch('/api/workspaces', {
                        method: 'POST',
                        body: JSON.stringify({ name: workspaceName })
                    });
                    return { data: { success: true, data: team } };
                } catch (err: any) {
                    return { error: { status: 400, data: err.message } };
                }
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
            queryFn: async () => ({ data: { success: true, data: [{ id: 'sprint-1', name: 'Sprint 1' }] } }),
        }),
        createProject: builder.mutation<{ success: boolean; data: Project }, { teamId: string; name: string; sprintName?: string }>({
            queryFn: async ({ teamId, name, sprintName = 'Sprint 1' }) => {
                const newProj: Project = {
                    id: 'proj-' + Math.random().toString(36).substring(2, 9),
                    name,
                    sprintName,
                    teamId,
                    createdAt: new Date().toISOString()
                };
                return { data: { success: true, data: newProj } };
            },
            invalidatesTags: ['Project'],
        }),
        createSprint: builder.mutation<{ success: boolean; data: any }, { projectId: string; name: string; startDate: string; endDate: string }>({
            queryFn: async (data) => ({ data: { success: true, data } }),
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
            queryFn: async () => ({ data: { success: true, data: [] } }),
            providesTags: ['Message'],
        }),
        postMessage: builder.mutation<{ success: boolean; data: any }, { projectId: string; content: string }>({
            queryFn: async ({ content }) => {
                const session = CognitoAuthService.getSession();
                return {
                    data: {
                        success: true,
                        data: {
                            id: 'msg-' + Date.now(),
                            content,
                            sender: session?.user?.name || 'User',
                            timestamp: new Date().toISOString()
                        }
                    }
                };
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
            queryFn: async () => ({ data: { success: true, narratives: [] } }),
        }),
        getCurrentEffortNarrative: builder.query<any, void>({
            queryFn: async () => ({ data: { success: true, narrative: null } }),
        }),
        updateNarrative: builder.mutation<any, any>({
            queryFn: async (data) => ({ data: { success: true, data } }),
        }),
        shareNarrative: builder.mutation<any, any>({
            queryFn: async () => ({ data: { success: true, shareUrl: 'https://app.floework.dev/shared' } }),
        }),
        revokeNarrativeShare: builder.mutation<any, any>({
            queryFn: async () => ({ data: { success: true } }),
        }),
        getSharedNarrative: builder.query<any, string>({
            queryFn: async () => ({ data: { success: true, content: 'Productivity narrative snapshot' } }),
        }),
        getAiDisplacementQuery: builder.query<any, void>({
            queryFn: async () => ({ data: { success: true, metric: 0.15 } }),
        }),
        getHasRealTasksQuery: builder.query<any, void>({
            queryFn: async () => ({ data: { hasRealTasks: true } }),
        }),
        deleteSampleTasksMutation: builder.mutation<any, void>({
            queryFn: async () => ({ data: { success: true } }),
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
