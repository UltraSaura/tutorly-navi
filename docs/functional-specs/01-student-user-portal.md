# Student / User Portal Functional Specification

## 1. Purpose

The Student / User Portal is the primary learning surface for end users. It combines AI tutoring, homework intake, structured learning content, mastery tracking, progress visualization, and account self-service.

## 2. Primary Users

- Students using the app for homework help and guided learning
- Secondary internal viewers: admins and developers validating student flows

## 3. Entry Points and Navigation

Primary routes:
- `/chat`
- `/dashboard`
- `/exercise-history`
- `/learning`
- `/learning/:subjectSlug`
- `/learning/:subjectSlug/:topicSlug`
- `/learning/video/:videoId`
- `/my-program`
- `/profile`
- `/support`
- `/general-chat`
- `/tokens`
- `/game`
- `/curriculum`
- `/curriculum-debug`

Layout shell:
- `MainLayout` wraps the main student-facing routes.

## 4. Functional Areas

### 4.1 AI tutoring chat

Core objective:
- Let the student ask questions, submit homework, and receive AI-generated explanations and grading-aware responses.

Key capabilities:
- Text message input
- Message submission through the chat pipeline
- AI response rendering
- Calculation / processing status display
- Homework-aware answer submission format
- Attachment intake for documents and images
- Camera-based capture for mobile-style homework/photo submission
- Overlay-aware input behavior
- Mobile keyboard handling and fixed-bottom composer behavior

Relevant components:
- `components/user/ChatInterface.tsx`
- `components/user/chat/*`
- `hooks/useChat.ts`
- `hooks/useExercises.ts`
- `docs/UNIFIED_CHAT_SYSTEM.md`

Expected behavior:
- A student can type or upload work from the same interaction area.
- Uploaded documents and images are routed into extraction and exercise creation flows.
- The chat system can process a message both as a conversational request and as an exercise/grading candidate.
- For math interactions, the unified AI pathway is intended to combine detection, tutoring, and grading in one backend flow.

Constraints and notes:
- General non-math chat exists as a separate route and is currently placeholder-only.
- Chat depends on configured models and Supabase edge functions.

### 4.2 Homework and document intake

Core objective:
- Convert uploaded files or captured images into exercises that can be reviewed, solved, or graded.

Capabilities:
- Document upload from file picker
- Photo upload from file picker
- Camera capture path
- OCR / extraction submission to backend processing
- Conversion of extracted output into exercises
- Fallback handling when backend extraction yields limited results

Relevant files:
- `utils/documentProcessor.ts`
- `services/homeworkGrading.ts`
- `services/unifiedChatService.ts`
- `supabase/functions/document-processor/*`

Expected behavior:
- A student can upload a worksheet, document, or image.
- The system sends file data to backend extraction services.
- Extracted content is transformed into exercises and can then be graded or discussed.

### 4.3 Dashboard and progress overview

Core objective:
- Show learning progress, mastery, roadmap, and next-step guidance in a digestible student dashboard.

Capabilities:
- Overall progress summary
- Subject mastery summary
- Roadmap tab
- Grades tab
- Skills tab
- Subject-level cards and progress indicators
- Recommended next steps

Relevant files:
- `components/user/UnifiedDashboard.tsx`
- `pages/StudentDashboard.tsx`
- `components/user/SubjectMasteryCard.tsx`
- `components/user/LearningRoadmap.tsx`
- `components/user/GradeDashboard.tsx`
- `components/user/SkillMastery.tsx`

Expected behavior:
- Students can see aggregate progress and move from summary into specific subject/topic learning areas.
- Dashboard views should reflect progress stored in `user_learning_progress` and mastery-related tables.

### 4.4 Learning catalog and subject navigation

Core objective:
- Present the structured learning catalog available to the student based on profile and curriculum context.

Capabilities:
- Subject list display
- Curriculum-profile gate before learning access
- Subject availability status
- Subject dashboards with topic lists
- Topic progress display
- Curriculum location display where mapped

Relevant files:
- `pages/learning/LearningPage.tsx`
- `pages/learning/SubjectDashboardPage.tsx`
- `hooks/useLearningSubjects.ts`
- `hooks/useUserCurriculumProfile.ts`
- `hooks/useSubjectDashboard.ts`

Expected behavior:
- Students without required curriculum/profile settings are redirected to profile setup guidance.
- Only ready/available learning subjects should open into deeper flows.
- Subject dashboards should visualize topic completion and content volume.

