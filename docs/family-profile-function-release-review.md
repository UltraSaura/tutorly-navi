# Edge Function release review — 2026-10-10

The original list contains 24 updates. Each guard runs before existing handler logic; existing endpoint role/ownership checks are retained. CORS accepts `x-family-grant`. Service-client access can bypass database RLS, so backend guards are necessary even for endpoints absent from the student UI.

| Function | Why its family update is necessary |
|---|---|
| `family-manage-pin` | New password-reauthenticated PIN setup/reset; binds setup to the caller's live Auth session, applies server attempt limits and calls service-only PIN RPCs. |
| `ai-chat` | Requires an approved selected learner before grading, tutoring or explanation generation; a parent JWT alone cannot substitute for a child grant. |
| `document-processor` | Requires learner authorization before processing personal homework images/documents. |
| `validate-training-answer` | Prevents a locked family account from submitting learner answers without selecting a child. |
| `create-child-account` | Requires parent authorization for child creation; passes the grant to existing guardian ownership checks. Unenrolled guardians retain existing checks during rollout. |
| `delete-account` | Prevents child mode from deleting the parent Auth account via a privileged service client. Independent accounts keep their existing deletion path. |
| `export-guardian-report` | Requires parent authorization before exporting linked-child reports and forwards the grant to RLS reads. |
| `quiz-bank-all` | Uses the selected learner and caller-scoped client; rejects a conflicting supplied learner ID. |
| `quiz-bank-visible` | Same identity correction for visible/assigned banks; retains caller RLS rather than using parent UUID as the learner. |
| `quiz-bank-attempt` | Stores attempts under the selected child's UUID using caller RLS; rejects forged learner IDs and avoids service-role insertion bypass. |
| `recommendations` | Reads/writes selected-child recommendation data and progress under the learner UUID, preserving family grant headers. |
| `student-progress` | Distinguishes selected-child reads from parent/teacher/admin reads; retains role/RLS checks for other learners. |
| `class-students` | Prevents a parent with additional teacher/admin roles from inheriting those privileges in child mode. |
| `teacher-classes` | Protects teacher class access from the same parent-role inheritance. |
| `generate-lesson-content` | Guards privileged shared-content generation; does not introduce or migrate V2 progress storage. |
| `generate-quiz-from-topics` | Protects privileged topic-quiz generation from inherited parent roles. |
| `generate-quiz-from-transcripts` | Protects privileged transcript-quiz generation from inherited parent roles. |
| `generate-topics-from-objectives` | Protects privileged shared-topic generation from inherited parent roles. |
| `import-exam-bundle` | Guards service-backed content import before existing import authorization. |
| `import-training-items` | Guards service-backed training import before existing authorization. |
| `ingest-curriculum-edition` | Guards curriculum ingestion so child mode cannot inherit a parent's administrative access. |
| `manage-api-keys` | Prevents child mode from reading/modifying provider credentials using inherited parent admin roles. No key values were inspected. |
| `subject-icon-upload` | Guards privileged storage upload/subject changes; existing roles and storage checks remain. |
| `suggest-topic-objectives` | Guards administrative objective suggestion/generation before the existing handler. |

**One additional omission was found and corrected locally:** `import-curriculum-bundle` reads admin roles using a service client. SQL's locked `has_role` alone does not constrain that read. It now uses `requirePrivilegedFamily` and accepts the grant header. The corrected release therefore has **25 functions**, not 24.

Other local endpoints reviewed: `run-sql` requires the service-role credential and does not accept ordinary parent tokens; `create-student-account` is the existing independent signup flow; `test-cors` contains no private learner/parent action; `quiz-bank` serves shared quiz content rather than learner attempts. They are outside this family update. This is a source audit, not a claim that every deployed endpoint matches local source.

`_shared/family-access.ts` is bundled with its consumers. `family_bootstrap` provides trusted server classification: enrolled families need a verified grant; unenrolled guardians continue the previous portal, with endpoint-specific ownership/role checks. It never treats a missing RPC or failed approval check as legacy compatibility.

These generation/import guards are authorization changes to existing endpoints, not a V2 product rollout. No lesson-progress or analytics migration is required by any of these guards. Local request/provider mocks, import parsers and bundles, guard ordering, and enrolled/independent teacher/admin RLS behavior pass. Successful calls with real provider credentials and complete-schema staging import/admin/teacher workflows still require external staging access.
