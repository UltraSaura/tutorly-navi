# Admin Portal Functional Specification

## 1. Purpose

The Admin Portal is the operational control center for configuration, content management, diagnostics, and user oversight across the platform.

## 2. Primary Users

- Administrators
- Internal operators with admin-level access

## 3. Entry Points and Navigation

Primary routes:
- `/management`
- `/admin`
- `/admin/models`
- `/admin/diagnostics`
- `/admin/subjects`
- `/admin/users`
- `/admin/prompts`
- `/admin/learning`
- `/admin/curriculum`

Portal shell:
- `AdminLayout`
- `AdminSidebar`
- `AdminSidebarMobile`

Access control:
- Admin route access is guarded through `useAdminAuth()` and portal redirects.

## 4. Functional Areas

### 4.1 Management dashboard

Objective:
- Offer a lightweight entrypoint into the admin system.

Capabilities:
- Open admin panel
- Shortcut navigation to user management, model config, diagnostics, and subject management
- Basic system overview placeholders

Relevant files:
- `pages/ManagementDashboard.tsx`

### 4.2 AI model management

Objective:
- Control AI-related integrations and prompt/model behavior.

Capabilities:
- Overview tab
- Legacy API key management
- Model selection
- System prompt configuration
- Model-provider/key administration

Relevant files:
- `components/admin/AIModelManagement.tsx`
- `components/admin/ApiKeyManagement.tsx`
- `components/admin/ModelSelection.tsx`
- `components/admin/ModelManagementNew.tsx`
- `components/admin/SystemPromptConfigNew.tsx`
- `components/admin/models/ModelApiKeys.tsx`

Expected behavior:
- Admins can control which models/providers are available and how prompt behavior is configured.
- Model infrastructure should align with `ai_models`, `ai_model_providers`, and related tables.

### 4.3 Prompt and template management

Objective:
- Centrally manage the prompt templates that shape AI behavior.

Capabilities:
- View prompt-template counts and status by usage type
- Create/edit/view templates
- Prompt editor and variable guidance

Relevant files:
- `components/admin/PromptManagement.tsx`
- `components/admin/prompts/*`
- `docs/UNIFIED_CHAT_SYSTEM.md`

Expected behavior:
- Prompt templates should be manageable without direct database edits.
- Prompt changes should support chat, grading, and related system interactions.

### 4.4 Subject management

Objective:
- Maintain both chat/homework subjects and learning-platform subjects.

Capabilities:
- Add/edit/delete subjects
- Categorize subjects
- Reorder via drag-and-drop
- Toggle active state
- Separate views for chat/homework and learning-platform subject sets
- Icon/color/category editing support

Relevant files:
- `components/admin/SubjectManagement.tsx`
- `components/admin/subjects/*`

Expected behavior:
- Subject taxonomies should support both tutoring and structured-learning use cases.

### 4.5 User management

Objective:
- Inspect user records and manage parent/child relationships from an admin perspective.

Capabilities:
- User list/table
- Search and filter
- User detail panel
- Add child to parent/guardian from admin UI
- View linked children on parent records

Relevant files:
- `components/admin/UserManagement.tsx`
- `components/admin/users/*`

Expected behavior:
- Admins can audit and manage user records at the platform level.
- Admin tooling complements, but does not replace, guardian self-service flows.

### 4.6 Connection diagnostics

Objective:
- Diagnose issues affecting AI service connectivity and runtime access.

Capabilities:
- Run connection test
- Show method used and response time
- Show online/network/browser diagnostics
- Display troubleshooting tips

Relevant files:
- `components/admin/ConnectionDiagnostics.tsx`
- `utils/connectionTest.ts`

### 4.7 Learning content management

Objective:
- Author and maintain the structured-learning catalog and its assessment assets.

Capabilities:
- Category management
- Topic management
- Video management
- Quiz management
- Quiz-bank management
- Lesson generation hooks
- Topic-objective mapping
- Transcript/quiz generation support
- Visual question-building and geometry/shape editors
- Video variant and school-level targeting controls

Relevant files:
- `components/admin/LearningContentManagement.tsx`
- `components/admin/learning/*`
- `components/admin/visual-editors/*`

Expected behavior:
- Admins can manage the end-to-end learning content tree and attached assessment assets.
- Content management should feed the student and teacher learning experiences.

### 4.8 Curriculum manager

Objective:
- Import, inspect, and browse curriculum bundle data.

Capabilities:
- Import curriculum JSON bundle into Supabase
- View import results
- Show curriculum-related database statistics
- Filter objectives by country, level, subject, domain, and subdomain
- Search objective/task data

Relevant files:
- `components/admin/CurriculumManager.tsx`
- `components/admin/curriculum/*`

Expected behavior:
- Admins can seed or refresh curriculum structures used by learning and mastery features.

## 5. Data Model and Security Basis

Primary entities:
- `user_roles`
- `admin_audit_log`
- AI model tables
- Prompt-template tables
- Learning-content tables
- Curriculum/objective tables
- User/guardian/teacher support tables where relevant

Security model:
- Admin capabilities should flow through explicit role checks, not editable `user_type` alone.
- Admin-only writes are enforced through RLS policies using `has_role(auth.uid(), 'admin')` patterns.

## 6. Functional Rules

- Only admins may access admin routes.
- Admin views may reuse lower-level components but must preserve admin authorization checks.
- Content/config changes should be auditable or traceable where data model support exists.
- Diagnostic tools must provide actionable feedback, not just pass/fail output.

## 7. Implementation Status Notes

Implemented or substantially present:
- Admin route tree and layout
- Model/prompt management surfaces
- Subject and user management
- Diagnostics
- Learning content management
- Curriculum import/inspection tooling

Partial or dependent on operational setup:
- Certain AI-management features depend on real API keys, providers, secrets, and prompt-template data
- Some admin overview metrics are placeholders
- Full audit/reporting breadth may depend on how backend logging is populated

## 8. Non-Goals for This Portal

Not part of the admin portal’s direct responsibility:
- Serving as the day-to-day student learning interface
- Replacing guardian supervision workflows
- Replacing teacher instructional oversight workflows
