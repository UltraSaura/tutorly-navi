

## Goal
Auto-generate **Topics** in the Learning Content database from the curriculum objectives that were imported, so admins don't have to hand-create one Topic per (level × subdomain). Each generated Topic is also pre-linked to all of its source objectives via `topic_objective_links`.

## Why this works
The objectives import already populated:
- 70 objectives across **35 unique (level, subdomain) pairs** (e.g. `cm1 × FRACTIONS`, `6eme × OPERATIONS`, …).
- Each objective carries `level`, `subject_id_uuid`, `domain_id_uuid`, `subdomain_id_uuid`, plus a human label via the linked `subdomains` table.

A natural Topic = one (level, subdomain). With the current import, that's ~35 ready-made topics — each with its objectives already attached.

Currently the database has **1 topic** ("Fraction") and **0 topic↔objective links**, confirming this is greenfield, not a re-import problem.

## What gets built

### 1. Edge function `generate-topics-from-objectives`
Admin-only (verifies caller has `admin` role). Inputs (all optional):
- `country_code` (defaults to `fr`)
- `level_code` (e.g. `cm1`; if omitted, processes every level present in `objectives`)
- `subject_id_uuid` (if omitted, processes every subject present in `objectives`)
- `category_id` — required: which `learning_categories` row to attach the new topics to (the topics table needs this for the existing learning UI to find them).
- `dry_run` (default `true`) — returns the preview list of topics it *would* create without writing.

Logic:
1. Read distinct `(level, subject_id_uuid, domain_id_uuid, subdomain_id_uuid)` tuples from `objectives`, filtered by inputs.
2. For each tuple, look up the human label from `subdomains.subdomain` (or fall back to `subdomains.code` cleaned up).
3. Build a Topic row:
   - `name` = subdomain label (e.g. "Fractions", "Opérations")
   - `slug` = lowercased, ascii-folded, kebab-cased `{level}-{subdomain-code}` (unique within category)
   - `category_id` = provided category
   - `curriculum_country_code`, `curriculum_level_code`, `curriculum_subject_id_uuid`, `curriculum_domain_id_uuid`, `curriculum_subdomain_id_uuid` = the tuple values
   - `is_active = true`, `order_index` = sequential per (level, domain)
4. **Upsert** on `(curriculum_level_code, curriculum_subdomain_id_uuid, category_id)` so re-runs are idempotent — never duplicates a topic.
5. For every objective belonging to that tuple, insert a `topic_objective_links` row (`topic_id`, `objective_id_uuid`, `objective_id`, `order_index`) using the existing `(topic_id, objective_id_uuid)` unique constraint for idempotency.
6. Return `{ created: N, skipped_existing: M, links_added: K, topics: [...] }`.

Safety: wraps writes in chunked upserts (matches the import-curriculum-bundle pattern).

### 2. Schema tweak (one-line migration)
Add a partial unique index so the upsert key works:
```
CREATE UNIQUE INDEX IF NOT EXISTS topics_curriculum_subdomain_unique
  ON topics (curriculum_level_code, curriculum_subdomain_id_uuid, category_id)
  WHERE curriculum_subdomain_id_uuid IS NOT NULL;
```
Existing manually-created topics without `curriculum_subdomain_id_uuid` are unaffected (they fail the `WHERE` clause).

### 3. Admin UI: "Generate Topics from Objectives" button
Location: `src/components/admin/LearningContentManagement.tsx` → **Topics** tab, top-right of `TopicManager`.

Dialog flow:
1. **Step 1 — Filters**: country (default `fr`), level dropdown (all levels with objectives, or "All"), subject dropdown (subjects with objectives, or "All"), category dropdown (required, from `learning_categories`).
2. **Step 2 — Preview**: hits the edge function with `dry_run: true`. Shows a table: Level | Subject | Domain | Subdomain (= proposed Topic name) | # objectives | Status (`will create` / `already exists`).
3. **Step 3 — Confirm**: re-calls with `dry_run: false`. Shows summary toast `Created 34 topics, 1 skipped, linked 70 objectives`. Invalidates the topics query so they appear in the list.

### Edge cases handled
- A subdomain with **0 objectives** → not generated (nothing to teach).
- An objective with `subdomain_id_uuid IS NULL` → reported in preview as "Skipped: orphan objective", not silently dropped.
- Re-running after a new bundle import → only new (level, subdomain) pairs become topics; existing ones get any newly-imported objectives linked.
- The label fallback chain is `subdomains.subdomain` → `subdomains.label` → `subdomains.code` → `"Subdomain {short-uuid}"`. The admin can rename topics afterward in the existing Topic editor — names are not re-derived on subsequent runs.

## Files touched
- **New**: `supabase/functions/generate-topics-from-objectives/index.ts`
- **New migration**: partial unique index on `topics`
- **New**: `src/components/admin/learning/GenerateTopicsFromObjectivesDialog.tsx`
- **New**: `src/hooks/useGenerateTopicsFromObjectives.ts` (thin invoke wrapper, dry-run + commit modes)
- **Edit**: `src/components/admin/learning/TopicManager.tsx` — add "Generate from Objectives" button that opens the dialog

No changes to the student-facing learning UI: once topics exist with curriculum codes set, the existing `useLearningSubjects` / `useStudentCurriculum` hooks pick them up automatically.

## Out of scope (ask later if needed)
- Auto-creating **categories** from domains (we require admin to pick a category — categories carry icons/colors for the student UI that shouldn't be guessed).
- Auto-creating videos/quizzes for each new topic (separate AI generation feature, already exists for quizzes).
- Translating subdomain codes to nice multilingual names — current admin can rename in-place after generation.

