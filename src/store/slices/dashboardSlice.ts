import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TaskNode, ActivityEntry } from '@/data/mockData';

interface DashboardState {
    searchQuery: string;
    isSidebarOpen: boolean;
    activeTaskId: string | null;
}

const initialState: DashboardState = {
    searchQuery: '',
    isSidebarOpen: true,
    activeTaskId: null,
};

export const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.searchQuery = action.payload;
        },
        toggleSidebar: (state) => {
            state.isSidebarOpen = !state.isSidebarOpen;
        },
        setActiveTask: (state, action: PayloadAction<string | null>) => {
            state.activeTaskId = action.payload;
        },
    },
});

export const { setSearchQuery, toggleSidebar, setActiveTask } = dashboardSlice.actions;
export default dashboardSlice.reducer;
