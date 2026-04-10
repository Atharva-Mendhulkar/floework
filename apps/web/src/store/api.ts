import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { TaskNode, Project, User } from '@/data/mockData';

import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

const baseQuery = fetchBaseQuery({
    baseUrl: 'http://127.0.0.1:5001/api/v1',
    prepareHeaders: (headers) => {
        const token = localStorage.getItem('floe_token');
        if (token) {
            headers.set('authorization', `Bearer ${token}`);
        }
        return headers;
    },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions
) => {
    let result = await baseQuery(args, api, extraOptions);
    if (result.error && result.error.status === 401) {
        localStorage.removeItem('floe_token');
        localStorage.removeItem('floe_user');
        window.location.href = '/login';
    }
    return result;
};

export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['Task', 'Project', 'User'],
    endpoints: (builder) => ({
        getUsers: builder.query<{ success: boolean; data: User[] }, void>({
            query: () => '/users',
            providesTags: ['User'],
        }),
        getProjects: builder.query<{ success: boolean; data: Project[] }, void>({
            query: () => '/projects',
            providesTags: ['Project'],
        }),
        getTasks: builder.query<{ success: boolean; data: TaskNode[] }, string | void>({
            query: (projectId) => projectId ? `/tasks?projectId=${projectId}` : '/tasks',
            providesTags: ['Task'],
        }),
        updateTask: builder.mutation<{ success: boolean; data: TaskNode }, { id: string; status?: string; phase?: string; title?: string; description?: string; dueDate?: string; priority?: string; assigneeId?: string }>({
            query: ({ id, ...patch }) => ({
                url: `/tasks/${id}`,
                method: 'PATCH',
                body: patch,
            }),
            invalidatesTags: ['Task'],
        }),
        createTask: builder.mutation<{ success: boolean; data: TaskNode }, { title: string; description?: string; projectId: string; assigneeId?: string; dueDate?: string; priority?: string }>({
            query: (newTask) => ({
                url: '/tasks',
                method: 'POST',
                body: newTask,
            }),
            invalidatesTags: ['Task'],
        }),
        toggleTaskStar: builder.mutation<{ success: boolean; data: TaskNode }, { id: string; isStarred: boolean }>({
            query: ({ id, isStarred }) => ({
                url: `/tasks/${id}/star`,
                method: 'PATCH',
                body: { isStarred },
            }),
            invalidatesTags: ['Task'],
        }),
        login: builder.mutation<{ success: boolean; data: { token: string; id: string; name: string; email: string; role: string } }, any>({
            query: (credentials) => ({
                url: '/auth/login',
                method: 'POST',
                body: credentials,
            }),
        }),
        register: builder.mutation<{ success: boolean; data: { token: string; id: string; name: string; email: string; role: string } }, any>({
            query: (userData) => ({
                url: '/auth/register',
                method: 'POST',
                body: userData,
            }),
        }),
        forgotPassword: builder.mutation<{ success: boolean; message: string; devResetToken?: string }, { email: string }>({
            query: (body) => ({
                url: '/auth/forgot-password',
                method: 'POST',
                body,
            }),
        }),
        resetPassword: builder.mutation<{ success: boolean; message: string }, { token: string; password: string }>({
            query: ({ token, password }) => ({
                url: `/auth/reset-password/${token}`,
                method: 'POST',
                body: { password },
            }),
        }),
        googleLogin: builder.mutation<{ success: boolean; data: { token: string; id: string; name: string; email: string; role: string; picture?: string } }, { idToken: string }>({
            query: (payload) => ({
                url: '/auth/google',
                method: 'POST',
                body: payload,
            }),
            invalidatesTags: ['User'],
        }),
        setupWorkspace: builder.mutation<{ success: boolean; data?: any; message?: string }, { projectName?: string; sprintName?: string; useSandbox?: boolean }>({
            query: (setupData) => ({
                url: '/auth/setup-workspace',
                method: 'POST',
                body: setupData,
            }),
            invalidatesTags: ['Project', 'Task', 'User'],
        }),

        getMyTeams: builder.query<{ success: boolean; data: any[] }, void>({
            query: () => '/teams',
            providesTags: ['User'],
        }),
        createTeam: builder.mutation<{ success: boolean; data: any }, { name: string; description?: string }>({
            query: (teamData) => ({
                url: '/teams',
                method: 'POST',
                body: teamData,
            }),
            invalidatesTags: ['User'],
        }),
        inviteToTeam: builder.mutation<{ success: boolean; data: any }, { teamId: string; email: string; role?: string }>({
            query: ({ teamId, ...inviteData }) => ({
                url: `/teams/${teamId}/invite`,
                method: 'POST',
                body: inviteData,
            }),
            invalidatesTags: ['User'],
        }),
        joinTeam: builder.mutation<{ success: boolean; data: any }, { token: string }>({
            query: (joinData) => ({
                url: '/teams/join',
                method: 'POST',
                body: joinData,
            }),
            invalidatesTags: ['User', 'Project'],
        }),
        getProjectSprints: builder.query<{ success: boolean; data: any[] }, string>({
            query: (projectId) => `/projects/${projectId}/sprints`,
            providesTags: ['Task'],
        }),
        createSprint: builder.mutation<{ success: boolean; data: any }, { projectId: string; name: string; startDate: string; endDate: string }>({
            query: ({ projectId, ...sprintData }) => ({
                url: `/projects/${projectId}/sprints`,
                method: 'POST',
                body: sprintData,
            }),
            invalidatesTags: ['Task'], // Tasks list updates with new sprint
        }),
        updateSprint: builder.mutation<{ success: boolean; data: any }, { projectId: string; sprintId: string; status: string }>({
            query: ({ projectId, sprintId, status }) => ({
                url: `/projects/${projectId}/sprints/${sprintId}`,
                method: 'PATCH',
                body: { status },
            }),
            invalidatesTags: ['Task'], // Status changes bubble tasks to backlog
        }),
        getFocusSessions: builder.query<{ success: boolean; data: any[] }, void>({
            query: () => '/focus',
            providesTags: ['FocusSession' as any],
        }),
        startFocusSession: builder.mutation<{ success: boolean; data: any }, string>({
            query: (taskId) => ({
                url: '/focus',
                method: 'POST',
                body: { taskId },
            }),
            invalidatesTags: ['FocusSession' as any],
        }),
        stopFocusSession: builder.mutation<{ success: boolean; data: any }, { sessionId: string; aiAssisted?: boolean }>({
            query: ({ sessionId, aiAssisted }) => ({
                url: `/focus/${sessionId}/stop`,
                method: 'PATCH',
                body: { aiAssisted }
            }),
            invalidatesTags: ['FocusSession' as any],
        }),
        getDailyProductivity: builder.query<{ success: boolean; data: any[] }, void>({
            query: () => '/productivity',
            providesTags: ['ProductivityLog' as any],
        }),
        logProductivity: builder.mutation<{ success: boolean; data: any }, { metric: string; value: number }>({
            query: (logData) => ({
                url: '/productivity',
                method: 'POST',
                body: logData,
            }),
            invalidatesTags: ['ProductivityLog' as any],
        }),
        getTeamStatus: builder.query<{ success: boolean; data: any[] }, void>({
            query: () => '/productivity/team-status',
            providesTags: ['User'],
        }),
        getAnalyticsDashboard: builder.query<{ success: boolean; data: { barData: any[], burnoutData: any[] } }, void>({
            query: () => '/productivity/dashboard',
            providesTags: ['ProductivityLog' as any],
        }),
        getMessages: builder.query<{ success: boolean; data: any[] }, string>({
            query: (projectId) => `/projects/${projectId}/messages`,
            providesTags: ['Message' as any],
        }),
        postMessage: builder.mutation<{ success: boolean; data: any }, { projectId: string; content: string }>({
            query: ({ projectId, content }) => ({
                url: `/projects/${projectId}/messages`,
                method: 'POST',
                body: { content },
            }),
            invalidatesTags: ['Message' as any],
        }),
        getProfile: builder.query<{ success: boolean; data: User }, void>({
            query: () => '/users/me',
            providesTags: ['User'],
        }),
        updateProfile: builder.mutation<{ success: boolean; data: User }, Partial<User> & { password?: string }>({
            query: (profileData) => ({
                url: '/users/me',
                method: 'PUT',
                body: profileData,
            }),
            invalidatesTags: ['User'],
        }),
        getAlerts: builder.query<{ success: boolean; data: any[] }, void>({
            query: () => '/alerts',
            providesTags: ['Alert' as any],
        }),
        markAlertRead: builder.mutation<{ success: boolean; data: any }, string>({
            query: (id) => ({
                url: `/alerts/${id}/read`,
                method: 'PATCH',
            }),
            invalidatesTags: ['Alert' as any],
        }),
        markAllAlertsRead: builder.mutation<{ success: boolean; message: string }, void>({
            query: () => ({
                url: '/alerts/read-all',
                method: 'POST',
            }),
            invalidatesTags: ['Alert' as any],
        }),
        getTaskSignals: builder.query<{ success: boolean; data: any | null }, string>({
            query: (taskId) => `/analytics/task/${taskId}/signals`,
            providesTags: ['Signal' as any],
        }),
        getStabilityGrid: builder.query<{ success: boolean; data: any[] }, void>({
            query: () => '/analytics/stability',
            providesTags: ['Signal' as any],
        }),
        getExecutionNarrative: builder.query<{ success: boolean; data: { summary: string; highlights: string[]; warnings: string[] } }, void>({
            query: () => '/analytics/narrative',
            providesTags: ['Signal' as any],
        }),
        getBillingStatus: builder.query<{ success: boolean; data: any }, void>({
            query: () => '/billing/status',
            providesTags: ['Billing' as any],
        }),
        createCheckoutSession: builder.mutation<{ success: boolean; data: { url: string | null; devMode?: boolean; plan?: string } }, 'PRO' | 'TEAM'>({
            query: (plan) => ({
                url: '/billing/checkout',
                method: 'POST',
                body: { plan },
            }),
            invalidatesTags: ['Billing' as any],
        }),
        createPortalSession: builder.mutation<{ success: boolean; data: { url: string } }, void>({
            query: () => ({
                url: '/billing/portal',
                method: 'POST',
            }),
        }),
        getBottlenecks: builder.query<{ success: boolean; data: any[] }, void>({
            query: () => '/analytics/bottlenecks',
            providesTags: ['Signal' as any],
        }),
        getBurnoutTrend: builder.query<{ success: boolean; data: any[] }, void>({
            query: () => '/analytics/burnout',
            providesTags: ['Signal' as any],
        }),
        getTaskReplay: builder.query<{ success: boolean; data: any[] }, string>({
            query: (taskId) => `/tasks/${taskId}/replay`,
            providesTags: ['Task'],
        }),
        linkPR: builder.mutation<{ success: boolean; data: any }, { id: string; prUrl: string }>({
            query: ({ id, prUrl }) => ({
                url: `/tasks/${id}/pr`,
                method: 'POST',
                body: { prUrl }
            }),
            invalidatesTags: ['Task'],
        }),
        getProjectPrediction: builder.query<{ success: boolean; data: any }, string>({
            query: (projectId) => `/projects/${projectId}/prediction`,
            providesTags: ['Project', 'Task'],
        }),
        getFocusReports: builder.query<{ success: boolean; data: any[] }, void>({
            query: () => '/analytics/focus-report',
            providesTags: ['Signal' as any],
        }),
        getCurrentFocusReport: builder.query<{ success: boolean; data: any | null }, void>({
            query: () => '/analytics/focus-report/current',
            providesTags: ['Signal' as any],
        }),
        getEstimationHint: builder.query<{ success: boolean; data: any | null }, { effort: string; keywords: string[] }>({
            query: ({ effort, keywords }) => `/analytics/estimation-hint?effort=${effort}&keywords=${keywords.join(',')}`,
        }),
        getEstimationAccuracy: builder.query<{ success: boolean; data: any }, void>({
            query: () => '/analytics/estimation-accuracy',
            providesTags: ['Signal' as any],
        }),
        disconnectGitHub: builder.mutation<{ success: boolean; message: string }, void>({
            query: () => ({ url: '/auth/github', method: 'DELETE' }),
            invalidatesTags: ['User'],
        }),
        getFocusWindows: builder.query<{ success: boolean; data: any[] }, void>({
            query: () => '/analytics/focus-windows',
            providesTags: ['Signal' as any],
        }),
        getGoogleCalendarStatus: builder.query<{ success: boolean; data: any }, void>({
            query: () => '/auth/google-calendar/status',
            providesTags: ['User'],
        }),
        disconnectGoogleCalendar: builder.mutation<{ success: boolean; message: string }, void>({
            query: () => ({ url: '/auth/google-calendar', method: 'DELETE' }),
            invalidatesTags: ['User'],
        }),
        getNarratives: builder.query<{ success: boolean; data: any[]; pagination: any }, { page?: number; limit?: number }>({
            query: ({ page = 1, limit = 10 }) => `/narrative?page=${page}&limit=${limit}`,
            providesTags: ['Signal' as any],
        }),
        getCurrentEffortNarrative: builder.query<{ success: boolean; data: any }, void>({
            query: () => '/narrative/current',
            providesTags: ['Signal' as any],
        }),
        updateNarrative: builder.mutation<{ success: boolean; data: any }, { id: string; body: string }>({
            query: ({ id, body }) => ({
                url: `/narrative/${id}`,
                method: 'PATCH',
                body: { body },
            }),
            invalidatesTags: ['Signal' as any],
        }),
        shareNarrative: builder.mutation<{ success: boolean; data: { shareUrl: string; shareToken: string; shareExpiry: Date } }, string>({
            query: (id) => ({
                url: `/narrative/${id}/share`,
                method: 'POST',
            }),
            invalidatesTags: ['Signal' as any],
        }),
        revokeNarrativeShare: builder.mutation<{ success: boolean; message: string }, string>({
            query: (id) => ({
                url: `/narrative/${id}/share`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Signal' as any],
        }),
        getSharedNarrative: builder.query<{ success: boolean; data: any }, string>({
            query: (token) => `/narrative/shared/${token}`,
        }),
        getAiDisplacement: builder.query<{ success: boolean; data: any[] }, void>({
            query: () => '/analytics/ai-displacement',
            providesTags: ['Signal' as any],
        }),
        getHasRealTasks: builder.query<{ success: boolean; data: { hasRealTasks: boolean } }, void>({
            query: () => '/users/me/has-real-tasks',
            providesTags: ['Task' as any],
        }),
        deleteSampleTasks: builder.mutation<{ success: boolean; message: string }, void>({
            query: () => ({
                url: '/tasks/samples',
                method: 'DELETE',
            }),
            invalidatesTags: ['Task' as any],
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
    useGetProjectSprintsQuery,
    useCreateSprintMutation,
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
} = api;
