

## Goal
Install `react-helmet-async`, wrap the app with `<HelmetProvider>`, and give every top-level page a unique `<title>` and `<meta name="description">` so SEO/sharing works per-route instead of relying on the static `index.html` fallback.

## Setup

### 1. Install dependency
- `react-helmet-async` (the maintained fork; works with React 18 + Suspense, unlike `react-helmet`).

### 2. Wrap app root
In `src/App.tsx`, wrap the existing provider tree with `<HelmetProvider>` (outermost or just inside `QueryClientProvider` — placement doesn't matter as long as it's above `<Routes>`):
```tsx
import { HelmetProvider } from 'react-helmet-async';
// ...
<HelmetProvider>
  <ErrorBoundary>... existing tree ...</ErrorBoundary>
</HelmetProvider>
```

### 3. Reusable helper (optional but tidy)
Create `src/components/seo/PageMeta.tsx`:
```tsx
import { Helmet } from 'react-helmet-async';
export const PageMeta = ({ title, description }: { title: string; description: string }) => (
  <Helmet>
    <title>{`${title} — Stuwy`}</title>
    <meta name="description" content={description} />
  </Helmet>
);
```
Each page renders `<PageMeta title="..." description="..." />` at the top of its return — keeps the per-page change to one line.

## Pages to tag

Title pattern: `"<Page Name> — Stuwy"`. Descriptions are unique, ~120–155 chars, written for search snippets.

### Public / auth
| File | Title | Description |
|---|---|---|
| `src/pages/Index.tsx` | `Home` | Stuwy is an AI-powered tutoring platform that helps students master math and guardians track learning progress. |
| `src/pages/AuthPage.tsx` | `Sign In` | Sign in or create an account to access your Stuwy student, guardian, or teacher dashboard. |
| `src/pages/NotFound.tsx` | `Page Not Found` | The page you're looking for doesn't exist. Return to your Stuwy dashboard. |

### Student app
| File | Title | Description |
|---|---|---|
| `src/pages/StudentDashboard.tsx` | `Dashboard` | Your learning dashboard — track progress, resume lessons, and continue your math journey on Stuwy. |
| `src/components/user/ChatInterface.tsx` | `Tutor Chat` | Get instant AI-powered help with math homework, exercises, and explanations from your Stuwy tutor. |
| `src/pages/GeneralChatPage.tsx` | `Ask Stuwy` | Chat with Stuwy's AI tutor about any math topic, anytime. |
| `src/pages/ProfilePage.tsx` | `Profile` | Manage your Stuwy profile, preferences, and account details. |
| `src/pages/SupportPage.tsx` | `Support` | Get help with Stuwy — find answers, contact support, and learn how to use the platform. |
| `src/pages/ExerciseHistoryPage.tsx` | `Exercise History` | Review your past exercises, attempts, and AI explanations on Stuwy. |
| `src/pages/learning/LearningPage.tsx` | `Learning Library` | Browse subjects, topics, and video lessons in your Stuwy learning library. |
| `src/pages/learning/SubjectDashboardPage.tsx` | `Subject` | Explore topics, videos, and exercises for this subject on Stuwy. |
| `src/pages/learning/CoursePlaylistPage.tsx` | `Course` | Follow the lesson playlist with videos, quizzes, and AI guidance. |
| `src/pages/learning/VideoPlayerPage.tsx` | `Video Lesson` | Watch a Stuwy video lesson with interactive quizzes and transcripts. |
| `src/pages/learning/MyProgramPage.tsx` | `My Program` | Your personalized Stuwy learning program based on your level and goals. |
| `src/components/curriculum/CurriculumBrowser.tsx` | `Curriculum` | Browse the official curriculum mapped to Stuwy lessons and exercises. |

