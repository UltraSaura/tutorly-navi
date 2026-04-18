

## Curriculum Refactor — Phase 2 + Phase 3 Plan

Phase 1 is already applied (additive UUID columns added). Below is the rest, ready to ship.

---

### Phase 2 — Backfill + constraints (non-breaking)

**Backfill order (FKs need parents first):**

1. `domains.subject_id` ← `subjects.id` via `subjects.slug = objectives.subject_id` text. Since current `domains` has no subject link, derive subject from `objectives` rows that reference each domain code. Fallback: bulk-update with NULL, then admin re-assigns.
2. `subdomains.subject_id` and `subdomains.domain_id_new` ← join on `subdomains.domain` text → `domains.code`.
3. `objectives.subject_id_uuid` ← `subjects` via slug match on `objectives.subject_id` text.
4. `objectives.domain_id_uuid` ← `domains` via `(subject_id, code)`.
5. `objectives.subdomain_id_uuid` ← `subdomains` via `(domain_id_new, code)` or `subdomain` text.
6. `success_criteria.objective_id_uuid` ← `objectives.id_new` via legacy `objective_id` text → `objectives.id` text.
7. Cascade `subject/domain/subdomain_id_uuid` on `success_criteria` from parent objective.
8. `tasks.success_criterion_id_uuid` ← `success_criteria.id_new`. Cascade other FKs.
9. `topics.curriculum_subject_id_uuid` ← `subjects.slug` match on text col.
10. `topics.curriculum_domain_id_uuid` ← `domains` via (subject, code).
11. `topics.curriculum_subdomain_id_uuid` ← `subdomains` via (domain, code).
12. `topic_objective_links.objective_id_uuid` ← `objectives.id_new` via text match.
13. `lessons.topic_id` ← derive from `topic_objective_links` (lessons share objectives with topics) — or leave NULL for admin assignment if ambiguous.
14. `videos.subject_id_uuid` ← `subjects.slug`.
15. `objective_mastery.objective_id_uuid` ← `objectives.id_new`.
16. `lesson_sessions.lesson_id_uuid` ← `lessons.id_new`.

**Constraints added in Phase 2 (non-blocking, on new columns only):**
- Unique: `subjects(slug)`, `domains(subject_id, code)`, `subdomains(domain_id_new, code)`, `topic_objective_links(topic_id, objective_id_uuid)`.
- FK: every `*_id_uuid` / `*_new` column → parent's `id_new` (or `id` where already uuid).
- Indexes on every new FK column.

App keeps reading legacy text columns. Importer can start writing UUIDs in parallel.

---

### Phase 3 — Cutover (breaking, run after importer + app updated)

For each table:
1. Drop legacy text/bigint PK constraint.
2. Drop legacy text FK columns (`objectives.domain`, `objectives.subdomain`, `objectives.subject_id` text, `objectives.domain_id` text, etc.).
3. Drop `subdomains.id` bigint + sequence.
4. Drop `lessons.unit_id`.
5. Rename `id_new` → `id`, `*_id_uuid` / `*_id_new` → final names (`subject_id`, `domain_id`, `subdomain_id`, `objective_id`, `success_criterion_id`, `lesson_id`).
6. Promote new UUID PKs.
7. Re-add NOT NULL where required (`domains.subject_id`, `domains.code`, `domains.label`, `subdomains.subject_id`, `subdomains.domain_id`, `objectives.subject_id`, etc.).
8. Re-create FK constraints under final names.

---

### Final schema (after phase 3)

```text
subjects        (id, name, slug UNIQUE, language, ...)
domains         (id, subject_id→subjects, code, label, UNIQUE(subject_id,code))
subdomains      (id, subject_id→subjects, domain_id→domains, code, label,
                 UNIQUE(domain_id,code))
objectives      (id, subject_id, domain_id, subdomain_id, level, text,
                 notes_from_prog, keywords)
success_criteria(id, objective_id→objectives, subject_id, domain_id,
                 subdomain_id, text)
tasks           (id, success_criterion_id→success_criteria, subject_id,
                 domain_id, subdomain_id, type, stem, solution, rubric,
                 difficulty, tags, source)
topics          (id, category_id, curriculum_subject_id→subjects,
                 curriculum_domain_id→domains, curriculum_subdomain_id→subdomains,
                 curriculum_country_code, curriculum_level_code, ...)
topic_objective_links (id, topic_id→topics, objective_id→objectives,
                 UNIQUE(topic_id,objective_id))
videos          (id, topic_id→topics, subject_id→subjects, ...)
lessons         (id, topic_id→topics, title, objective_ids, success_criterion_ids,
                 materials, teacher_talk, student_worksheet, misconceptions)
objective_mastery (id, student_id, topic_id, objective_id→objectives, ...)
lesson_sessions   (id, child_id, lesson_id→lessons, ...)
```

---

### Code impact (between Phase 2 and Phase 3)

**Importer (`import-curriculum-bundle` edge function + `curriculum-import/import.js`)**
- Pre-generate UUIDs in JS (`crypto.randomUUID()`) for every entity before insert; wire FKs explicitly.
- Switch upserts to `onConflict: 'id'` everywhere. Use `(subject_id, code)` for domains and `(domain_id, code)` for subdomains as natural keys.
- Delete `mapToCurriculum()` keyword hack — transformer sets FKs.
- During phase 2 transition: write BOTH legacy text + new UUID columns so the live app keeps working.

**App code (`src/`)**
- `src/types/curriculum.ts`: types stay `string`, but semantics shift from text codes to UUIDs.
- Hooks touching joins: `useTopicObjectives`, `useObjectiveMastery`, lesson generation edge functions — switch joins from text codes to UUID FKs.
- `objective_mastery` and `lesson_sessions` queries to use new UUID FK columns.
- Edge functions to update: `import-curriculum-bundle`, `generate-lesson-content`, `generate-quiz-from-topics`, `recommendations`, `student-progress`.

---

### Importer pipeline after Phase 2

```text
PDF/spreadsheet
    ↓
extractor → flat rows
    ↓
transformer (assigns crypto.randomUUID() to every entity, wires FKs)
    ↓
{
  subjects:[{id, slug, name, ...}],
  domains:[{id, subject_id, code, label}],
  subdomains:[{id, subject_id, domain_id, code, label}],
  objectives:[{id, subject_id, domain_id, subdomain_id, level, text, ...}],
  success_criteria:[{id, objective_id, subject_id, domain_id, subdomain_id, text}],
  tasks:[{id, success_criterion_id, ...}],
  topics:[{id, curriculum_subject_id, curriculum_domain_id, curriculum_subdomain_id, ...}],
  topic_objective_links:[{id, topic_id, objective_id}],
  lessons:[{id, topic_id, title, ...}],
  videos:[{id, topic_id, subject_id, ...}]
}
    ↓
edge function: insert in parent→child order, onConflict:'id'
```

No more keyword matching. No more text-FK lookups. No more null-tolerant hacks.

---

### Migrations to generate (3 files)

1. `phase2_backfill_and_constraints.sql` — backfill all `*_uuid`/`*_new` columns + add FK + unique constraints + indexes. Non-breaking.
2. `phase3_cutover.sql` — drop legacy columns, rename to final names, promote PKs, re-add NOT NULL + FK constraints. Breaking. Will be applied only after you confirm importer + app are switched.
3. The Phase 1 migration is already applied — no rework needed.

Backfill rows that fail to match (e.g. orphan subdomain text labels with no parent subject) will be reported via a `SELECT COUNT(*) WHERE *_uuid IS NULL` in the migration so we know what needs admin cleanup before Phase 3.

