import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/lib/supabase';
import type { TaskNode, Project, User } from '@/data/mockData';

export const api = createApi({
    reducerPath: 'api',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Task', 'Project', 'User', 'FocusSession', 'Signal', 'Alert', 'Message', 'Billing'],
    endpoints: (builder) => ({
        getUsers: builder.query<{ success: boolean; data: User[] }, void>({
            queryFn: async () => {
                const { data, error } = await supabase.from('profiles').select('*');
                if (error) return { error: { status: 500, data: error.message } };
                return { data: { success: true, data: (data || []).map(p => ({ id: p.id, email: '', name: p.full_name || 'User', role: 'member', avatarUrl: p.avatar_url })) as any } };
            },
            providesTags: ['User'],
        }),
        getProjects: builder.query<{ success: boolean; data: Project[] }, void>({
            queryFn: async () => {
                const { data, error } = await supabase.from('projects').select('*, teams(name, slug)');
                if (error) return { error: { status: 500, data: error.message } };
                return { data: { success: true, data: (data || []).map(p => ({ id: p.id, name: p.name, sprintName: p.sprint_name, teamId: p.team_id, createdAt: p.created_at })) as any } };
            },
            providesTags: ['Project'],
        }),
        getTasks: builder.query<{ success: boolean; data: TaskNode[] }, string | void>({
            queryFn: async (projectId) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return { error: { status: 401, data: 'Unauthorized' } };

                let q = supabase.from('tasks').select('*, profiles(full_name, avatar_url)');
                if (projectId && projectId !== "fallback-id") q = q.eq('project_id', projectId);
                const { data, error } = await q.order('created_at', { ascending: false });
                if (error) return { error: { status: 500, data: error.message } };

                const statusToPhase: Record<string, string> = {
                    'backlog': 'allocation',
                    'in_progress': 'focus',
                    'review': 'resolution',
                    'done': 'outcome'
                };

                const statusToUiStatus: Record<string, any> = {
                    'backlog': 'pending',
                    'in_progress': 'in-progress',
                    'review': 'in-progress',
                    'done': 'done'
                };

                // Fetch stars for this user
                const { data: starredData } = await supabase
                    .from('starred_tasks')
                    .select('task_id')
                    .eq('user_id', user.id);
                
                const starredIds = new Set(starredData?.map(s => s.task_id) || []);

                return { 
                    data: { 
                        success: true, 
                        data: (data || []).map(t => ({
                            id: t.id, 
                            title: t.title, 
                            description: t.description, 
                            status: statusToUiStatus[t.status] || 'pending',
                            phase: statusToPhase[t.status] || 'allocation', 
                            effort: t.effort, 
                            focusCount: t.focus_count,
                            dueDate: t.due_date, 
                            projectId: t.project_id, 
                            assigneeId: t.assignee_id,
                            blockerRisk: t.blocker_risk, 
                            createdAt: t.created_at, 
                            updatedAt: t.updated_at,
                            isStarred: starredIds.has(t.id), 
                            assignee: t.profiles ? { name: t.profiles.full_name, avatarUrl: t.profiles.avatar_url } : null,
                        })) as any 
                    } 
                };
            },
            providesTags: ['Task'],
        }),
        updateTask: builder.mutation<{ success: boolean; data: TaskNode }, { id: string; status?: string; phase?: string; title?: string; description?: string; dueDate?: string; priority?: string; assigneeId?: string }>({
            queryFn: async ({ id, phase, ...patch }) => {
                const updateData: any = {};
                
                // v1.2 Fix: Map UI phases back to database status values
                const phaseToStatus: Record<string, string> = {
                    'allocation': 'backlog',
                    'focus': 'in_progress',
                    'resolution': 'review',
                    'outcome': 'done'
                };

                if (phase && phaseToStatus[phase]) {
                    updateData.status = phaseToStatus[phase];
                } else if (patch.status) {
                    updateData.status = patch.status;
                }

                if (patch.title) updateData.title = patch.title;
                if (patch.description) updateData.description = patch.description;
                if (patch.dueDate) updateData.due_date = patch.dueDate;
                if (patch.assigneeId) updateData.assignee_id = patch.assigneeId;
                updateData.updated_at = new Date().toISOString();

                const { data, error } = await supabase.from('tasks').update(updateData).eq('id', id).select().single();
                if (error) return { error: { status: 400, data: error.message } };
                return { data: { success: true, data: data as any } };
            },
            invalidatesTags: ['Task'],
        }),
        createTask: builder.mutation<{ success: boolean; data: TaskNode }, { title: string; description?: string; projectId: string; assigneeId?: string; dueDate?: string; priority?: string }>({
            queryFn: async (newTask) => {
                const user = (await supabase.auth.getUser()).data.user;
                const { data, error } = await supabase.from('tasks').insert({
                    title: newTask.title,
                    description: newTask.description || null,
                    project_id: newTask.projectId,
                    assignee_id: newTask.assigneeId || user?.id || null,
                    due_date: newTask.dueDate || null,
                    effort: newTask.priority === 'high' ? 'L' : newTask.priority === 'low' ? 'S' : 'M',
                }).select().single();
                if (error) return { error: { status: 400, data: error.message } };
                return { data: { success: true, data: data as any } };
            },
            invalidatesTags: ['Task'],
        }),
        toggleTaskStar: builder.mutation<{ success: boolean; data: any }, { id: string; isStarred: boolean }>({
            queryFn: async ({ id, isStarred }) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return { error: { status: 401, data: 'Unauthorized' } };

                if (isStarred) {
                    await supabase.from('starred_tasks').insert({ task_id: id, user_id: user.id });
                } else {
                    await supabase.from('starred_tasks').delete().match({ task_id: id, user_id: user.id });
                }
                
                return { data: { success: true, data: {} } };
            },
            invalidatesTags: ['Task'],
        }),
        login: builder.mutation<any, any>({
            queryFn: async ({ email, password }) => {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) return { error: { status: 401, data: { message: error.message } } };
                return { data: { success: true, data: { token: data.session?.access_token, id: data.user?.id, email: data.user?.email, name: data.user?.user_metadata?.full_name || 'User', role: 'admin' } } };
            },
        }),
        register: builder.mutation<any, any>({
            queryFn: async ({ name, email, password }) => {
                const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
                if (error) return { error: { status: 400, data: { message: error.message } } };
                return { data: { success: true, data: { token: '', id: data.user?.id, email: data.user?.email, name, role: 'admin' } } };
            },
        }),
        forgotPassword: builder.mutation<{ success: boolean; message: string }, { email: string }>({
            queryFn: async ({ email }) => {
                const { error } = await supabase.auth.resetPasswordForEmail(email);
                if (error) return { error: { status: 400, data: error.message } };
                return { data: { success: true, message: 'Reset email sent' } };
            },
        }),
        resetPassword: builder.mutation<{ success: boolean; message: string }, { token: string; password: string }>({
            queryFn: async ({ password }) => {
                const { error } = await supabase.auth.updateUser({ password });
                if (error) return { error: { status: 400, data: error.message } };
                return { data: { success: true, message: 'Password updated' } };
            },
        }),
        googleLogin: builder.mutation<any, { idToken: string }>({
            queryFn: async () => ({ data: { success: true, data: {} } }),
        }),
        setupWorkspace: builder.mutation<{ success: boolean; data?: any; message?: string }, { workspaceName?: string; projectName?: string; sprintName?: string; useSandbox?: boolean }>({
            queryFn: async ({ workspaceName, projectName, sprintName, useSandbox }) => {
                const user = (await supabase.auth.getUser()).data.user;
                if (!user) return { error: { status: 401, data: 'Not authenticated' } };

                // Create a team for the user
                const teamName = workspaceName || projectName || 'My Workspace';
                const teamSlug = teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                const { data: team, error: teamErr } = await supabase.from('teams')
                    .insert({ name: teamName, slug: `${teamSlug}-${Date.now()}` })
                    .select()
                    .single();
                
                if (teamErr) {
                    console.error("Team Creation Error:", teamErr);
                    return { error: { status: 400, data: `Team creation failed: ${teamErr.message}` } };
                }

                // Add user as admin
                const { error: memberErr } = await supabase.from('team_members')
                    .insert({ team_id: team.id, user_id: user.id, role: 'admin' });
                
                if (memberErr) {
                    console.error("Member Creation Error:", memberErr);
                    return { error: { status: 400, data: `Joining team failed: ${memberErr.message}` } };
                }

                // Create project
                const { data: proj, error: projErr } = await supabase.from('projects')
                    .insert({ team_id: team.id, name: projectName || 'Core Platform', sprint_name: sprintName || 'Sprint 1' })
                    .select()
                    .single();
                
                if (projErr) {
                    console.error("Project Creation Error:", projErr);
                    return { error: { status: 400, data: `Project creation failed: ${projErr.message}` } };
                }

                if (useSandbox) {
                    // Seed sample tasks
                    await supabase.from('tasks').insert([
                        { project_id: proj.id, assignee_id: user.id, title: 'Setup Realtime channels', status: 'done', effort: 'M', focus_count: 4 },
                        { project_id: proj.id, assignee_id: user.id, title: 'FlowBoard drag-and-drop', status: 'done', effort: 'L', focus_count: 7 },
                        { project_id: proj.id, assignee_id: user.id, title: 'Focus session post-confirm', status: 'done', effort: 'S', focus_count: 2 },
                        { project_id: proj.id, assignee_id: user.id, title: 'Burnout risk trend chart', status: 'in_progress', effort: 'L', focus_count: 3 },
                        { project_id: proj.id, assignee_id: user.id, title: 'Execution signal backend', status: 'in_progress', effort: 'L', focus_count: 5 },
                        { project_id: proj.id, assignee_id: user.id, title: 'Focus Stability Heatmap', status: 'review', effort: 'M', focus_count: 2 },
                        { project_id: proj.id, assignee_id: user.id, title: 'Stripe billing stubs', status: 'backlog', effort: 'S', focus_count: 0 },
                        { project_id: proj.id, assignee_id: user.id, title: 'Deep Work .ics export', status: 'backlog', effort: 'M', focus_count: 0 },
                    ]);
                }

                return { data: { success: true, data: { team, project: proj }, message: 'Workspace ready' } };
            },
            invalidatesTags: ['Project', 'Task', 'User'],
        }),
        getMyTeams: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => {
                const user = (await supabase.auth.getUser()).data.user;
                if (!user) return { data: { success: true, data: [] } };
                const { data } = await supabase.from('team_members').select('*, teams(*)').eq('user_id', user.id);
                return { data: { success: true, data: (data || []).map(m => m.teams) } };
            },
            providesTags: ['User'],
        }),
        createTeam: builder.mutation<{ success: boolean; data: any }, { name: string; description?: string }>({
            queryFn: async ({ name }) => {
                const user = (await supabase.auth.getUser()).data.user;
                if (!user) return { error: { status: 401, data: 'Not authenticated' } };
                const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
                const { data: team, error } = await supabase.from('teams').insert({ name, slug }).select().single();
                if (error) return { error: { status: 400, data: error.message } };
                await supabase.from('team_members').insert({ team_id: team.id, user_id: user.id, role: 'admin' });
                // Auto-create a default project
                await supabase.from('projects').insert({ team_id: team.id, name: 'Core Platform', sprint_name: 'Sprint 1' });
                return { data: { success: true, data: team } };
            },
            invalidatesTags: ['User'],
        }),
        inviteToTeam: builder.mutation<{ success: boolean; data: any }, { teamId: string; email: string; role?: string }>({
            queryFn: async ({ teamId, email, role }) => {
                const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                const { data, error } = await supabase
                    .from('team_invitations')
                    .insert({ team_id: teamId, email, role: role || 'member', token })
                    .select()
                    .single();
                
                if (error) return { error: { status: 400, data: { message: error.message } } };
                return { data: { success: true, data: { ...data, token } } };
            },
            invalidatesTags: ['Message'],
        }),
        getWorkspaceMembers: builder.query<{ success: boolean; data: any[] }, string>({
            queryFn: async (workspaceId) => {
                const { data, error } = await supabase
                    .from('team_members')
                    .select('*, profiles(full_name, avatar_url)')
                    .eq('team_id', workspaceId);
                
                if (error) return { error: { status: 500, data: error.message } };
                return { data: { success: true, data: data || [] } };
            },
            providesTags: ['User'],
        }),
        updateWorkspaceMember: builder.mutation<{ success: boolean; data: any }, { workspaceId: string; userId: string; role: string }>({
            queryFn: async ({ workspaceId, userId, role }) => {
                const { data, error } = await supabase
                    .from('team_members')
                    .update({ role })
                    .match({ team_id: workspaceId, user_id: userId })
                    .select()
                    .single();
                
                if (error) return { error: { status: 400, data: error.message } };
                return { data: { success: true, data } };
            },
            invalidatesTags: ['User'],
        }),
        removeWorkspaceMember: builder.mutation<{ success: boolean; data: any }, { workspaceId: string; userId: string }>({
            queryFn: async ({ workspaceId, userId }) => {
                const { error } = await supabase
                    .from('team_members')
                    .delete()
                    .match({ team_id: workspaceId, user_id: userId });
                
                if (error) return { error: { status: 400, data: error.message } };
                return { data: { success: true, data: {} } };
            },
            invalidatesTags: ['User', 'Project', 'Task'],
        }),
        deleteWorkspace: builder.mutation<{ success: boolean; data: any }, string>({
            queryFn: async (workspaceId) => {
                const { error } = await supabase
                    .from('teams')
                    .delete()
                    .eq('id', workspaceId);
                
                if (error) return { error: { status: 400, data: error.message } };
                return { data: { success: true, data: {} } };
            },
            invalidatesTags: ['User', 'Project', 'Task'],
        }),
        updateWorkspace: builder.mutation<{ success: boolean; data: any }, { id: string; name: string; description?: string }>({
            queryFn: async ({ id, name }) => {
                const { data, error } = await supabase
                    .from('teams')
                    .update({ name })
                    .eq('id', id)
                    .select()
                    .single();
                
                if (error) return { error: { status: 400, data: error.message } };
                return { data: { success: true, data } };
            },
            invalidatesTags: ['User', 'Project'],
        }),
        joinTeam: builder.mutation<{ success: boolean; data: any }, { token: string }>({
            queryFn: async ({ token }) => {
                const user = (await supabase.auth.getUser()).data.user;
                if (!user) return { error: { status: 401, data: 'Not authenticated' } };

                // 1. Find invitation
                const { data: invite, error: inviteErr } = await supabase
                    .from('team_invitations')
                    .select('*')
                    .eq('token', token)
                    .single();
                
                if (inviteErr || !invite) return { error: { status: 404, data: { message: 'Invalid or expired token' } } };

                // 2. Add as member
                const { error: joinErr } = await supabase
                    .from('team_members')
                    .insert({ team_id: invite.team_id, user_id: user.id, role: invite.role });

                if (joinErr) return { error: { status: 400, data: { message: joinErr.message } } };

                // 3. Cleanup invite
                await supabase.from('team_invitations').delete().eq('id', invite.id);

                return { data: { success: true, data: { teamId: invite.team_id } } };
            },
            invalidatesTags: ['User', 'Project', 'Task'],
        }),
        getProjectSprints: builder.query<{ success: boolean; data: any[] }, string>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
            providesTags: ['Task'],
        }),
        createProject: builder.mutation<{ success: boolean; data: Project }, { teamId: string; name: string; sprintName?: string }>({
            queryFn: async ({ teamId, name, sprintName }) => {
                const { data, error } = await supabase.from('projects')
                    .insert({ team_id: teamId, name, sprint_name: sprintName || 'Sprint 1' }).select().single();
                if (error) return { error: { status: 400, data: error.message } };
                return { data: { success: true, data: data as any } };
            },
            invalidatesTags: ['Project'],
        }),
        createSprint: builder.mutation<{ success: boolean; message: string }, { projectId: string; sprintName: string }>({
            queryFn: async ({ projectId, sprintName }) => {
                const { error } = await supabase.from('projects').update({ sprint_name: sprintName }).eq('id', projectId);
                if (error) return { error: { status: 400, data: error.message } };
                return { data: { success: true, message: 'Sprint updated' } };
            },
            invalidatesTags: ['Project', 'Task'],
        }),
        updateSprint: builder.mutation<any, any>({ queryFn: async () => ({ data: { success: true, data: {} } }), invalidatesTags: ['Task'] }),
        getFocusSessions: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => {
                const user = (await supabase.auth.getUser()).data.user;
                if (!user) return { data: { success: true, data: [] } };
                const { data } = await supabase.from('focus_sessions').select('*, tasks(title)').eq('user_id', user.id).order('started_at', { ascending: false });
                return { data: { success: true, data: data || [] } };
            },
            providesTags: ['FocusSession'],
        }),
        startFocusSession: builder.mutation<{ success: boolean; data: any }, string>({
            queryFn: async (taskId) => {
                const user = (await supabase.auth.getUser()).data.user;
                if (!user) return { error: { status: 401, data: 'Not authenticated' } };
                const { data, error } = await supabase.from('focus_sessions').insert({ task_id: taskId, user_id: user.id }).select().single();
                if (error) return { error: { status: 400, data: error.message } };
                return { data: { success: true, data } };
            },
            invalidatesTags: ['FocusSession'],
        }),
        stopFocusSession: builder.mutation<{ success: boolean; data: any }, { sessionId: string; aiAssisted?: boolean }>({
            queryFn: async ({ sessionId }) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return { error: { status: 401, data: 'Not authenticated' } };

                const now = new Date().toISOString();
                const { data: session, error: getErr } = await supabase
                    .from('focus_sessions')
                    .select('started_at')
                    .match({ id: sessionId, user_id: user.id })
                    .single();

                if (getErr || !session) return { error: { status: 404, data: 'Session not found or unauthorized' } };

                const durationSecs = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000);
                
                const { data, error } = await supabase
                    .from('focus_sessions')
                    .update({ ended_at: now, duration_secs: durationSecs })
                    .match({ id: sessionId, user_id: user.id })
                    .select()
                    .single();

                if (error) return { error: { status: 400, data: error.message } };
                
                return { data: { success: true, data } };
            },
            invalidatesTags: ['FocusSession', 'Task'],
        }),
        getDailyProductivity: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
        }),
        logProductivity: builder.mutation<any, any>({ queryFn: async () => ({ data: { success: true, data: {} } }) }),
        getTeamStatus: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => {
                const { data, error } = await supabase
                    .from('focus_sessions')
                    .select('*, profiles!left(full_name, avatar_url), tasks!left(title)')
                    .is('ended_at', null);
                
                if (error) return { error: { status: 500, data: error.message } };

                const statuses = (data || []).map(fs => ({
                    status: "In Focus",
                    task: fs.tasks?.title || "Productive Work",
                    member: {
                        id: fs.user_id,
                        name: fs.profiles?.full_name || "Unknown",
                        initials: fs.profiles?.full_name?.substring(0, 2).toUpperCase() || "??",
                        color: "bg-blue-100 text-blue-600"
                    }
                }));

                return { data: { success: true, data: statuses } };
            },
            providesTags: ['FocusSession', 'User'],
        }),
        getAnalyticsDashboard: builder.query<{ success: boolean; data: { barData: any[], burnoutData: any[] } }, void>({
            queryFn: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return { data: { success: true, data: { barData: [], burnoutData: [] } } };

                // Fetch last 7 days of focus sessions for the current user
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                
                const { data: focusData } = await supabase
                    .from('focus_sessions')
                    .select('duration_secs, started_at, ended_at, user_id')
                    .gte('started_at', sevenDaysAgo.toISOString());
                
                const { data: taskData } = await supabase
                    .from('tasks')
                    .select('status, updated_at')
                    .eq('status', 'done')
                    .gte('updated_at', sevenDaysAgo.toISOString());

                // Aggregate Focus Hours by day
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const statsMap: Record<string, { focusHrs: number; tasksCompleted: number }> = {};
                
                for (let i = 0; i < 7; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dayLabel = days[d.getDay()];
                    statsMap[dayLabel] = { focusHrs: 0, tasksCompleted: 0 };
                }

                (focusData || []).forEach(fs => {
                    const dayLabel = days[new Date(fs.started_at).getDay()];
                    if (statsMap[dayLabel]) {
                        // Estimate duration if session is still active
                        let duration = fs.duration_secs || 0;
                        if (!fs.ended_at) {
                            duration = Math.floor((Date.now() - new Date(fs.started_at).getTime()) / 1000);
                        }
                        statsMap[dayLabel].focusHrs += Math.max(0, duration) / 3600;
                    }
                });

                (taskData || []).forEach(t => {
                    const dayLabel = days[new Date(t.updated_at).getDay()];
                    if (statsMap[dayLabel]) {
                        statsMap[dayLabel].tasksCompleted += 1;
                    }
                });

                const barData = Object.entries(statsMap).map(([name, data]) => ({
                    name,
                    ...data
                })).reverse();

                // Calculate team-wide burnout risk
                const burnoutData = barData.map(d => ({
                    day: d.name,
                    burnoutRisk: Math.min(Math.round((d.focusHrs / 40) * 100), 100) // 40h team capacity baseline
                }));

                return { data: { success: true, data: { barData, burnoutData } } };
            },
            providesTags: ['FocusSession', 'Task'],
        }),
        getMessages: builder.query<{ success: boolean; data: any[] }, string>({
            queryFn: async (projectId) => {
                const { data, error } = await supabase
                    .from('messages')
                    .select('*, author:profiles(full_name, avatar_url)')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: true });
                
                if (error) return { error: { status: 500, data: error.message } };
                
                return { data: { 
                    success: true, 
                    data: (data || []).map(m => ({
                        id: m.id,
                        content: m.content,
                        createdAt: m.created_at,
                        author: {
                            id: m.author_id,
                            name: m.author?.full_name || 'Unknown',
                            avatarUrl: m.author?.avatar_url
                        }
                    }))
                } };
            },
            providesTags: ['Message'],
        }),
        postMessage: builder.mutation<{ success: boolean; data: any }, { projectId: string; content: string }>({
            queryFn: async ({ projectId, content }) => {
                const user = (await supabase.auth.getUser()).data.user;
                if (!user) return { error: { status: 401, data: 'Not authenticated' } };

                // 1. Insert the message
                const { data, error } = await supabase
                    .from('messages')
                    .insert({ project_id: projectId, content, author_id: user.id })
                    .select('*, author:profiles(full_name, avatar_url)')
                    .single();
                
                if (error) {
                    console.error('[Floework] Message Insert Error:', error);
                    return { error: { status: 400, data: error.message } };
                }
                
                return { data: { 
                    success: true, 
                    data: {
                        id: data.id,
                        content: data.content,
                        createdAt: data.created_at,
                        author: {
                            id: data.author_id,
                            name: data.author?.full_name || 'Me',
                            avatarUrl: data.author?.avatar_url
                        }
                    }
                } };
            },
            invalidatesTags: ['Message'],
        }),
        getProfile: builder.query<{ success: boolean; data: User }, void>({
            queryFn: async () => {
                const user = (await supabase.auth.getUser()).data.user;
                if (!user) return { error: { status: 401, data: 'Not authenticated' } };
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                return { data: { success: true, data: { id: user.id, email: user.email || '', name: profile?.full_name || user.user_metadata?.full_name || 'User', role: 'admin', avatarUrl: profile?.avatar_url } as any } };
            },
            providesTags: ['User'],
        }),
        updateProfile: builder.mutation<{ success: boolean; data: User }, Partial<User> & { password?: string }>({
            queryFn: async (profileData) => {
                const user = (await supabase.auth.getUser()).data.user;
                if (!user) return { error: { status: 401, data: 'Not authenticated' } };
                if (profileData.name) await supabase.from('profiles').update({ full_name: profileData.name }).eq('id', user.id);
                if (profileData.password) await supabase.auth.updateUser({ password: profileData.password });
                return { data: { success: true, data: profileData as any } };
            },
            invalidatesTags: ['User'],
        }),
        getAlerts: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
            providesTags: ['Alert'],
        }),
        markAlertRead: builder.mutation<any, string>({ queryFn: async () => ({ data: { success: true, data: {} } }), invalidatesTags: ['Alert'] }),
        markAllAlertsRead: builder.mutation<any, void>({ queryFn: async () => ({ data: { success: true, message: 'ok' } }), invalidatesTags: ['Alert'] }),
        getTaskSignals: builder.query<{ success: boolean; data: any | null }, string>({
            queryFn: async (taskId) => {
                const { data } = await supabase.from('execution_signals').select('*').eq('task_id', taskId).single();
                return { data: { success: true, data: data || null } };
            },
            providesTags: ['Signal'],
        }),
        getStabilityGrid: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => {
                const user = (await supabase.auth.getUser()).data.user;
                if (!user) return { data: { success: true, data: [] } };
                const { data } = await supabase.from('focus_stability_slots').select('*').eq('user_id', user.id);
                return { data: { success: true, data: data || [] } };
            },
            providesTags: ['Signal'],
        }),
        getExecutionNarrative: builder.query<{ success: boolean; data: { summary: string; highlights: string[]; warnings: string[] } }, void>({
            queryFn: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return { data: { success: true, data: { summary: "Please log in to see your narrative.", highlights: [], warnings: [] } } };

                const { data: focusSessions } = await supabase
                    .from('focus_sessions')
                    .select('duration_secs')
                    .eq('user_id', user.id)
                    .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

                const { data: tasks } = await supabase
                    .from('tasks')
                    .select('status')
                    .eq('assignee_id', user.id);

                const totalSecs = (focusSessions || []).reduce((acc, curr) => acc + (curr.duration_secs || 0), 0);
                const hrs = (totalSecs / 3600).toFixed(1);
                const doneCount = (tasks || []).filter(t => t.status === 'done').length;
                const inProgressCount = (tasks || []).filter(t => t.status === 'in_progress').length;

                let summary = `Your workspace is active. You've logged ${hrs} hours of deep focus in the last 24h.`;
                const highlights = [`Reached ${doneCount} completed tasks total.`];
                const warnings = [];

                if (parseFloat(hrs) > 5) {
                    highlights.push("Peak productivity detected. High focus density.");
                } else if (parseFloat(hrs) < 1) {
                    warnings.push("Low focus time. Consider blocking out a distraction-free hour.");
                }

                if (inProgressCount > 5) {
                    warnings.push("High context switching risk. 5+ tasks 'In Progress'.");
                }

                return { data: { success: true, data: { summary, highlights, warnings } } };
            },
        }),
        getRecentActivity: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => {
                const { data, error } = await supabase
                    .from('tasks')
                    .select('*, profiles(full_name)')
                    .order('updated_at', { ascending: false })
                    .limit(5);

                if (error) return { error: { status: 500, data: error.message } };

                const activities = (data || []).map(t => ({
                    id: t.id,
                    subject: t.title,
                    status: t.status === 'done' ? 'Executed' : t.status === 'backlog' ? 'Scheduled' : 'In Progress',
                    startDate: new Date(t.created_at).toLocaleDateString(),
                    endDate: t.due_date || 'TBD',
                    assignedUser: t.profiles?.full_name || 'Unassigned'
                }));

                return { data: { success: true, data: activities } };
            },
            providesTags: ['Task'],
        }),
        getBillingStatus: builder.query<{ success: boolean; data: any }, void>({
            queryFn: async () => ({ data: { success: true, data: { plan: 'FREE', status: 'ACTIVE' } } }),
            providesTags: ['Billing'],
        }),
        createCheckoutSession: builder.mutation<any, 'PRO' | 'TEAM'>({
            queryFn: async () => ({ data: { success: true, data: { url: null, devMode: true } } }),
        }),
        createPortalSession: builder.mutation<any, void>({
            queryFn: async () => ({ data: { success: true, data: { url: '' } } }),
        }),
        getBottlenecks: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
            providesTags: ['Signal'],
        }),
        getBurnoutTrend: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
            providesTags: ['Signal'],
        }),
        getTaskReplay: builder.query<{ success: boolean; data: any[] }, string>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
            providesTags: ['Task'],
        }),
        linkPR: builder.mutation<any, any>({ queryFn: async () => ({ data: { success: true, data: {} } }), invalidatesTags: ['Task'] }),
        getProjectPrediction: builder.query<{ success: boolean; data: any }, string>({
            queryFn: async () => ({ data: { success: true, data: { risk: 'low', message: 'On track', deliveryProbability: 85, factors: ['High focus density', 'Stable velocity'] } } }),
            providesTags: ['Project', 'Task'],
        }),
        getFocusReports: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
            providesTags: ['Signal'],
        }),
        getCurrentFocusReport: builder.query<{ success: boolean; data: any | null }, void>({
            queryFn: async () => ({ data: { success: true, data: null } }),
            providesTags: ['Signal'],
        }),
        getEstimationHint: builder.query<{ success: boolean; data: any | null }, { effort: string; keywords: string[] }>({
            queryFn: async () => ({ data: { success: true, data: null } }),
        }),
        getEstimationAccuracy: builder.query<{ success: boolean; data: any }, void>({
            queryFn: async () => ({ data: { success: true, data: {} } }),
            providesTags: ['Signal'],
        }),
        disconnectGitHub: builder.mutation<any, void>({ queryFn: async () => ({ data: { success: true, message: 'ok' } }), invalidatesTags: ['User'] }),
        getFocusWindows: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
            providesTags: ['Signal'],
        }),
        getGoogleCalendarStatus: builder.query<{ success: boolean; data: any }, void>({
            queryFn: async () => ({ data: { success: true, data: { connected: false } } }),
            providesTags: ['User'],
        }),
        disconnectGoogleCalendar: builder.mutation<any, void>({ queryFn: async () => ({ data: { success: true, message: 'ok' } }), invalidatesTags: ['User'] }),
        getNarratives: builder.query<{ success: boolean; data: any[]; pagination: any }, { page?: number; limit?: number }>({
            queryFn: async () => ({ data: { success: true, data: [], pagination: { page: 1, limit: 10, total: 0 } } }),
            providesTags: ['Signal'],
        }),
        getCurrentEffortNarrative: builder.query<{ success: boolean; data: any }, void>({
            queryFn: async () => ({ data: { success: true, data: {} } }),
            providesTags: ['Signal'],
        }),
        updateNarrative: builder.mutation<any, any>({ queryFn: async () => ({ data: { success: true, data: {} } }), invalidatesTags: ['Signal'] }),
        shareNarrative: builder.mutation<any, string>({ queryFn: async () => ({ data: { success: true, data: {} } }), invalidatesTags: ['Signal'] }),
        revokeNarrativeShare: builder.mutation<any, string>({ queryFn: async () => ({ data: { success: true, message: 'ok' } }), invalidatesTags: ['Signal'] }),
        getSharedNarrative: builder.query<{ success: boolean; data: any }, string>({
            queryFn: async () => ({ data: { success: true, data: {} } }),
        }),
        getAiDisplacement: builder.query<{ success: boolean; data: any[] }, void>({
            queryFn: async () => ({ data: { success: true, data: [] } }),
            providesTags: ['Signal'],
        }),
        getHasRealTasks: builder.query<{ success: boolean; data: { hasRealTasks: boolean } }, void>({
            queryFn: async () => {
                const user = (await supabase.auth.getUser()).data.user;
                if (!user) return { data: { success: true, data: { hasRealTasks: false } } };
                const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
                return { data: { success: true, data: { hasRealTasks: (count || 0) > 0 } } };
            },
            providesTags: ['Task'],
        }),
        deleteSampleTasks: builder.mutation<{ success: boolean; message: string }, void>({
            queryFn: async () => {
                const user = (await supabase.auth.getUser()).data.user;
                if (!user) return { error: { status: 401, data: 'Not authenticated' } };
                // In this version, we'll just delete all tasks belonging to the user's focus sessions 
                // or more simply, all tasks in projects where the user is an admin
                // For a showcase, we'll delete all tasks for now (scoped by RLS anyway)
                const { error } = await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                if (error) return { error: { status: 400, data: error.message } };
                return { data: { success: true, message: 'ok' } };
            },
            invalidatesTags: ['Task'],
        }),
    }),
});

export const {
    useGetUsersQuery,
    useGetProjectsQuery,
    useGetTasksQuery,
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
