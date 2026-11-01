import { FamilyProfileProvider } from './context/FamilyProfileContext';
import { FamilyRouteBoundary } from './features/family/FamilyRouteBoundary';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import { HelmetProvider } from "react-helmet-async";
import { AdminProvider } from "./context/AdminContext";
import { AuthProvider } from "./context/AuthContext";
import { OverlayProvider } from "./context/OverlayContext";
import { AdminPreviewProvider } from "./contexts/AdminPreviewContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SimpleLanguageProvider } from "./context/SimpleLanguageContext";

// Layouts
import MainLayout from "./components/layout/MainLayout";
import AdminLayout from "./components/admin/AdminLayout";
import GuardianLayout from "./components/guardian/GuardianLayout";
import TeacherLayout from "./components/teacher/TeacherLayout";

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
const DnbSvgPreview = lazy(() => import("./pages/DnbSvgPreview"));
const ExerciseHistoryPage = lazy(() => import("./pages/ExerciseHistoryPage"));
const GeneralChatPage = lazy(() => import("./pages/GeneralChatPage"));
const LearningPage = lazy(() => import("./pages/learning/LearningPage"));
const SubjectDashboardPage = lazy(() => import("./pages/learning/SubjectDashboardPage"));
const CoursePlaylistPage = lazy(() => import("./pages/learning/CoursePlaylistPage"));
const LessonPage = lazy(() => import("./pages/learning/LessonPage"));
const VideoPlayerPage = lazy(() => import("./pages/learning/VideoPlayerPage"));
const MyProgramPage = lazy(() => import("./pages/learning/MyProgramPage"));
const PracticePage = lazy(() => import("./pages/practice/PracticePage"));
const GraduatedNumberLinePage = lazy(() => import("./pages/practice/GraduatedNumberLinePage"));
const ExamSessionPage = lazy(() => import("./pages/practice/ExamSessionPage"));
const TrainingSessionPage = lazy(() => import("./pages/practice/TrainingSessionPage"));
const PracticeSubjectPage = lazy(() => import("./pages/practice/PracticeSubjectPage"));
const LessonThemePage = lazy(() => import("./pages/practice/LessonThemePage"));
const PracticeAnnalsPage = lazy(() => import("./pages/practice/PracticeAnnalsPage"));
const PracticeTopicsPage = lazy(() => import("./pages/practice/PracticeTopicsPage"));
const CurriculumBrowser = lazy(() => import("./components/curriculum/CurriculumBrowser"));
const CurriculumDebug = lazy(() => import("./pages/CurriculumDebug"));

// Admin Pages
import AIModelManagement from "./components/admin/AIModelManagement";
import SubjectManagement from "./components/admin/SubjectManagement";
import UserManagement from "./components/admin/UserManagement";
import PromptManagement from "./components/admin/PromptManagement";
import ConnectionDiagnostics from "./components/admin/ConnectionDiagnostics";
import LearningContentManagement from "./components/admin/LearningContentManagement";
import CurriculumManager from "./components/admin/CurriculumManager";
import GeneratedLessonsPage from "./components/admin/learning/GeneratedLessonsPage";
import StagingLessonWorkflowPage, { StagingLessonDraftPreviewPage } from "./pages/admin/StagingLessonWorkflowPage";
import SolidVisualGalleryPage from "./pages/admin/SolidVisualGalleryPage";
import AdminSettings from "./components/admin/AdminSettings";
const RecentUpdates = lazy(() => import("./pages/admin/RecentUpdates"));
const ExamAnnales = lazy(() => import("./pages/admin/ExamAnnales"));

const FamilyPage = lazy(() => import("./pages/FamilyPage"));

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
const ChildDetailPage = lazy(() => import("./pages/guardian/ChildDetailPage"));

// Teacher Pages
const TeacherHome = lazy(() => import("./pages/teacher/TeacherHome"));
const TeacherClasses = lazy(() => import("./pages/teacher/TeacherClasses"));
const ClassDetailPage = lazy(() => import("./pages/teacher/ClassDetailPage"));
const TeacherStudentDetail = lazy(() => import("./pages/teacher/TeacherStudentDetail"));
const TeacherTopicDetail = lazy(() => import("./pages/teacher/TeacherTopicDetail"));

const isDev = import.meta.env.DEV;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const isLocalSupabase = /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:|\/|$)/i.test(supabaseUrl);
const isStagingSupabase = supabaseUrl === 'https://sibprjxhbxahouejygeu.supabase.co';

