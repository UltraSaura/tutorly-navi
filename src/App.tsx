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
import { SimpleLanguageProvider } from "./context/SimpleLanguageContext";

// Layouts
import MainLayout from "./components/layout/MainLayout";
import AdminLayout from "./components/admin/AdminLayout";
import GuardianLayout from "./components/guardian/GuardianLayout";

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
const LearningPage = lazy(() => import("./pages/learning/LearningPage"));
const SubjectDashboardPage = lazy(() => import("./pages/learning/SubjectDashboardPage"));
const CoursePlaylistPage = lazy(() => import("./pages/learning/CoursePlaylistPage"));
const VideoPlayerPage = lazy(() => import("./pages/learning/VideoPlayerPage"));

// Admin Pages
import AIModelManagement from "./components/admin/AIModelManagement";
import SubjectManagement from "./components/admin/SubjectManagement";
import UserManagement from "./components/admin/UserManagement";
import PromptManagement from "./components/admin/PromptManagement";
import ConnectionDiagnostics from "./components/admin/ConnectionDiagnostics";
import LearningContentManagement from "./components/admin/LearningContentManagement";

// Auth Pages  
const AuthPage = lazy(() => import("./pages/AuthPage"));

// Guardian Pages
const GuardianHome = lazy(() => import("./pages/guardian/GuardianHome"));
const GuardianChildren = lazy(() => import("./pages/guardian/GuardianChildren"));
const GuardianResults = lazy(() => import("./pages/guardian/GuardianResults"));
const GuardianExplanations = lazy(() => import("./pages/guardian/GuardianExplanations"));
const GuardianProgress = lazy(() => import("./pages/guardian/GuardianProgress"));
const GuardianBilling = lazy(() => import("./pages/guardian/GuardianBilling"));
const GuardianSettings = lazy(() => import("./pages/guardian/GuardianSettings"));
const ChildDashboard = lazy(() => import("./pages/guardian/ChildDashboard"));
const SubjectDetail = lazy(() => import("./pages/guardian/SubjectDetail"));

// Loading Component
const LoadingFallback = () => <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 relative">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-muted rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
      </div>
      <p className="mt-4 text-lg font-medium">Loading...</p>
    </div>
  </div>;
const queryClient = new QueryClient();

// Simple App Component (no language detection for now)
const App = () => {
  return <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OverlayProvider>
            <AuthProvider>
              <SimpleLanguageProvider>
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
                        <Route path="/learning" element={<MainLayout />}>
                          <Route index element={<LearningPage />} className="mx-0" />
                          <Route path=":subjectSlug" element={<SubjectDashboardPage />} />
                          <Route path=":subjectSlug/:topicSlug" element={<CoursePlaylistPage />} />
                        </Route>
                        <Route path="/learning/video/:videoId" element={<VideoPlayerPage />} />
                        
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
                          <Route path="learning" element={<LearningContentManagement />} />
                        </Route>
                        
          {/* Guardian Portal Routes */}
          <Route path="/guardian" element={<GuardianLayout />}>
            <Route index element={<GuardianHome />} />
            <Route path="children" element={<GuardianChildren />} />
            <Route path="child/:childId" element={<Suspense fallback={<LoadingFallback />}><ChildDashboard /></Suspense>} />
            <Route path="child/:childId/subject/:subjectId" element={<Suspense fallback={<LoadingFallback />}><SubjectDetail /></Suspense>} />
            <Route path="results" element={<Suspense fallback={<LoadingFallback />}><GuardianResults /></Suspense>} />
            <Route path="explanations" element={<Suspense fallback={<LoadingFallback />}><GuardianExplanations /></Suspense>} />
            <Route path="progress" element={<Suspense fallback={<LoadingFallback />}><GuardianProgress /></Suspense>} />
            <Route path="billing" element={<Suspense fallback={<LoadingFallback />}><GuardianBilling /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<LoadingFallback />}><GuardianSettings /></Suspense>} />
          </Route>
                        
                        {/* 404 Route */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </AnimatePresence>
                </BrowserRouter>
              </AdminProvider>
            </SimpleLanguageProvider>
          </AuthProvider>
        </OverlayProvider>
      </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>;
};
export default App;