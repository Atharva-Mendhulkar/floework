import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TaskNode, Phase } from '@/data/mockData';
import { phases as mockPhases } from '@/data/mockData';

interface ProjectState {
    projectId: string | null;
    phases: Phase[];
    selectedTask: TaskNode | null;
    lockedTasks: Record<string, string>; // Maps taskId -> userId of who locked it
}

const initialState: ProjectState = {
    projectId: 'floe-default',
    phases: mockPhases,
    selectedTask: null,
    lockedTasks: {},
};

export const projectSlice = createSlice({
    name: 'project',
    initialState,
    reducers: {
        selectTask: (state, action: PayloadAction<TaskNode | null>) => {
            state.selectedTask = action.payload;
        },
        lockTask: (state, action: PayloadAction<{ taskId: string; lockedBy: string }>) => {
            state.lockedTasks[action.payload.taskId] = action.payload.lockedBy;
        },
        unlockTask: (state, action: PayloadAction<string>) => {
            delete state.lockedTasks[action.payload];
        },
        moveTask: (state, action: PayloadAction<{ taskId: string; fromPhaseId: string; toPhaseId: string }>) => {
            const { taskId, fromPhaseId, toPhaseId } = action.payload;

            const fromPhase = state.phases.find((p) => p.id === fromPhaseId);
            const toPhase = state.phases.find((p) => p.id === toPhaseId);

            if (fromPhase && toPhase) {
                const taskIndex = fromPhase.tasks.findIndex((t) => t.id === taskId);
                if (taskIndex !== -1) {
                    const [task] = fromPhase.tasks.splice(taskIndex, 1);

                    // Update status based on destination phase
                    if (toPhaseId === 'outcome') task.status = 'done';
                    else if (toPhaseId === 'allocation') task.status = 'pending';
                    else task.status = 'in-progress';

                    toPhase.tasks.push(task);
                }
            }
        },
    },
});

export const { selectTask, lockTask, unlockTask, moveTask } = projectSlice.actions;
export default projectSlice.reducer;
