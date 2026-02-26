import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "./store";
import { AuthProvider } from "./modules/auth/AuthContext";
import { ProtectedRoute } from "./modules/auth/ProtectedRoute";
import { LoginPage } from "./modules/auth/views/LoginPage";
import { RegisterPage } from "./modules/auth/views/RegisterPage";
import { SocketProvider } from "./modules/socket/SocketContext";
import Index from "./pages/Index";
import FocusPage from "./pages/FocusPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import OnboardingPage from "./pages/OnboardingPage";
import LandingPage from "./pages/LandingPage";
import StarredPage from "./pages/StarredPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import AlertsPage from "./pages/AlertsPage";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ReduxProvider store={store}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public landing page */}
                <Route path="/" element={<LandingPage />} />

                {/* Auth */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  {/* Onboarding Flow */}
                  <Route path="/onboarding" element={<OnboardingPage />} />

                  <Route path="/dashboard" element={<Index />} />
                  <Route path="/focus" element={<DashboardLayout><FocusPage /></DashboardLayout>} />
                  <Route path="/analytics" element={<DashboardLayout><AnalyticsPage /></DashboardLayout>} />
                  <Route path="/starred" element={<DashboardLayout><StarredPage /></DashboardLayout>} />
                  <Route path="/messages" element={<DashboardLayout><MessagesPage /></DashboardLayout>} />
                  <Route path="/profile" element={<DashboardLayout><ProfilePage /></DashboardLayout>} />
                  <Route path="/alerts" element={<DashboardLayout><AlertsPage /></DashboardLayout>} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ReduxProvider>
);

export default App;
