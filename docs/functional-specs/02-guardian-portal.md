# Guardian Portal Functional Specification

## 1. Purpose

The Guardian Portal is the parent/guardian-facing supervision surface. It allows guardians to manage linked child accounts and monitor children’s results, explanations, progress, and account-level settings.

## 2. Primary Users

- Parents
- Guardians
- Tutors or related adult supervisors, where the link model permits it

## 3. Entry Points and Navigation

Primary routes:
- `/guardian`
- `/guardian/children`
- `/guardian/child/:childId`
- `/guardian/child/:childId/subject/:subjectId`
- `/guardian/child/:childId/detail`
- `/guardian/results`
- `/guardian/explanations`
- `/guardian/progress`
- `/guardian/billing`
- `/guardian/settings`

Portal shell:
- `GuardianLayout`
- `GuardianBottomNav`
- `GuardianStickyHeader`

## 4. Core Functional Objectives

### 4.1 Guardian dashboard

Objective:
- Provide a concise overview of the guardian’s linked children and recent academic signals.

Capabilities:
- KPI summaries
- Recent activity feed
- Focus-area indicators
- Child overview cards
- Quick entry into detail pages

Relevant components:
- `pages/guardian/GuardianHome.tsx`
- `components/guardian/KPICards.tsx`
- `components/guardian/RecentActivityFeed.tsx`
- `components/guardian/FocusAreasPanel.tsx`

Expected behavior:
- A guardian lands on a dashboard summarizing children count, progress signals, and activity.
- The dashboard should highlight where attention is needed.

### 4.2 Child account management

Objective:
- Allow guardians to create, view, and manage linked child profiles.

Capabilities:
- Children list and empty state
- Add-child form flow
- Manual child creation triggers
- Edit child details
- Child profile navigation

Relevant files:
- `pages/guardian/GuardianChildren.tsx`
- `components/guardian/AddChildForm.tsx`
- `components/guardian/EditChildDialog.tsx`
- `components/guardian/ManualChildCreationTrigger.tsx`
- `docs/GUARDIAN_PORTAL_WORKFLOW.md`

Expected behavior:
- Guardians can create child accounts from the portal.
- Newly created children become linked to the guardian through `guardian_child_links`.
- The guardian should be able to inspect child-level metadata and status.

### 4.3 Child-level dashboards

Objective:
- Provide a child-specific view that aggregates performance and subject data.

Capabilities:
- Child dashboard view
- Child detail page
- Subject detail under a specific child
- Child overview and subject drill-down

Relevant files:
- `pages/guardian/ChildDashboard.tsx`
- `pages/guardian/ChildDetailPage.tsx`
- `pages/guardian/SubjectDetail.tsx`
- `components/guardian/ChildHeader.tsx`
- `components/guardian/ChildOverviewCard.tsx`
- `components/guardian/SubjectsGrid.tsx`

Expected behavior:
- Guardians can move from the children list into a child-specific dashboard.
- Subject-level detail should contextualize that child’s progress and results.

### 4.4 Results monitoring

Objective:
- Let guardians review exercise outcomes across one or more linked children.

Capabilities:
- Exercise results page
- Filters by child, subject, date, and correctness
- Result summaries
- Row/card visualizations of attempts and status
- Timeline or panel views for exercise data

Relevant files:
- `pages/guardian/GuardianResults.tsx`
- `components/guardian/ResultsFilter.tsx`
- `components/guardian/ResultsSummary.tsx`
- `components/guardian/ExerciseResultCard.tsx`
- `components/guardian/ExerciseRow.tsx`
- `components/guardian/ExerciseTimeline.tsx`
- `components/guardian/ExercisesPanel.tsx`

Expected behavior:
- Guardians can see what children attempted, whether answers were correct, and how recently work was completed.
- The results interface should support both broad oversight and focused review.

### 4.5 Explanation review

Objective:
- Give guardians visibility into the learning explanations attached to children’s exercises.

Capabilities:
- Dedicated explanations page
- Explanation cards
- Deep-linking from results into explanation content

Relevant files:
- `pages/guardian/GuardianExplanations.tsx`
- `components/guardian/ExplanationCard.tsx`

Expected behavior:
- Guardians can inspect how the app explained a child’s work, not just whether it was correct.

### 4.6 Progress tracking

Objective:
- Surface subject-level and child-level progress trends.

Capabilities:
- Progress page
- KPI summaries and trend indicators
- Focus areas and subject summaries

Relevant files:
- `pages/guardian/GuardianProgress.tsx`
- `components/guardian/TrendIcon.tsx`

Expected behavior:
- Guardians should be able to identify patterns, not just isolated exercise results.

### 4.7 Export and reporting

Objective:
- Allow guardians to export report-style artifacts from child performance data.

Capabilities:
- Report export button
- Guardian report edge function support in backend structure

Relevant files:
- `components/guardian/ExportReportButton.tsx`
- `supabase/functions/export-guardian-report/*`

### 4.8 Billing and settings

Objective:
- Give guardians access to subscription and account preferences.

Capabilities:
- Billing page
- Settings page
- Guardian profile/account preferences

Relevant files:
- `pages/guardian/GuardianBilling.tsx`
- `pages/guardian/GuardianSettings.tsx`

## 5. Data Model and Security Basis

Primary entities:
- `users`
- `guardians`
- `children`
- `guardian_child_links`
- `user_roles`
- Child-linked `exercise_history`, `exercise_attempts`, `objective_mastery`, and quiz-bank attempt data

Security model:
- Guardian access is relationship-based.
- A guardian can view only their own linked children.
- Guardian read access to child exercise and mastery data is enforced through RLS, as documented in `GUARDIAN_PORTAL_WORKFLOW.md` and supporting migrations.

## 6. Functional Rules

- A guardian must be authenticated and identified as a guardian/parent-capable user.
- Child creation must establish both the child account/profile and the guardian-child relationship.
- Guardian pages must never expose unlinked children.
- Guardian-visible learning records are read-only supervisory views unless a specific profile-management action is supported.

## 7. Implementation Status Notes

Implemented or substantially present:
- Dedicated portal route tree
- Child management flows and components
- Results, explanations, progress, billing, and settings routes
- RLS and schema design for linked-child access

Partial or dependent on backend completeness:
- Some dashboard KPIs reference “coming soon” metrics in existing docs
- Report export depends on backend/report implementation completeness
- Some child-management paths may depend on operational auth/email setup

## 8. Non-Goals for This Portal

Not part of the guardian portal’s responsibilities:
- Editing academic content
- Managing global AI configuration
- Admin-grade user management across the full system
- Teacher class operations
