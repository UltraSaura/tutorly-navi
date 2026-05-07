# Supabase target tables — curriculum import

This document describes the actual Postgres columns the `import-curriculum-bundle` edge function writes to. Use it alongside [`BUNDLE_SCHEMA.md`](./BUNDLE_SCHEMA.md) to understand exactly what your bundle fields land on, what the edge function fills in for you, and which columns are legacy.

---

## Conventions

- **Source = `bundle`** → you must set this from the bundle field of the same name.
- **Source = `auto`** → the importer derives it (from another bundle field, a default, or `gen_random_uuid()` / `now()`).
- **Source = `db default`** → Postgres default kicks in if you omit it; you may override.
- **`legacy`** flag = column predates the UUID migration. Importer still writes it for backward compatibility. New code should read the `*_uuid` / `id_new` columns instead.

---

## Dual-write pattern (read this first)

Most curriculum tables have **two parallel column sets**:

| Purpose | Legacy column | New column |
|---|---|---|
| Primary key | `id` (text) | `id_new` (uuid) |
| Subject FK | `subject_id` (text) | `subject_id_uuid` (uuid) |
| Domain FK | `domain_id` (text) | `domain_id_uuid` (uuid) |
| Subdomain FK | `subdomain_id` (text) | `subdomain_id_uuid` (uuid) |
| Objective FK | `objective_id` (text) | `objective_id_uuid` (uuid) |
| Success criterion FK | `success_criterion_id` (text) | `success_criterion_id_uuid` (uuid) |

The edge function writes **both columns** on every insert. Bundle authors only ever set the UUID side — the legacy text mirrors are auto-filled with the UUID-as-text.

---

## What you provide vs. what the importer derives

You provide: UUIDs, slugs, codes, labels, text content, levels, keywords.
Importer derives: every `*_uuid` mirror column, every legacy text mirror, all `id_new` defaults, `created_at` / `updated_at`, and the legacy NOT NULL columns listed below.

---

## Legacy NOT NULL columns auto-filled by the importer

| Table | Column | Filled with |
|---|---|---|
| `domains` | `domain` | `code` |
| `subdomains` | `domain` | parent domain's `code` |
| `subdomains` | `subdomain` | `label` |
| `topic_objective_links` | `objective_id` | objective's `legacy_id` (or UUID-as-text) |

---

## Table 1 — `subjects`

| column | type | nullable | source | notes |
|---|---|---|---|---|
| `id` | uuid | no | bundle | Reuse from `BUNDLE_SCHEMA.md` §4 for the 5 known slugs |
| `slug` | text | no | bundle | Unique. One of the 5 allowed values (or new) |
| `name` | text | no | bundle | Display name |
| `language` | text | yes | bundle | Source language tag (`'fr'`, `'en'`). Default `'en'` |
| `country_code` | text | yes | bundle | **Drives filtering in the viewer.** Lowercase ISO |
| `color_scheme` | text | no | bundle / db default | Defaults `'blue'` |
| `icon_name` | text | no | bundle / db default | Defaults `'BookOpen'` |
| `is_active` | boolean | no | db default | `true` |
| `order_index` | integer | no | db default | `0` |
| `created_at` / `updated_at` | timestamptz | no | auto | `now()` |

## Table 2 — `domains`

| column | type | nullable | source | notes |
|---|---|---|---|---|
| `id` | uuid | no | bundle | Real PK and FK target |
| `subject_id` | uuid | yes | bundle | FK → `subjects.id` |
| `code` | text | yes | bundle | Short uppercase code, e.g. `"NUMBERS"` |
| `label` | text | yes | bundle | Display label |
| `domain` | text | no | **auto** (legacy NOT NULL) | Filled with `code` if omitted |

## Table 3 — `subdomains` ⚠️ dual PK quirk

| column | type | nullable | source | notes |
|---|---|---|---|---|
| `id` | bigint | no | auto (sequence) | **Legacy** auto-increment PK |
| `id_new` | uuid | no | bundle | **Real FK target** for objectives. Conflict target on upsert |
| `subject_id` | uuid | yes | bundle | FK → `subjects.id` |
| `domain_id_new` | uuid | yes | bundle (`domain_id`) | FK → `domains.id` |
| `code` | text | yes | bundle | |
| `label` | text | yes | bundle | |
| `domain` | text | yes | auto (legacy) | Parent domain's `code` |
| `subdomain` | text | no | **auto** (legacy NOT NULL) | Filled with `label` if omitted |

## Table 4 — `objectives`

