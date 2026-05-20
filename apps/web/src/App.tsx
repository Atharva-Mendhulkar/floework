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
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Protected Pages (Lazy)
const Index = lazy(() => import("./pages/Index"));
const BoardsPage = lazy(() => import("./pages/BoardsPage"));
const FocusPage = lazy(() => import("./pages/FocusPage"));
const NarrativePage = lazy(() => import("@/pages/NarrativePage"));
const SharedNarrativePage = lazy(() => import("@/pages/SharedNarrativePage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const StarredPage = lazy(() => import("./pages/StarredPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const WorkspaceSettingsPage = lazy(() => import("./pages/WorkspaceSettingsPage"));

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

                      <Route path="/dashboard" element={<Index />} />
                      <Route path="/boards" element={<BoardsPage />} />
                      <Route path="/focus" element={<DashboardLayout><FocusPage /></DashboardLayout>} />
                      <Route path="/narrative" element={<DashboardLayout><NarrativePage /></DashboardLayout>} />
                      <Route path="/analytics" element={<DashboardLayout><AnalyticsPage /></DashboardLayout>} />
                      <Route path="/starred" element={<DashboardLayout><StarredPage /></DashboardLayout>} />
                      <Route path="/messages" element={<DashboardLayout><MessagesPage /></DashboardLayout>} />
                      <Route path="/profile" element={<DashboardLayout><ProfilePage /></DashboardLayout>} />
                      <Route path="/alerts" element={<DashboardLayout><AlertsPage /></DashboardLayout>} />
                      <Route path="/billing" element={<DashboardLayout><BillingPage /></DashboardLayout>} />
                      <Route path="/workspace/settings" element={<DashboardLayout><WorkspaceSettingsPage /></DashboardLayout>} />
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
