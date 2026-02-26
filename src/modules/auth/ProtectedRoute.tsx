import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export const ProtectedRoute = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div className="h-screen flex items-center justify-center text-text-muted">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