### Guardian portal
| File | Title | Description |
|---|---|---|
| `src/pages/guardian/GuardianHome.tsx` | `Guardian Home` | Monitor your children's learning progress and recent activity at a glance. |
| `src/pages/guardian/GuardianChildren.tsx` | `Children` | Add and manage your children's Stuwy profiles and learning settings. |
| `src/pages/guardian/GuardianResults.tsx` | `Results` | Review detailed exercise results and quiz performance for your children. |
| `src/pages/guardian/GuardianExplanations.tsx` | `Explanations` | See AI-generated explanations for the exercises your children attempted. |
| `src/pages/guardian/GuardianProgress.tsx` | `Progress` | Track long-term learning progress and topic mastery for each child. |
| `src/pages/guardian/GuardianBilling.tsx` | `Billing` | Manage your Stuwy subscription, payment method, and billing history. |
| `src/pages/guardian/GuardianSettings.tsx` | `Settings` | Configure your guardian account preferences and notifications. |
| `src/pages/guardian/ChildDashboard.tsx` | `Child Dashboard` | Detailed learning view for an individual child on Stuwy. |
| `src/pages/guardian/ChildDetailPage.tsx` | `Child Details` | Full profile, curriculum, and activity for your child. |
| `src/pages/guardian/SubjectDetail.tsx` | `Subject Detail` | Per-subject breakdown of your child's progress and attempts. |

### Teacher portal
| File | Title | Description |
|---|---|---|
| `src/pages/teacher/TeacherHome.tsx` | `Teacher Home` | Your teacher dashboard — classes, students, and recent activity at a glance. |
| `src/pages/teacher/TeacherClasses.tsx` | `Classes` | Manage your classes and enrolled students on Stuwy. |
| `src/pages/teacher/ClassDetailPage.tsx` | `Class Details` | View class roster, progress, and activity. |
| `src/pages/teacher/TeacherStudentDetail.tsx` | `Student Details` | Detailed view of an individual student's progress and exercises. |
| `src/pages/teacher/TeacherTopicDetail.tsx` | `Topic Details` | Class-level performance breakdown for a specific learning topic. |

### Admin / management
| File | Title | Description |
|---|---|---|
| `src/pages/ManagementDashboard.tsx` | `Management` | Stuwy management dashboard. |
| `src/components/admin/AIModelManagement.tsx` | `AI Models` | Configure AI models and providers powering Stuwy. |
| `src/components/admin/SubjectManagement.tsx` | `Subjects` | Manage subjects available across the Stuwy platform. |
| `src/components/admin/UserManagement.tsx` | `Users` | Administer user accounts, roles, and permissions. |
| `src/components/admin/PromptManagement.tsx` | `Prompts` | Edit and version AI system prompts. |
| `src/components/admin/LearningContentManagement.tsx` | `Learning Content` | Manage videos, topics, and quiz content. |
| `src/components/admin/CurriculumManager.tsx` | `Curriculum` | Import and manage curriculum bundles. |
| `src/components/admin/ConnectionDiagnostics.tsx` | `Diagnostics` | Inspect connectivity and integration health. |
| `src/pages/admin/RecentUpdates.tsx` | `Recent Updates` | Recent imports, content updates, and system changes. |

### Skipped (intentional)
- `TokensPreview`, `GamePreview`, `CurriculumDebug`, `ExercisePage` — internal/preview/debug routes, not user-facing landing pages. Easy to add later if needed.

## Behavior notes
- `react-helmet-async` handles late mounts/Suspense correctly — important because most pages are `lazy()`-loaded in `App.tsx`.
- The static `<title>Stuwy</title>` and meta tags from `index.html` (added last step) remain as fallbacks for first paint and for any route that doesn't render `<PageMeta>` (e.g. loading fallback). `<Helmet>` overrides them once the page mounts.
- `og:title` / `twitter:title` set in `index.html` stay as global defaults — we're only customizing `<title>` and `description` per page per your request. If you later want per-page OG/Twitter overrides too, we add them inside `PageMeta`.

## Files touched
- **Install**: `react-helmet-async`
- **New**: `src/components/seo/PageMeta.tsx`
- **Edit**: `src/App.tsx` (wrap with `HelmetProvider`)
- **Edit**: ~37 page files listed above — each gets one `<PageMeta ... />` line at the top of its returned JSX and one import.

No DB, no edge function, no routing changes.

