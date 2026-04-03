# Auth and Public Surface Functional Specification

## 1. Purpose

This document specifies the unauthenticated and cross-portal entry surfaces: landing page, authentication flows, role-aware redirects, and public/utility entry routes.

## 2. Scope

In-scope surfaces:
- `/`
- `/auth`
- `/management`
- Redirect behavior after authentication
- Public support for selecting the correct portal destination by user role

## 3. Landing Page

Route:
- `/`

Objective:
- Introduce the product and direct users toward sign-in, registration, or management entry.

Capabilities:
- Brand/hero presentation
- Student-oriented feature messaging
- Sign in / register CTA
- Admin dashboard CTA
- Language selection
- Role-based redirect when the user is already authenticated

Relevant files:
- `pages/Index.tsx`

Expected redirect logic:
- Admins visiting admin/management-related areas should retain admin route access.
- Guardians should be redirected to `/guardian`.
- Regular authenticated student users should be redirected to the main user experience.

## 4. Authentication Surface

Route:
- `/auth`

Objective:
- Provide a unified sign-in and account-creation surface for students and parents/guardians.

Capabilities:
- Login
- Password reset
- User type selection
- Student registration flow
- Parent registration flow
- Redirect handling when the user is already authenticated
- Special handling for attempted admin access by non-admin users

Relevant files:
- `pages/AuthPage.tsx`
- `components/auth/LoginForm.tsx`
- `components/auth/PasswordResetForm.tsx`
- `components/auth/UserTypeSelection.tsx`
- `components/auth/StudentRegistrationForm.tsx`
- `components/auth/ParentRegistrationForm.tsx`
- `context/AuthContext.tsx`

Expected behavior:
- Users can sign in with email/password.
- Students and parents/guardians have separate registration flows.
- Password reset returns the user into the auth flow.
- If a logged-in non-admin user hits an admin return path, they should be blocked from admin access and offered a switch-account path.

## 5. Role-Aware Access and Redirects

Role-related expectations:
- Admin routes must be guarded through explicit admin checks.
- Guardian users should be routed into guardian workflows.
- Regular student users should be routed into the student-facing app.
- Teacher access is defined in the application route map and supporting teacher-role schema/migrations.

Relevant files:
- `src/App.tsx`
- `components/admin/AdminLayout.tsx`
- `components/guardian/GuardianLayout.tsx`
- `components/teacher/TeacherLayout.tsx`
- `hooks/useAdminAuth.ts`
- `hooks/useGuardianAuth.ts`
- teacher-role migrations

## 6. Management Dashboard Entry Surface

Route:
- `/management`

Objective:
- Provide a general management entry screen that links into the actual admin subsystems.

Capabilities:
- Open admin panel
- Quick links for users, subjects, model settings, and diagnostics
- Basic system-status placeholders

Relevant files:
- `pages/ManagementDashboard.tsx`

## 7. Public / Cross-Portal Utility Considerations

These are not pure public marketing routes, but they sit near cross-portal entry behavior:
- Not found page fallback
- Loading and route-level error fallbacks
- Language handling during auth/landing flows

Relevant files:
- `pages/NotFound.tsx`
- `src/App.tsx`
- `context/SimpleLanguageContext.tsx`
- `i18n/*`

## 8. Data and Security Dependencies

Primary dependencies:
- `auth.users`
- `users`
- `guardians`
- `children`
- `teachers`
- `user_roles`
- Role-check helpers and route guards

Security rules:
- Authentication is handled through Supabase auth.
- Portal-specific access must be based on verified role/profile checks.
- Public routes should not expose privileged data.

## 9. Implementation Status Notes

Implemented or substantially present:
- Landing page
- Role-aware auth flow
- Student and parent registration paths
- Admin guard handling and redirect messaging
- Management dashboard entry surface

Partial or operationally dependent:
- Teacher onboarding and practical teacher-entry flow depend on role/profile population
- Some post-registration experiences depend on backend triggers and profile-creation flows

## 10. Non-Goals for This Surface

Not part of this surface’s job:
- Deep student learning workflows
- Guardian monitoring workflows
- Teacher instructional workflows
- Admin configuration tasks themselves

Its role is to get users to the correct portal safely and clearly.
