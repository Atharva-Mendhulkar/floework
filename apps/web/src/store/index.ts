import { configureStore, combineReducers, Action, AnyAction } from '@reduxjs/toolkit';
import dashboardReducer from './slices/dashboardSlice';
import projectReducer from './slices/projectSlice';
import { api } from './api';

const appReducer = combineReducers({
    dashboard: dashboardReducer,
    project: projectReducer,
    [api.reducerPath]: api.reducer,
});

const rootReducer = (state: ReturnType<typeof appReducer> | undefined, action: AnyAction) => {
    // When a logout action is dispatched, reset the entire state
    if (action.type === 'auth/logout') {
        state = undefined;
    }
    return appReducer(state, action);
};

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Helper to fully clear state including API cache
export const resetStore = () => {
    store.dispatch({ type: 'auth/logout' });
    store.dispatch(api.util.resetApiState());
};