### 4.5 Topic learning and playlist flow

Core objective:
- Let students study a topic through videos, transcripts, lesson content, and quizzes.

Capabilities:
- Topic header and metadata
- Featured/current video selection
- Learn / Transcript / Lesson tab layout
- Auto-selection of a featured video
- Completed-video tracking
- Quiz bank discovery for the active topic/video context
- Quiz overlay controller integration

Relevant files:
- `pages/learning/CoursePlaylistPage.tsx`
- `components/learning/TopicTabsLayout.tsx`
- `components/learning/TopicLearnTab.tsx`
- `components/learning/TopicTranscriptTab.tsx`
- `components/learning/TopicLessonTab.tsx`
- `hooks/useCoursePlaylist.ts`
- `hooks/useQuizBank.ts`

Expected behavior:
- The topic page should act as the main learning workspace for a topic.
- Students should be able to switch between direct learning content, transcript review, and lesson material.
- Quiz bank triggers should reflect prior video completion and assignment logic.

### 4.6 Video player and inline assessment

Core objective:
- Deliver video content with progress tracking and embedded self-assessment.

Capabilities:
- Video playback
- Progress bar and playback control
- Fullscreen request
- Playback-time update handling
- Progress persistence
- Time-triggered or content-triggered quizzes
- Test-yourself quiz bank cards

Relevant files:
- `pages/learning/VideoPlayerPage.tsx`
- `hooks/useVideoPlayer.ts`
- `components/learning/TestYourselfInline.tsx`
- `components/learning/QuizOverlayController.tsx`

Expected behavior:
- Progress should be captured while the student watches.
- Quizzes may interrupt or accompany video learning.
- Quiz-bank access may be gated by completion state.

### 4.7 Exercise history and explanations

Core objective:
- Let students review previously solved exercises and their outcomes.

Capabilities:
- Exercise history list
- Filters by subject and period
- Stats cards for counts and success rate
- Correct/incorrect indicators
- Explanation modal access
- Timestamps and attempt counts

Relevant files:
- `pages/ExerciseHistoryPage.tsx`
- `hooks/useExerciseHistory.ts`
- `features/explanations/*`

Expected behavior:
- Students can audit their recent work.
- Historical exercises can lead back into explanation/review flows.

### 4.8 Profile and account self-service

Core objective:
- Let students maintain profile information and learning preferences.

Capabilities:
- View personal/account information
- School-program settings editing
- Account deletion path

Relevant files:
- `pages/ProfilePage.tsx`
- `components/profile/ProfileEditForm.tsx`
- `components/profile/AccountDeletion.tsx`

### 4.9 Support and help surface

Core objective:
- Provide support access and self-help resources.

Capabilities:
- Support contact cards
- FAQ content
- Chat history panel
- Documentation call-to-action

Relevant files:
- `pages/SupportPage.tsx`

### 4.10 Preview and debug pages

These routes are part of the user-side route tree but are not primary product workflows:
- `/game`: gamification preview
- `/tokens`: design token preview
- `/curriculum-debug`: debug surface
- `/general-chat`: placeholder route for future non-math chat

## 5. Data Dependencies

Primary tables and services:
- `users`
- `exercise_history`
- `exercise_attempts`
- `exercise_explanations_cache`
- `learning_subjects`
- `learning_categories`
- `learning_topics`
- `learning_videos`
- `video_quizzes`
- `user_learning_progress`
- `objective_mastery`
- `quiz_banks` and related quiz-bank tables
- Supabase edge functions for chat, OCR/document processing, recommendations, and learning support

## 6. Permissions and Access Rules

- Authenticated users can access their own student-facing data.
- User-level progress and history should be scoped to the signed-in user.
- Admins may access student-visible routes for testing, but the portal is functionally designed for students.

## 7. Implementation Status Notes

Implemented or substantially present:
- AI chat
- Homework upload flows
- Dashboarding and learning routes
- Video player and quiz integration
- Exercise history
- Profile and support

Partial or placeholder:
- General chat page is placeholder-only
- Some preview/debug routes are not core end-user product features
- Certain flows depend on backend configuration, prompt/model setup, and available learning content

## 8. Non-Goals for This Portal

Not part of the student portal's core responsibilities:
- System-wide model configuration
- Content authoring
- Curriculum import administration
- Guardian child management
- Teacher class management
