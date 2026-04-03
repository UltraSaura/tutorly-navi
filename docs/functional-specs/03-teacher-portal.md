# Teacher Portal Functional Specification

## 1. Purpose

The Teacher Portal is the classroom-facing oversight and instructional coordination surface. It focuses on classes, student progress visibility, and topic-level lesson inspection.

## 2. Primary Users

- Teachers
- Instructional staff operating in a teacher role

## 3. Entry Points and Navigation

Primary routes:
- `/teacher`
- `/teacher/classes`
- `/teacher/classes/:classId`
- `/teacher/students/:studentId`
- `/teacher/topics/:topicId`
- `/teacher/resources`
- `/teacher/analytics`
- `/teacher/settings`

Portal shell:
- `TeacherLayout`

## 4. Functional Areas

### 4.1 Teacher home dashboard

Objective:
- Provide a concise operational summary for a teacher.

Capabilities:
- Total classes count
- Total students count
- Weekly progress indicator
- Quick list of recent or available classes
- Navigation into class management

Relevant files:
- `pages/teacher/TeacherHome.tsx`
- `hooks/useTeacherClasses.ts`

Expected behavior:
- Teachers arrive on a dashboard summarizing class coverage and student volume.
- The page should support quick movement into class-specific detail.

### 4.2 Class list and class catalog

Objective:
- Let teachers browse all classes assigned to them.

Capabilities:
- Class cards with name, student count, level, and school year
- Quick navigation into class detail
- Empty state for no classes
- “New Class” call-to-action (UI present)

Relevant files:
- `pages/teacher/TeacherClasses.tsx`

Expected behavior:
- Teachers can scan class metadata and open a selected class.

Implementation note:
- The “New Class” button exists in the UI, but the spec should treat actual create-class workflow as dependent on supporting backend and form implementation.

### 4.3 Class detail and roster management

Objective:
- Provide an operational roster view for a specific class.

Capabilities:
- Class header and metadata
- Student roster table
- Student-level progress indicators
- Add-student action in the class detail header
- Drill-down into student detail pages

Relevant files:
- `pages/teacher/ClassDetailPage.tsx`
- `hooks/useClassStudents.ts`

Expected behavior:
- Teachers can see who is in a class and open individual student detail pages.
- The roster surface should expose enough context to identify who needs follow-up.

### 4.4 Student detail and intervention support

Objective:
- Help teachers understand an individual student’s current performance and next instructional targets.

Capabilities:
- Student identity and curriculum metadata
- Overall progress visualization
- Weakest subdomains / areas needing attention
- Per-subject mastery summaries
- Recommended next topics

Relevant files:
- `pages/teacher/TeacherStudentDetail.tsx`
- `hooks/useStudentProgress.ts`
- `hooks/useRecommendations.ts`
- `lib/progressService.ts`

Expected behavior:
- Teachers can identify weak spots and use recommendations to guide next instruction.

### 4.5 Topic detail and lesson-content review

Objective:
- Let teachers inspect the instructional content of a topic and preview the student-facing experience.

Capabilities:
- Topic metadata display
- Lesson-content display
- Generate-lesson-content action
- Student-facing route preview link
- Visibility into topic duration, videos, and quizzes

Relevant files:
- `pages/teacher/TeacherTopicDetail.tsx`
- `components/admin/learning/LessonContentDisplay.tsx`
- `components/admin/learning/GenerateLessonButton.tsx`

Expected behavior:
- Teachers can inspect what students will see for a topic.
- Where no lesson content exists, the page should make that absence visible and expose the generation action.

### 4.6 Placeholder teacher modules

The following routes are present but not functionally built out beyond placeholder pages:
- `/teacher/resources`
- `/teacher/analytics`
- `/teacher/settings`

Specification status:
- These routes are reserved portal surfaces, but no real functional implementation is present in `App.tsx` beyond placeholder text.

## 5. Data Model and Access Basis

Primary entities:
- `teachers`
- `classes`
- `class_student_links`
- `users`
- `user_roles`
- Student progress / mastery tables consumed through teacher-facing queries

Security model:
- Teachers can view/manage their own profile and classes.
- Teachers can view/manage class-student links for their own classes.
- Admins can manage teacher/class entities globally.

Relevant migration:
- `20251116035835_e169fe28-5e6c-430d-aa2c-1829e42da2c7.sql`

## 6. Functional Rules

- A teacher must have a valid teacher role/profile to access teacher routes.
- Class detail must be scoped to classes the teacher owns.
- Student detail visibility must flow through teacher-to-class-to-student relationships.
- Topic detail may reuse admin-side learning components for read/preview functionality.

## 7. Implementation Status Notes

Implemented or substantially present:
- Teacher route tree
- Teacher home and class list
- Class roster detail
- Student detail with recommendation support
- Topic detail with lesson-preview and generation hooks

Partial or placeholder:
- Class creation and add-student UI are visible but broader workflow completeness depends on backend/form flows
- Resources, analytics, and settings are placeholders only

## 8. Non-Goals for This Portal

Not part of the teacher portal’s responsibilities:
- System-wide admin governance
- Full curriculum import management
- Global model/prompt management
- Guardian child-account creation and billing
