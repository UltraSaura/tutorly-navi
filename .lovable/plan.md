

## Curriculum Schema Refactor — Plan

### Strategy: phased, additive migration (safest)

Three phases. No destructive changes until phase 3, and only after the importer is verified.

```text
Phase 1: Add UUID PKs + UUID FK columns alongside existing text/bigint columns
Phase 2: Backfill UUID FKs from existing text labels; switch importer + app to UUIDs
Phase 3: Drop legacy text columns and old IDs once nothing reads them
```

This avoids breaking the live app at any point. Each phase is a separate migration.

---

### Diagnosis of current pain points

| Table | Problem |
|---|---|
| `domains` | No `id`. PK is `domain` text. No `subject_id`. |
| `subdomains` | `id` is `bigint`. FK `domain` is text. No `subject_id`. |
| `objectives` | PK is `text`. Has both `domain` (text) and `domain_id` (text, not UUID). Mixed strategy. |
| `success_criteria` | PK text. FKs are text, not UUID. |
| `tasks` | Same mixed pattern. |
| `lessons` | `unit_id` text references nonexistent `units` table. Should reference `topics`. |
| `topics` | Already UUID PK ✅. Has `curriculum_*_id` columns but they're text, not UUID FKs. |
| `topic_objective_links` | `objective_id` is text (matches current objectives PK). Will need to switch to UUID. |
| `videos` | `topic_id` is UUID ✅ but `subject_id` is text. |

---

### Final target schema (after phase 3)

```text
subjects (id uuid PK, name, slug, ...)
  ↑
  ├── domains (id uuid PK, subject_id uuid FK, code text, label text)
  │     ↑
  │     └── subdomains (id uuid PK, subject_id uuid FK, domain_id uuid FK, code, label)
  │           ↑
  │           └── objectives (id uuid PK, subject_id uuid FK, domain_id uuid FK,
  │                           subdomain_id uuid FK, level, text, ...)
  │                 ↑
  │                 ├── success_criteria (id uuid PK, objective_id uuid FK,
  │                 │                     subject_id, domain_id, subdomain_id [denorm])
  │                 │     ↑
  │                 │     └── tasks (id uuid PK, success_criterion_id uuid FK, ...)
  │                 │
  │                 └── topic_objective_links (id uuid PK,
  │                                            topic_id uuid FK → topics,
  │                                            objective_id uuid FK → objectives)
  │
  └── topics (id uuid PK, curriculum_subject_id uuid FK,
              curriculum_domain_id uuid FK, curriculum_subdomain_id uuid FK, ...)
        ↑
        ├── videos (id uuid PK, topic_id uuid FK, subject_id uuid FK, ...)
        └── lessons (id uuid PK, topic_id uuid FK, title, ...)
```

All PKs UUID. All FKs UUID. No text-label pseudo-relations. `topic_*` columns keep the `curriculum_` prefix per your note.

---

### Migration plan (3 SQL migrations)

**Migration 1 — Add new UUID columns (additive, non-breaking)**
- `domains`: add `id uuid PK default gen_random_uuid()`, `subject_id uuid`, `code text` (copy of `domain`), `label text`.
- `subdomains`: add `id_new uuid default gen_random_uuid()`, `subject_id uuid`, `domain_id_new uuid`, `code`, `label`.
- `objectives`: add `id_new uuid default gen_random_uuid()`, convert `subject_id`/`domain_id`/`subdomain_id` to uuid via new `_uuid` columns.
- `success_criteria`, `tasks`: same pattern — `id_new uuid`, `*_id_uuid` columns.
- `topics`: add `curriculum_subject_id_uuid`, `curriculum_domain_id_uuid`, `curriculum_subdomain_id_uuid` as UUID.
- `topic_objective_links`: add `objective_id_uuid uuid`.
- `lessons`: add `id_new uuid`, `topic_id uuid`.
- `videos`: add `subject_id_uuid uuid`.

**Migration 2 — Backfill + add FK constraints**
- Populate new UUID columns by joining on the legacy text labels (e.g. `UPDATE objectives SET subject_id_uuid = s.id FROM subjects s WHERE objectives.subject_id = s.slug`).
- Add FK constraints on the new UUID columns.
- Add unique constraints (`subjects.slug`, `domains(subject_id, code)`, etc.).
- Recreate triggers (`update_topic_video_count`, `update_topic_quiz_count`) — already on new table names, no change needed.

**Migration 3 — Cutover (run only after importer + app updated)**
- Drop old text PKs and legacy text columns.
- Rename `id_new` → `id`, `*_uuid` → final names.
- Promote new UUID PKs.
- Drop `subdomains.id` bigint column and sequence.
- Drop `lessons.unit_id`.
- Drop `objectives.domain`, `objectives.subdomain` text columns.

Phase 3 stays unapplied until you confirm phase 2 works end-to-end.

---

### Code impact

**Importer (`curriculum-import/import.js` + edge function `import-curriculum-bundle`)**
- JSON bundle keys stay the same.
- Each entity needs to provide a UUID `id` (or let the DB generate it and the importer captures returned IDs to wire FKs).
- Recommend: importer pre-generates UUIDs in JS (`crypto.randomUUID()`) so all FK wiring happens before insert. This matches your "structured JSON" pipeline cleanly.
- Remove the `mapToCurriculum()` keyword-matching hack in the edge function — FKs will be set explicitly by the transformer.
- Drop `onConflict: 'domain'` style upserts; switch to `onConflict: 'id'` everywhere or `onConflict: 'subject_id,code'` for natural keys.

**App code**
- `src/types/curriculum.ts`: change `Objective.id`, `SuccessCriterion.id`, `Task.id`, `Lesson.id` from `string` (text codes) to `string` (uuid) — type stays `string`, semantics change.
- Any query joining objectives via text codes needs to join via UUID instead.
- `topic_objective_links.objective_id` becomes UUID — affects `useTopicObjectives`, `useObjectiveMastery`, lesson generation edge functions.
- `objective_mastery.objective_id` is currently text — needs same UUID conversion (added to migration scope).
- `lesson_sessions.lesson_id` text — convert to UUID FK to `lessons`.

**Edge functions to update**: `import-curriculum-bundle`, `generate-lesson-content`, `generate-quiz-from-topics`, `recommendations`, `student-progress`.

---

### What I need from you before generating SQL

A few decisions affect the migration shape:

