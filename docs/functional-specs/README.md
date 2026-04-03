# Tutorly Navi Functional Specifications

This folder contains portal-specific functional specifications derived from the current codebase, route map, component structure, and existing internal documentation.

## Source Basis

Primary sources used:
- `src/App.tsx`
- `src/pages/**`
- `src/components/{user,guardian,teacher,admin,auth}/**`
- `docs/GUARDIAN_PORTAL_WORKFLOW.md`
- `docs/UNIFIED_CHAT_SYSTEM.md`
- `supabase/migrations/**`

## Document Set

1. [Student / User Portal](./01-student-user-portal.md)
2. [Guardian Portal](./02-guardian-portal.md)
3. [Teacher Portal](./03-teacher-portal.md)
4. [Admin Portal](./04-admin-portal.md)
5. [Auth and Public Surface](./05-auth-and-public-surface.md)

## Product Structure Summary

### Public and entry surface
- Landing page
- Authentication and registration
- Management dashboard entrypoint

### Student / user surface
- AI tutoring chat
- Learning roadmap and subject navigation
- Topic playlists, video learning, inline quizzes, exercise history
- Profile, support, and program views

### Guardian surface
- Child account management
- Results, explanations, progress, billing, and settings
- Linked-child access model enforced through guardian relationships and RLS

### Teacher surface
- Classes, class roster, student detail, topic detail, and lesson-preview workflows
- Resources, analytics, and settings placeholders are routed but not yet implemented beyond placeholder pages

### Admin surface
- AI model and prompt controls
- Subject and user management
- Learning content, curriculum, diagnostics, and supporting content tooling

## Reading Guidance

These specifications aim to be:
- Detailed enough for product, design, engineering, QA, and stakeholder alignment
- Faithful to the current repository rather than aspirational marketing copy
- Explicit when a flow is partially implemented, scaffolded, or placeholder-only
