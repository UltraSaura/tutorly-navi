

The user wants me to consolidate everything into a clear, executable package. Phase 1 (additive UUID columns) and the wipe + importer dual-write are already done. What remains:

1. Subject normalization SQL — already partially done (lowercased 'Physics'). Need to also align `topics.curriculum_subject_id` 'math' → 'mathematics' (or rename slug). Decision: rename `subjects.slug` 'mathematics' → 'math' to match what topics already use, OR update topics. The cleaner choice is to canonicalize on the shorter slug 'math' since it matches topic data and is already widely referenced. Actually — the importer will rewire topic FKs to UUIDs, so the slug value on topics becomes irrelevant after re-import. Just need slug consistency on `subjects` for the importer's natural-key lookup. So: keep `subjects.slug = 'mathematics'` but make sure the bundle uses 'mathematics' as the slug. No SQL change needed beyond what's done.

2. Wipe SQL — already applied in migration `20260418161458`.

3. Importer notes — already updated in `import.js` and edge function.

4. Verification queries — need to provide these for after the user re-imports.

5. Phase 3 cutover SQL — the big one. Drop legacy columns, rename `id_new → id`, promote PKs, re-add FKs.

Phase 3 needs care:
- `objectives` PK is currently `text id`. Drop PK, drop text id, rename id_new → id, set PK.
- `success_criteria`, `tasks`, `lessons`: same pattern.
- `subdomains`: PK is bigint id with sequence. Drop PK + col + sequence. Rename id_new → id, set PK. Rename `domain_id_new` → `domain_id`.
- `domains`: id is already uuid (added in phase 1). Drop legacy `domain` text column, set NOT NULL on `subject_id, code, label`.
- `topics`: drop `curriculum_subject_id, curriculum_domain_id, curriculum_subdomain_id` text columns. Rename `*_uuid` to those names.
- `videos`: drop text `subject_id`, rename `subject_id_uuid` → `subject_id`.
- `topic_objective_links`: drop text `objective_id`, rename `objective_id_uuid` → `objective_id`.
- `objective_mastery`: drop text `objective_id`, rename `objective_id_uuid` → `objective_id`.
- `lesson_sessions`: drop text `lesson_id`, rename `lesson_id_uuid` → `lesson_id`.
- Re-add FKs everywhere under final names.
- Drop legacy text FK columns on `objectives`, `success_criteria`, `tasks` (subject_id text, domain_id text, subdomain_id text, domain text, subdomain text, skill_id text, etc.).

Risk: app code still reads legacy text columns in many places (per memory: `useTopicObjectives`, `useObjectiveMastery`, lesson generation edge functions, etc.). Phase 3 will break those reads. So between re-import and Phase 3, app code must be switched to read UUID columns.

Plan structure:
- Step 1: Re-import (user action)
- Step 2: Verification SQL (I provide, run via supabase--read_query)
- Step 3: Switch app code to read UUID columns
- Step 4: Phase 3 cutover migration

Let me lay it out concisely.

## Option C — Final Execution Plan

Phase 1 (additive columns) and the wipe + importer dual-write are already applied. Subject normalization (`'Physics' → 'physics'`) was included in the wipe migration. Here's the rest, in order.

---

### Step 1 — You re-import the curriculum bundle

Run your importer (`npm run import` from `curriculum-import/` or call the edge function from the admin UI). The updated importer:
- Pre-generates UUIDs via `crypto.randomUUID()` for every entity
- Wires FKs explicitly using natural-key maps (subject slug, `(subject_id, code)` for domains, `(domain_id, code)` for subdomains)
- Writes to both legacy text columns and new UUID columns (dual-write)
- No more `mapToCurriculum()` keyword matching

**Bundle requirement**: subjects in your bundle must use slugs that match `subjects.slug` in the DB exactly. Currently the DB has `'mathematics'` and `'physics'`. If your bundle uses `'math'`, change it to `'mathematics'` — or tell me and I'll add an alias map to the importer.

