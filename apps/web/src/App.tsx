import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "./store";
import { AuthProvider } from "./modules/auth/AuthContext";
import { ProtectedRoute } from "./modules/auth/ProtectedRoute";
import { LoginPage } from "./modules/auth/views/LoginPage";
import { RegisterPage } from "./modules/auth/views/RegisterPage";
import { ForgotPasswordPage } from "./modules/auth/views/ForgotPasswordPage";
import { ResetPasswordPage } from "./modules/auth/views/ResetPasswordPage";
import { SocketProvider } from "./modules/socket/SocketContext";
import { lazy, Suspense } from "react";
import { PageSkeleton } from "./components/PageSkeleton";
import ScrollToTop from "./components/ScrollToTop";
import { ErrorBoundary } from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { Analytics } from "@vercel/analytics/react";

const queryClient = new QueryClient();

// Public Pages (Lazy)
const LandingPage = lazy(() => import("./pages/LandingPage"));
const PhilosophyPage = lazy(() => import("./pages/PhilosophyPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const DesignPage = lazy(() => import("./pages/DesignPage"));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Protected Pages (Eagerly loaded for instant 0ms tab transitions)
import Index from "./pages/Index";
import BoardsPage from "./pages/BoardsPage";
import FocusPage from "./pages/FocusPage";
import NarrativePage from "@/pages/NarrativePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import StarredPage from "./pages/StarredPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import AlertsPage from "./pages/AlertsPage";
import BillingPage from "./pages/BillingPage";
import WorkspaceSettingsPage from "./pages/WorkspaceSettingsPage";

// Other Protected/Shared Pages (Lazy)
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const SharedNarrativePage = lazy(() => import("@/pages/SharedNarrativePage"));

const App = () => (
  <ErrorBoundary>
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Analytics />
              <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<PageSkeleton />}>
                  <Routes>
                    {/* Public landing page */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/philosophy" element={<PhilosophyPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/design" element={<DesignPage />} />
                    <Route path="/features" element={<FeaturesPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/narrative/shared/:token" element={<SharedNarrativePage />} />

                    {/* Auth */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                      {/* Onboarding Flow */}
                      <Route path="/onboarding" element={<OnboardingPage />} />

                      {/* Persistent Dashboard Layout — zero unmount delay, instant page transitions */}
                      <Route element={<DashboardLayout />}>
                        <Route path="/dashboard" element={<Index />} />
                        <Route path="/boards" element={<BoardsPage />} />
                        <Route path="/focus" element={<FocusPage />} />
                        <Route path="/narrative" element={<NarrativePage />} />
                        <Route path="/analytics" element={<AnalyticsPage />} />
                        <Route path="/starred" element={<StarredPage />} />
                        <Route path="/messages" element={<MessagesPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/alerts" element={<AlertsPage />} />
                        <Route path="/billing" element={<BillingPage />} />
                        <Route path="/workspace/settings" element={<WorkspaceSettingsPage />} />
                      </Route>
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ReduxProvider>
  </ErrorBoundary>
);

export default App;