| column | type | nullable | source | notes |
|---|---|---|---|---|
| `id` | text | no | bundle (`legacy_id`) / auto | Legacy text PK. Defaults to UUID-as-text |
| `id_new` | uuid | no | bundle (`id`) | New UUID PK |
| `subject_id` | text | yes | auto (legacy mirror) | UUID-as-text |
| `subject_id_uuid` | uuid | yes | bundle | FK → `subjects.id` |
| `domain` | text | yes | auto (legacy display) | |
| `domain_id` | text | yes | auto (legacy mirror) | |
| `domain_id_uuid` | uuid | yes | bundle | FK → `domains.id` |
| `subdomain` | text | no | auto (legacy display) | Parent subdomain's `label` |
| `subdomain_id` | text | yes | auto (legacy mirror) | |
| `subdomain_id_uuid` | uuid | yes | bundle | FK → `subdomains.id_new` |
| `level` | text | no | bundle | Lowercase canonical code (see `BUNDLE_SCHEMA.md` §6) |
| `text` | text | no | bundle | Single-sentence objective |
| `notes_from_prog` | text | yes | bundle | Defaults `''` |
| `keywords` | text[] | yes | bundle | Defaults `[]` |
| `skill_id` | text | yes | unused | Reserved |

## Table 5 — `success_criteria`

| column | type | nullable | source | notes |
|---|---|---|---|---|
| `id` | text | no | bundle (`legacy_id`) / auto | Legacy text PK |
| `id_new` | uuid | no | bundle (`id`) | New UUID PK |
| `objective_id` | text | yes | auto (legacy mirror) | |
| `objective_id_uuid` | uuid | yes | bundle | FK → `objectives.id_new` |
| `text` | text | no | bundle | |
| `subject_id` / `subject_id_uuid` | text / uuid | yes | bundle (UUID) + auto mirror | |
| `domain_id` / `domain_id_uuid` | text / uuid | yes | bundle (UUID) + auto mirror | |
| `subdomain_id` / `subdomain_id_uuid` | text / uuid | yes | bundle (UUID) + auto mirror | |
| `skill_id` | text | yes | unused | Reserved |

## Table 6 — `tasks`

| column | type | nullable | source | notes |
|---|---|---|---|---|
| `id` | text | no | bundle (`legacy_id`) / auto | Legacy text PK |
| `id_new` | uuid | no | bundle (`id`) | New UUID PK |
| `success_criterion_id` | text | yes | auto (legacy mirror) | |
| `success_criterion_id_uuid` | uuid | yes | bundle | FK → `success_criteria.id_new` |
| `type` | text | no | bundle | `mcq` \| `open` \| `numeric` \| `short` |
| `stem` | text | no | bundle | Question text |
| `solution` | text | yes | bundle | Defaults `''` |
| `rubric` | text | yes | bundle | Defaults `''` |
| `difficulty` | text | yes | bundle / db default | Defaults `'core'` |
| `tags` | text[] | yes | bundle | Defaults `[]` |
| `source` | text | yes | bundle / db default | Defaults `'auto'` |
| `subject_id` / `subject_id_uuid` | text / uuid | yes | bundle (UUID) + auto mirror | |
| `domain_id` / `domain_id_uuid` | text / uuid | yes | bundle (UUID) + auto mirror | |
| `subdomain_id` / `subdomain_id_uuid` | text / uuid | yes | bundle (UUID) + auto mirror | |
| `skill_id` | text | yes | unused | Reserved |

## Table 7 — `topic_objective_links`

| column | type | nullable | source | notes |
|---|---|---|---|---|
| `id` | uuid | no | auto | `gen_random_uuid()` |
| `topic_id` | uuid | no | bundle | **Must already exist in `topics`** |
| `objective_id` | text | no | **auto** (legacy NOT NULL) | Filled with objective's `legacy_id` / UUID-as-text |
| `objective_id_uuid` | uuid | yes | bundle | FK → `objectives.id_new` |
| `order_index` | integer | no | bundle / db default | Defaults `0` |
| `created_at` | timestamptz | no | auto | `now()` |

## Table 8 — `lessons`

| column | type | nullable | source | notes |
|---|---|---|---|---|
| `id` | text | no | bundle (`legacy_id`) / auto | Legacy text PK |
| `id_new` | uuid | no | bundle (`id`) | New UUID PK |
| `title` | text | no | bundle | |
| `topic_id` | uuid | yes | bundle | Must exist in `topics` if set |
| `unit_id` | text | yes | bundle | Optional |
| `objective_ids` | jsonb | no | bundle | Defaults `[]` |
| `success_criterion_ids` | jsonb | no | bundle | Defaults `[]` |
| `materials` | text | yes | bundle | Defaults `''` |
| `misconceptions` | text | yes | bundle | Defaults `''` |
| `teacher_talk` | text | yes | bundle | Defaults `''` |
| `student_worksheet` | text | yes | bundle | Defaults `''` |