---

### Step 2 — Verification queries (I run after you confirm import done)

```sql
-- Coverage: zero NULLs expected in new UUID columns
SELECT 'domains'        AS tbl, COUNT(*) FILTER (WHERE subject_id IS NULL) AS null_subject FROM domains
UNION ALL SELECT 'subdomains', COUNT(*) FILTER (WHERE subject_id IS NULL OR domain_id_new IS NULL) FROM subdomains
UNION ALL SELECT 'objectives', COUNT(*) FILTER (WHERE subject_id_uuid IS NULL OR domain_id_uuid IS NULL OR subdomain_id_uuid IS NULL) FROM objectives
UNION ALL SELECT 'success_criteria', COUNT(*) FILTER (WHERE objective_id_uuid IS NULL) FROM success_criteria
UNION ALL SELECT 'tasks', COUNT(*) FILTER (WHERE success_criterion_id_uuid IS NULL) FROM tasks
UNION ALL SELECT 'topic_objective_links', COUNT(*) FILTER (WHERE objective_id_uuid IS NULL) FROM topic_objective_links
UNION ALL SELECT 'lessons', COUNT(*) FILTER (WHERE topic_id IS NULL AND id_new IS NOT NULL) FROM lessons;

-- Hierarchy integrity (every objective's domain belongs to its subject, etc.)
SELECT COUNT(*) AS broken_objective_chain
FROM objectives o
LEFT JOIN domains d ON d.id = o.domain_id_uuid AND d.subject_id = o.subject_id_uuid
WHERE o.id_new IS NOT NULL AND d.id IS NULL;

-- Orphan check on topic_objective_links
SELECT COUNT(*) AS orphan_links
FROM topic_objective_links l
LEFT JOIN objectives o ON o.id_new = l.objective_id_uuid
WHERE o.id_new IS NULL;
```

If anything > 0, we fix the bundle/importer and re-import. No Phase 3 until all zero.

---

### Step 3 — Switch app code to read UUID columns

Files to update before cutover (so the app keeps working when legacy columns drop):
- `src/types/curriculum.ts` — IDs stay typed as `string`, semantics shift
- `src/hooks/useTopicObjectives.ts` — join via `objective_id_uuid` then alias
- `src/hooks/useObjectiveMastery.ts` — read/write `objective_id_uuid`
- `src/integrations/supabase/types.ts` — auto-regenerated, no manual edit
- Edge functions: `generate-lesson-content`, `generate-quiz-from-topics`, `recommendations`, `student-progress` — switch joins to UUID columns

I'll do this in default mode in a single pass.

---

### Step 4 — Phase 3 cutover migration (breaking, runs last)

