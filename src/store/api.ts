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
        googleLogin: builder.mutation<{ success: boolean; data: { token: string; id: string; name: string; email: string; role: string; picture?: string } }, { idToken: string }>({
            query: (payload) => ({
                url: '/auth/google',
                method: 'POST',
                body: payload,
            }),
            invalidatesTags: ['User'],
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
        stopFocusSession: builder.mutation<{ success: boolean; data: any }, string>({
            query: (sessionId) => ({
                url: `/focus/${sessionId}/stop`,
                method: 'PATCH',
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
    useGoogleLoginMutation,
    useGetMyTeamsQuery,
    useCreateTeamMutation,
    useInviteToTeamMutation,
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
} = api;
