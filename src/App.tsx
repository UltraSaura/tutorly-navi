import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import { AdminProvider } from "./context/AdminContext";
import { AuthProvider } from "./context/AuthContext";
import { OverlayProvider } from "./context/OverlayContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LanguageProvider } from "./context/LanguageProvider";

// Layouts
import MainLayout from "./components/layout/MainLayout";
import AdminLayout from "./components/admin/AdminLayout";

// User Pages
import NotFound from "./pages/NotFound";
import ManagementDashboard from "./pages/ManagementDashboard";
const ChatInterface = lazy(() => import("./components/user/ChatInterface"));
const UnifiedDashboard = lazy(() => import("./components/user/UnifiedDashboard"));
const Index = lazy(() => import("./pages/Index"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const TokensPreview = lazy(() => import("./pages/TokensPreview"));
const GamePreview = lazy(() => import("./pages/GamePreview"));
const ExerciseHistoryPage = lazy(() => import("./pages/ExerciseHistoryPage"));
const GeneralChatPage = lazy(() => import("./pages/GeneralChatPage"));

// Admin Pages
import AIModelManagement from "./components/admin/AIModelManagement";
import SubjectManagement from "./components/admin/SubjectManagement";
import UserManagement from "./components/admin/UserManagement";
import PromptManagement from "./components/admin/PromptManagement";
import ConnectionDiagnostics from "./components/admin/ConnectionDiagnostics";

// Auth Pages  
const AuthPage = lazy(() => import("./pages/AuthPage"));

// Loading Component
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

// Simple App Component (no language detection for now)
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OverlayProvider>
            <LanguageProvider>
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
                        <Route path="/general-chat" element={<GeneralChatPage />} />
                        <Route path="/dashboard" element={<MainLayout />}>
                          <Route index element={<UnifiedDashboard />} />
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
                        <Route path="/exercise-history" element={<MainLayout />}>
                          <Route index element={<ExerciseHistoryPage />} />
                        </Route>
                        
                        {/* Management Dashboard */}
                        <Route path="/management" element={<ManagementDashboard />} />
                        
                        {/* Admin Panel Routes */}
                        <Route path="/admin" element={<AdminLayout />}>
                          <Route index element={<AIModelManagement />} />
                          <Route path="models" element={<AIModelManagement />} />
                          <Route path="diagnostics" element={<ConnectionDiagnostics />} />
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
          </LanguageProvider>
        </OverlayProvider>
      </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);
};

export default App;
