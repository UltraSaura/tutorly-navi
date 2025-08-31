import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import { AdminProvider } from "./context/AdminContext";
import { AuthProvider } from "./context/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Layouts
import MainLayout from "./components/layout/MainLayout";
import AdminLayout from "./components/admin/AdminLayout";

// User Pages
import NotFound from "./pages/NotFound";
import ManagementDashboard from "./pages/ManagementDashboard";
const ChatInterface = lazy(() => import("./components/user/ChatInterface"));
const LearningRoadmap = lazy(() => import("./components/user/LearningRoadmap"));
const GradeDashboard = lazy(() => import("./components/user/GradeDashboard"));
const SkillMastery = lazy(() => import("./components/user/SkillMastery"));
const Index = lazy(() => import("./pages/Index"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const TokensPreview = lazy(() => import("./pages/TokensPreview"));
const GamePreview = lazy(() => import("./pages/GamePreview"));

// Admin Pages
import AIModelManagement from "./components/admin/AIModelManagement";
import SubjectManagement from "./components/admin/SubjectManagement";
import UserManagement from "./components/admin/UserManagement";
import PromptManagement from "./components/admin/PromptManagement";

// Auth Pages  
const AuthPage = lazy(() => import("./pages/AuthPage"));

// Loading Component (no language context needed)
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 relative">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-muted rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
      </div>
      <p className="mt-4 text-lg font-medium">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <AdminProvider>
            <BrowserRouter>
              <AnimatePresence mode="wait">
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {/* Auth Routes */}
                    <Route path="/auth" element={<AuthPage />} />
                    
                    {/* Home Route */}
                    <Route path="/" element={<Index />} />
                    
                    {/* User App Routes */}
                    <Route path="/chat" element={<MainLayout />}>
                      <Route index element={<ChatInterface />} />
                    </Route>
                    <Route path="/dashboard" element={<MainLayout />}>
                      <Route index element={<LearningRoadmap />} />
                    </Route>
                    <Route path="/grades" element={<MainLayout />}>
                      <Route index element={<GradeDashboard />} />
                    </Route>
                    <Route path="/skills" element={<MainLayout />}>
                      <Route index element={<SkillMastery />} />
                    </Route>
                    <Route path="/support" element={<MainLayout />}>
                      <Route index element={<SupportPage />} />
                    </Route>
                    <Route path="/profile" element={<MainLayout />}>
                      <Route index element={<ProfilePage />} />
                    </Route>
                    <Route path="/tokens" element={<MainLayout />}>
                      <Route index element={<TokensPreview />} />
                    </Route>
                    <Route path="/game" element={<MainLayout />}>
                      <Route index element={<GamePreview />} />
                    </Route>
                    
                    {/* Management Dashboard */}
                    <Route path="/management" element={<ManagementDashboard />} />
                    
                    {/* Admin Panel Routes */}
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<AIModelManagement />} />
                      <Route path="models" element={<AIModelManagement />} />
                      <Route path="subjects" element={<SubjectManagement />} />
                      <Route path="users" element={<UserManagement />} />
                      <Route path="prompts" element={<PromptManagement />} />
                    </Route>
                    
                    {/* 404 Route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </AnimatePresence>
            </BrowserRouter>
          </AdminProvider>
        </AuthProvider>
      </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