const EnvironmentIndicator = () => (isLocalSupabase || isStagingSupabase) ? (
  <div
    data-testid={isLocalSupabase ? 'local-environment-indicator' : 'staging-environment-indicator'}
    className="fixed right-3 top-3 z-[10000] rounded-full border border-amber-700 bg-amber-300 px-3 py-1 text-xs font-bold tracking-wide text-amber-950 shadow-lg"
  >
    {isLocalSupabase ? 'LOCAL · Supabase isolé' : 'STAGING · Supabase'}
  </div>
) : null;

// Loading Component
const LoadingFallback = () => {
  const ui = useInterfaceTranslation();
  return (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 relative">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-muted rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
      </div>
      <p className="mt-4 text-lg font-medium text-foreground">{ui("Loading...")}</p>
    </div>
  </div>
);
};

// Route-level error fallback
const RouteErrorFallback = ({ section }: { section: string }) => {
  const ui = useInterfaceTranslation();
  return (
  <div className="flex items-center justify-center min-h-screen bg-background p-6">
    <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-6 text-center space-y-4">
      <div className="w-12 h-12 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
        <span className="text-destructive text-xl">!</span>
      </div>
      <h2 className="text-xl font-semibold">{ui("Unable to load")} {section}</h2>
      <p className="text-muted-foreground text-sm">
        {ui("Something went wrong loading this section. Please try again.")}
      </p>
      <div className="flex gap-3 justify-center pt-2">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          {ui("Refresh Page")}
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 border rounded-md hover:bg-muted"
        >
          {ui("Go Home")}
        </button>
      </div>
    </div>
  </div>
);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Simple App Component (no language detection for now)
const App = () => {
  const ui = useInterfaceTranslation();
  return <QueryClientProvider client={queryClient}>
      <HelmetProvider>
      <ErrorBoundary>
        <TooltipProvider>
          <EnvironmentIndicator />
          <Toaster />
          <Sonner />
          <OverlayProvider>
            <AuthProvider>
            <FamilyProfileProvider>
              <AdminPreviewProvider>
                <SimpleLanguageProvider>
                  <AdminProvider>
                    <BrowserRouter>
                    <FamilyRouteBoundary><AnimatePresence mode="wait">
                      <Suspense fallback={<LoadingFallback />}>
                      <Routes>
                        <Route path="/family" element={<FamilyPage />} />
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
                        {isDev && (
                          <Route path="/tokens" element={<MainLayout />}>
                            <Route index element={<TokensPreview />} />
                          </Route>
                        )}
                        {isDev && (
                          <Route path="/game" element={<MainLayout />}>
                            <Route index element={<GamePreview />} />
                          </Route>
                        )}
                        {isDev && (
                          <Route path="/dnb-preview" element={<MainLayout />}>
                            <Route index element={<DnbSvgPreview />} />
                          </Route>
                        )}
                        <Route path="/exercise-history" element={<MainLayout />}>
                          <Route index element={<ExerciseHistoryPage />} />
                        </Route>
                        <Route path="/learning" element={<MainLayout />}>
                          <Route index element={<LearningPage />} />
                          <Route path=":subjectSlug/theme/:themeId" element={<LessonThemePage />} />
                          <Route path=":subjectSlug" element={<SubjectDashboardPage />} />
                          <Route path=":subjectSlug/:topicSlug" element={<LessonPage />} />
                        </Route>
                        <Route path="/learning/video/:videoId" element={<VideoPlayerPage />} />
                        <Route path="/practice" element={<MainLayout />}>
                          <Route index element={<PracticePage />} />
                          <Route path="number-line" element={<GraduatedNumberLinePage />} />
                          <Route path="session" element={<TrainingSessionPage />} />
                          <Route path="exam/:paperId" element={<ExamSessionPage />} />
                          <Route path=":subject/annales" element={<PracticeAnnalsPage />} />
                          <Route path=":subject/theme/:themeId" element={<LessonThemePage />} />
                          <Route path=":subject/topics" element={<PracticeTopicsPage />} />
                          <Route path=":subject" element={<PracticeSubjectPage />} />
                        </Route>
                <Route path="/my-program" element={<MainLayout />}>
                  <Route index element={<MyProgramPage />} />
                </Route>
                <Route path="/curriculum" element={<MainLayout />}>
                  <Route index element={<CurriculumBrowser />} />
                </Route>
                        
                        {/* Management Dashboard (dev-only until a proper admin guard is added) */}
                        {isDev && (
                          <Route path="/management" element={<ManagementDashboard />} />
                        )}
                        {isDev && (
                          <Route path="/dev/solid-gallery" element={<SolidVisualGalleryPage />} />
                        )}
                        
                        {/* Admin Panel Routes */}
                        <Route path="/admin" element={
                          <ErrorBoundary fallback={isDev ? undefined : <RouteErrorFallback section="Admin Panel" />}>
                            <AdminLayout />
                          </ErrorBoundary>
                        }>
                          <Route index element={<AIModelManagement />} />
                          <Route path="models" element={<AIModelManagement />} />
                          <Route path="diagnostics" element={<ConnectionDiagnostics />} />
                          <Route path="subjects" element={<SubjectManagement />} />
                          <Route path="users" element={<UserManagement />} />
                          <Route path="prompts" element={<PromptManagement />} />
                          <Route path="learning" element={<LearningContentManagement />} />
                          <Route path="curriculum" element={<CurriculumManager />} />
                          <Route path="generated-lessons" element={<GeneratedLessonsPage />} />
                          <Route path="staging-lessons" element={<StagingLessonWorkflowPage />} />
                          <Route path="staging-lessons/preview/:versionId" element={<StagingLessonDraftPreviewPage />} />
                          <Route path="exams" element={<ExamAnnales />} />
                          <Route path="recent-updates" element={<RecentUpdates />} />
                          <Route path="settings" element={<AdminSettings />} />
                        </Route>
                        
          {/* Guardian Portal Routes */}
          <Route path="/guardian" element={
            <ErrorBoundary fallback={<RouteErrorFallback section="Guardian Portal" />}>
              <GuardianLayout />
            </ErrorBoundary>
          }>
            <Route index element={<GuardianHome />} />
            <Route path="children" element={<GuardianChildren />} />
            <Route path="child/:childId" element={<Suspense fallback={<LoadingFallback />}><ChildDashboard /></Suspense>} />
            <Route path="child/:childId/subject/:subjectId" element={<Suspense fallback={<LoadingFallback />}><SubjectDetail /></Suspense>} />
            <Route path="child/:childId/detail" element={<Suspense fallback={<LoadingFallback />}><ChildDetailPage /></Suspense>} />
            <Route path="results" element={<Suspense fallback={<LoadingFallback />}><GuardianResults /></Suspense>} />
            <Route path="explanations" element={<Suspense fallback={<LoadingFallback />}><GuardianExplanations /></Suspense>} />
            <Route path="progress" element={<Suspense fallback={<LoadingFallback />}><GuardianProgress /></Suspense>} />
            <Route path="billing" element={<Suspense fallback={<LoadingFallback />}><GuardianBilling /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<LoadingFallback />}><GuardianSettings /></Suspense>} />
          </Route>

          {/* Teacher Portal Routes */}
          <Route path="/teacher" element={
            <ErrorBoundary fallback={<RouteErrorFallback section="Teacher Portal" />}>
              <TeacherLayout />
            </ErrorBoundary>
          }>
            <Route index element={<TeacherHome />} />
            <Route path="classes" element={<TeacherClasses />} />
            <Route path="classes/:classId" element={<ClassDetailPage />} />
            <Route path="students/:studentId" element={<TeacherStudentDetail />} />
            <Route path="topics/:topicId" element={<TeacherTopicDetail />} />
            <Route path="resources" element={<div className="p-8">{ui("Resources (Coming Soon)")}</div>} />
            <Route path="analytics" element={<div className="p-8">{ui("Analytics (Coming Soon)")}</div>} />
            <Route path="settings" element={<div className="p-8">{ui("Settings (Coming Soon)")}</div>} />
          </Route>
                        
                        {/* Curriculum Debug */}
                        {isDev && (
                          <Route path="/curriculum-debug" element={<CurriculumDebug />} />
                        )}
                        
                        {/* 404 Route */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </AnimatePresence></FamilyRouteBoundary>
                    </BrowserRouter>
                  </AdminProvider>
                </SimpleLanguageProvider>
              </AdminPreviewProvider>
            </FamilyProfileProvider>
            </AuthProvider>
        </OverlayProvider>
      </TooltipProvider>
    </ErrorBoundary>
    </HelmetProvider>
  </QueryClientProvider>;
};
export default App;