```sql
BEGIN;

-- ============== domains: id already uuid, just clean legacy
ALTER TABLE domains DROP COLUMN domain;
ALTER TABLE domains ALTER COLUMN subject_id SET NOT NULL,
                    ALTER COLUMN code       SET NOT NULL,
                    ALTER COLUMN label      SET NOT NULL;
ALTER TABLE domains ADD CONSTRAINT domains_subject_fk
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

-- ============== subdomains: drop bigint PK, promote id_new
ALTER TABLE subdomains DROP CONSTRAINT subdomains_pkey;
ALTER TABLE subdomains DROP COLUMN id;
ALTER TABLE subdomains DROP COLUMN domain;
ALTER TABLE subdomains DROP COLUMN subdomain;
ALTER TABLE subdomains RENAME COLUMN id_new        TO id;
ALTER TABLE subdomains RENAME COLUMN domain_id_new TO domain_id;
ALTER TABLE subdomains ADD PRIMARY KEY (id);
ALTER TABLE subdomains ALTER COLUMN subject_id SET NOT NULL,
                       ALTER COLUMN domain_id  SET NOT NULL,
                       ALTER COLUMN code       SET NOT NULL,
                       ALTER COLUMN label      SET NOT NULL;
ALTER TABLE subdomains ADD CONSTRAINT subdomains_subject_fk
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE subdomains ADD CONSTRAINT subdomains_domain_fk
  FOREIGN KEY (domain_id)  REFERENCES domains(id)  ON DELETE CASCADE;
DROP SEQUENCE IF EXISTS subdomains_id_seq;

-- ============== objectives: drop text PK + legacy cols, promote id_new
ALTER TABLE objectives DROP CONSTRAINT objectives_pkey;
ALTER TABLE objectives DROP COLUMN id, DROP COLUMN domain, DROP COLUMN subdomain,
                       DROP COLUMN subject_id, DROP COLUMN domain_id,
                       DROP COLUMN subdomain_id, DROP COLUMN skill_id;
ALTER TABLE objectives RENAME COLUMN id_new           TO id;
ALTER TABLE objectives RENAME COLUMN subject_id_uuid  TO subject_id;
ALTER TABLE objectives RENAME COLUMN domain_id_uuid   TO domain_id;
ALTER TABLE objectives RENAME COLUMN subdomain_id_uuid TO subdomain_id;
ALTER TABLE objectives ADD PRIMARY KEY (id);
ALTER TABLE objectives ALTER COLUMN subject_id   SET NOT NULL,
                       ALTER COLUMN domain_id    SET NOT NULL,
                       ALTER COLUMN subdomain_id SET NOT NULL;
ALTER TABLE objectives ADD CONSTRAINT objectives_subject_fk   FOREIGN KEY (subject_id)   REFERENCES subjects(id)   ON DELETE CASCADE;
ALTER TABLE objectives ADD CONSTRAINT objectives_domain_fk    FOREIGN KEY (domain_id)    REFERENCES domains(id)    ON DELETE CASCADE;
ALTER TABLE objectives ADD CONSTRAINT objectives_subdomain_fk FOREIGN KEY (subdomain_id) REFERENCES subdomains(id) ON DELETE CASCADE;

-- ============== success_criteria
ALTER TABLE success_criteria DROP CONSTRAINT success_criteria_pkey;
ALTER TABLE success_criteria DROP COLUMN id, DROP COLUMN objective_id,
                              DROP COLUMN subject_id, DROP COLUMN domain_id,
                              DROP COLUMN subdomain_id, DROP COLUMN skill_id;
ALTER TABLE success_criteria RENAME COLUMN id_new            TO id;
ALTER TABLE success_criteria RENAME COLUMN objective_id_uuid TO objective_id;
ALTER TABLE success_criteria RENAME COLUMN subject_id_uuid   TO subject_id;
ALTER TABLE success_criteria RENAME COLUMN domain_id_uuid    TO domain_id;
ALTER TABLE success_criteria RENAME COLUMN subdomain_id_uuid TO subdomain_id;
ALTER TABLE success_criteria ADD PRIMARY KEY (id);
ALTER TABLE success_criteria ALTER COLUMN objective_id SET NOT NULL;
ALTER TABLE success_criteria ADD CONSTRAINT sc_objective_fk FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE;

-- ============== tasks
ALTER TABLE tasks DROP CONSTRAINT tasks_pkey;
ALTER TABLE tasks DROP COLUMN id, DROP COLUMN success_criterion_id,
                  DROP COLUMN subject_id, DROP COLUMN domain_id,
                  DROP COLUMN subdomain_id, DROP COLUMN skill_id;
ALTER TABLE tasks RENAME COLUMN id_new                    TO id;
ALTER TABLE tasks RENAME COLUMN success_criterion_id_uuid TO success_criterion_id;
ALTER TABLE tasks RENAME COLUMN subject_id_uuid           TO subject_id;
ALTER TABLE tasks RENAME COLUMN domain_id_uuid            TO domain_id;
ALTER TABLE tasks RENAME COLUMN subdomain_id_uuid         TO subdomain_id;
ALTER TABLE tasks ADD PRIMARY KEY (id);
ALTER TABLE tasks ADD CONSTRAINT tasks_sc_fk FOREIGN KEY (success_criterion_id) REFERENCES success_criteria(id) ON DELETE CASCADE;

-- ============== topics
ALTER TABLE topics DROP COLUMN curriculum_subject_id,
                   DROP COLUMN curriculum_domain_id,
                   DROP COLUMN curriculum_subdomain_id;
ALTER TABLE topics RENAME COLUMN curriculum_subject_id_uuid   TO curriculum_subject_id;
ALTER TABLE topics RENAME COLUMN curriculum_domain_id_uuid    TO curriculum_domain_id;
ALTER TABLE topics RENAME COLUMN curriculum_subdomain_id_uuid TO curriculum_subdomain_id;
ALTER TABLE topics ADD CONSTRAINT topics_curriculum_subject_fk   FOREIGN KEY (curriculum_subject_id)   REFERENCES subjects(id)   ON DELETE SET NULL;
ALTER TABLE topics ADD CONSTRAINT topics_curriculum_domain_fk    FOREIGN KEY (curriculum_domain_id)    REFERENCES domains(id)    ON DELETE SET NULL;
ALTER TABLE topics ADD CONSTRAINT topics_curriculum_subdomain_fk FOREIGN KEY (curriculum_subdomain_id) REFERENCES subdomains(id) ON DELETE SET NULL;

-- ============== topic_objective_links
ALTER TABLE topic_objective_links DROP COLUMN objective_id;
ALTER TABLE topic_objective_links RENAME COLUMN objective_id_uuid TO objective_id;
ALTER TABLE topic_objective_links ALTER COLUMN objective_id SET NOT NULL;
ALTER TABLE topic_objective_links ADD CONSTRAINT tol_objective_fk FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE;
-- topic_id FK to topics already exists if not:
ALTER TABLE topic_objective_links ADD CONSTRAINT tol_topic_fk FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;

-- ============== lessons
ALTER TABLE lessons DROP CONSTRAINT lessons_pkey;
ALTER TABLE lessons DROP COLUMN id, DROP COLUMN unit_id;
ALTER TABLE lessons RENAME COLUMN id_new TO id;
ALTER TABLE lessons ADD PRIMARY KEY (id);
ALTER TABLE lessons ADD CONSTRAINT lessons_topic_fk FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL;

-- ============== videos
ALTER TABLE videos DROP COLUMN subject_id;
ALTER TABLE videos RENAME COLUMN subject_id_uuid TO subject_id;
ALTER TABLE videos ADD CONSTRAINT videos_subject_fk FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

-- ============== objective_mastery
ALTER TABLE objective_mastery DROP COLUMN objective_id;
ALTER TABLE objective_mastery RENAME COLUMN objective_id_uuid TO objective_id;
ALTER TABLE objective_mastery ALTER COLUMN objective_id SET NOT NULL;
ALTER TABLE objective_mastery ADD CONSTRAINT om_objective_fk FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE;

-- ============== lesson_sessions
ALTER TABLE lesson_sessions DROP COLUMN lesson_id;
ALTER TABLE lesson_sessions RENAME COLUMN lesson_id_uuid TO lesson_id;
ALTER TABLE lesson_sessions ADD CONSTRAINT ls_lesson_fk FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;

COMMIT;
```

---

### What I need from you now

You said "Proceed with Option C." Most of Option C is already executed (wipe + normalize + importer dual-write). The remaining gates are:

1. Re-import your bundle (your action)
2. Confirm — then I run verification queries
3. Switch app code to read UUID columns
4. Apply Phase 3 cutover SQL above

Reply with one of:
- **"Import done"** → I run verification, then switch app code, then apply Phase 3.
- **"Bundle uses slug X for math"** → I add a slug alias map to the importer first.
- **"Skip re-import for now, switch app code only"** → I update app code to read UUID columns; Phase 3 stays pending until import.

