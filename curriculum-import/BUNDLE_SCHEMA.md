# Bundle JSON — Complete Schema Reference

Single source of truth for the `bundle.json` format consumed by the `import-curriculum-bundle` Supabase edge function. Upload at `/admin/curriculum`.

---

## 1. Overview

A bundle is **one JSON file** containing a full slice of curriculum content (typically one subject × one level for one country). The edge function:

- Chunks inserts at 100 rows per request.
- Dual-writes UUID columns + legacy text PKs so old and new code paths both work.
- Returns per-table NULL-FK counts and a `ready_for_phase_3` flag.
- Optionally purges existing rows for the same scope when **Replace existing data** is ticked.

Filtering in the app is **by country** (via `subjects.country_code`), not by language. `language` is a metadata tag describing the source language of the content.

---

## 2. Top-level shape

```json
{
  "subjects": [],
  "domains": [],
  "subdomains": [],
  "objectives": [],
  "success_criteria": [],
  "tasks": [],
  "topic_objective_links": [],
  "lessons": []
}
```

All 8 keys are accepted. Empty arrays are fine. Pass entities in this order conceptually — each tier references UUIDs from the tier above.

---

## 2b. Supabase target tables

This section documents the actual Postgres columns the importer writes to. Use it to understand exactly what your bundle fields land on, what the edge function fills in for you, and which columns are legacy.

### Conventions

- **Source = `bundle`** → you must set this from the bundle field of the same name.
- **Source = `auto`** → the importer derives it (from another bundle field, a default, or `gen_random_uuid()` / `now()`).
- **Source = `db default`** → Postgres default kicks in if you omit it; you may override.
- **`legacy`** flag = column predates the UUID migration. Importer still writes it for backward compatibility. New code should read the `*_uuid` / `id_new` columns instead.

### Dual-write pattern (read this first)

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

### What you provide vs. what the importer derives

You provide: UUIDs, slugs, codes, labels, text content, levels, keywords.
Importer derives: every `*_uuid` mirror column, every legacy text mirror, all `id_new` defaults, `created_at` / `updated_at`, and the legacy NOT NULL columns listed below.

### Legacy NOT NULL columns auto-filled by the importer

| Table | Column | Filled with |
|---|---|---|
| `domains` | `domain` | `code` |
| `subdomains` | `domain` | parent domain's `code` |
| `subdomains` | `subdomain` | `label` |
| `topic_objective_links` | `objective_id` | objective's `legacy_id` (or UUID-as-text) |

---

### Table 1 — `subjects`

| column | type | nullable | source | notes |
|---|---|---|---|---|
| `id` | uuid | no | bundle | Reuse from §4 for the 5 known slugs |
| `slug` | text | no | bundle | Unique. One of the 5 allowed values (or new) |
| `name` | text | no | bundle | Display name |
| `language` | text | yes | bundle | Source language tag (`'fr'`, `'en'`). Default `'en'` |
| `country_code` | text | yes | bundle | **Drives filtering in the viewer.** Lowercase ISO |
| `color_scheme` | text | no | bundle / db default | Defaults `'blue'` |
| `icon_name` | text | no | bundle / db default | Defaults `'BookOpen'` |
| `is_active` | boolean | no | db default | `true` |
| `order_index` | integer | no | db default | `0` |
| `created_at` / `updated_at` | timestamptz | no | auto | `now()` |

### Table 2 — `domains`

| column | type | nullable | source | notes |
|---|---|---|---|---|
| `id` | uuid | no | bundle | Real PK and FK target |
| `subject_id` | uuid | yes | bundle | FK → `subjects.id` |
| `code` | text | yes | bundle | Short uppercase code, e.g. `"NUMBERS"` |
| `label` | text | yes | bundle | Display label |
| `domain` | text | no | **auto** (legacy NOT NULL) | Filled with `code` if omitted |

### Table 3 — `subdomains` ⚠️ dual PK quirk

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

### Table 4 — `objectives`

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
| `level` | text | no | bundle | Lowercase canonical code (see §6) |
| `text` | text | no | bundle | Single-sentence objective |
| `notes_from_prog` | text | yes | bundle | Defaults `''` |
| `keywords` | text[] | yes | bundle | Defaults `[]` |
| `skill_id` | text | yes | unused | Reserved |

### Table 5 — `success_criteria`

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

### Table 6 — `tasks`

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

### Table 7 — `topic_objective_links`

| column | type | nullable | source | notes |
|---|---|---|---|---|
| `id` | uuid | no | auto | `gen_random_uuid()` |
| `topic_id` | uuid | no | bundle | **Must already exist in `topics`** |
| `objective_id` | text | no | **auto** (legacy NOT NULL) | Filled with objective's `legacy_id` / UUID-as-text |
| `objective_id_uuid` | uuid | yes | bundle | FK → `objectives.id_new` |
| `order_index` | integer | no | bundle / db default | Defaults `0` |
| `created_at` | timestamptz | no | auto | `now()` |

### Table 8 — `lessons`

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

---

## 3. Hard rules

1. **Pre-generate UUID v4 for every entity** (lowercase, hyphenated). Wire all foreign keys by UUID — never by code or label.
2. **Reuse existing subject UUIDs** from the table in section 4. If a subject already exists, you can leave the `subjects` array empty and just reference its `id` in your `domains`.
3. **`subjects.slug`** must be one of the 5 allowed values (see §4).
4. **`subjects.country_code`** controls which country's curriculum the subject appears under in `/admin/curriculum`. Lowercase ISO (e.g. `"fr"`).
5. **`subjects.language`** is metadata only. A French student switching the UI to English still sees the same FR-language objectives. Use `"fr"` or `"en"`.
6. **Level codes are lowercase, no accents, no spaces**: `cp`, `ce1`, `ce2`, `cm1`, `cm2`, `6eme`, `5eme`, `4eme`, `3eme`. Never `5ème`, `5e`, or `CM1`.
7. Every **objective** references `subject_id` + `domain_id` + `subdomain_id`.
8. Every **success_criterion** references an `objective_id` from the same bundle, plus mirrored `subject_id` / `domain_id` / `subdomain_id`.
9. Every **task** references a `success_criterion_id` from the same bundle, plus mirrored FKs.
10. **Skip** `topic_objective_links` and `lessons.topic_id` unless the topic UUIDs already exist in the `topics` table.
11. The bundle filename should match its content (e.g. `mathematiques_cm1_fr.json`).

---

## 4. Existing subject UUIDs (reuse these)

| slug          | id                                     | language |
|---------------|----------------------------------------|----------|
| `mathematics` | `f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de` | en       |
| `physics`     | `06e9c3fa-5618-436c-b781-10b39fb21698` | en       |
| `francais`    | `8e5f05b5-77f9-5ccb-a064-398a25e2cdfa` | fr       |
| `history`     | `0b206783-4f46-47e6-aea1-4adf8c905f18` | en       |
| `geography`   | `a578949a-cfac-4dab-9568-289b0f4a8029` | en       |

Do **not** invent new subject UUIDs for these slugs. To add a new subject (e.g. `chemistry`), include it in the `subjects` array with a freshly generated UUID.

---

## 5. Field-by-field reference

### 5.1 `subjects[]`

| field          | DB column                  | required | notes |
|----------------|----------------------------|----------|-------|
| `id`           | `subjects.id` (uuid)       | yes      | Reuse existing UUID for the 5 known slugs |
| `slug`         | `subjects.slug`            | yes      | One of the 5 allowed slugs (or new) |
| `name`         | `subjects.name`            | yes      | Display name |
| `language`     | `subjects.language`        | no       | Source language (`"fr"`, `"en"`). Metadata only |
| `country_code` | `subjects.country_code`    | recommended | Lowercase ISO (`"fr"`). Drives filtering in viewer |
| `color_scheme` | `subjects.color_scheme`    | no       | Defaults `"blue"` |
| `icon_name`    | `subjects.icon_name`       | no       | Defaults `"BookOpen"` |

### 5.2 `domains[]`

| field        | DB column                  | required | notes |
|--------------|----------------------------|----------|-------|
| `id`         | `domains.id` (uuid)        | yes      | |
| `subject_id` | `domains.subject_id`       | yes      | UUID from §4 or §5.1 |
| `code`       | `domains.code`             | yes      | Short uppercase code, e.g. `"NUMBERS"` |
| `label`      | `domains.label`            | yes      | Display label |
| `domain`     | `domains.domain` (legacy)  | no       | Auto-filled from `code` if omitted |

### 5.3 `subdomains[]`

| field        | DB column                          | required | notes |
|--------------|------------------------------------|----------|-------|
| `id`         | `subdomains.id_new` (uuid)         | yes      | |
| `subject_id` | `subdomains.subject_id`            | yes      | |
| `domain_id`  | `subdomains.domain_id_new`         | yes      | UUID FK |
| `code`       | `subdomains.code`                  | yes      | |
| `label`      | `subdomains.label`                 | yes      | |
| `subdomain`  | `subdomains.subdomain` (legacy)    | no       | Auto-filled from `label` if omitted |

### 5.4 `objectives[]`

| field             | DB column                          | required | notes |
|-------------------|------------------------------------|----------|-------|
| `id`              | `objectives.id_new` (uuid)         | yes      | |
| `legacy_id`       | `objectives.id` (text PK)          | no       | Defaults to UUID-as-text |
| `subject_id`      | `objectives.subject_id_uuid`       | yes      | |
| `domain_id`       | `objectives.domain_id_uuid`        | yes      | |
| `subdomain_id`    | `objectives.subdomain_id_uuid`     | yes      | |
| `level`           | `objectives.level`                 | yes      | Lowercase canonical code (see §6) |
| `text`            | `objectives.text`                  | yes      | Single-sentence objective |
| `notes_from_prog` | `objectives.notes_from_prog`      | no       | |
| `keywords`        | `objectives.keywords` (text[])     | no       | |

### 5.5 `success_criteria[]`

| field          | DB column                                   | required |
|----------------|---------------------------------------------|----------|
| `id`           | `success_criteria.id_new` (uuid)            | yes      |
| `legacy_id`    | `success_criteria.id` (text PK)             | no       |
| `objective_id` | `success_criteria.objective_id_uuid`        | yes      |
| `text`         | `success_criteria.text`                     | yes      |
| `subject_id`   | `success_criteria.subject_id_uuid`          | recommended |
| `domain_id`    | `success_criteria.domain_id_uuid`           | recommended |
| `subdomain_id` | `success_criteria.subdomain_id_uuid`        | recommended |

### 5.6 `tasks[]`

| field                   | DB column                                  | required | notes |
|-------------------------|--------------------------------------------|----------|-------|
| `id`                    | `tasks.id_new` (uuid)                      | yes      | |
| `legacy_id`             | `tasks.id` (text PK)                       | no       | |
| `success_criterion_id`  | `tasks.success_criterion_id_uuid`          | yes      | |
| `subject_id`, `domain_id`, `subdomain_id` | mirrored UUID FKs        | recommended | |
| `type`                  | `tasks.type`                               | yes      | `"mcq"`, `"open"`, `"numeric"`, `"short"` |
| `stem`                  | `tasks.stem`                               | yes      | Question text |
| `solution`              | `tasks.solution`                           | no       | |
| `rubric`                | `tasks.rubric`                             | no       | |
| `difficulty`            | `tasks.difficulty`                         | no       | `"easy"`, `"core"`, `"stretch"` |
| `tags`                  | `tasks.tags` (text[])                      | no       | |
| `source`                | `tasks.source`                             | no       | e.g. `"manual"`, `"auto"` |

### 5.7 `topic_objective_links[]` *(usually empty)*

Only include if you have existing topic UUIDs to link to.

| field          | DB column                                       | required |
|----------------|-------------------------------------------------|----------|
| `topic_id`     | `topic_objective_links.topic_id`                | yes — must exist in `topics` |
| `objective_id` | `topic_objective_links.objective_id_uuid`       | yes      |
| `order_index`  | `order_index`                                   | no, default `0` |

### 5.8 `lessons[]` *(usually empty)*

| field                   | DB column                          | required |
|-------------------------|------------------------------------|----------|
| `id`                    | `lessons.id_new` (uuid)            | yes      |
| `legacy_id`             | `lessons.id` (text PK)             | no       |
| `topic_id`              | `lessons.topic_id`                 | no       |
| `title`                 | `lessons.title`                    | yes      |
| `objective_ids`         | `lessons.objective_ids` (jsonb)    | no       |
| `success_criterion_ids` | `lessons.success_criterion_ids` (jsonb) | no  |
| `materials`, `misconceptions`, `teacher_talk`, `student_worksheet` | text cols | no |

---

## 6. Canonical level codes (France)

| code     | display |
|----------|---------|
| `cp`     | CP      |
| `ce1`    | CE1     |
| `ce2`    | CE2     |
| `cm1`    | CM1     |
| `cm2`    | CM2     |
| `6eme`   | 6ème    |
| `5eme`   | 5ème    |
| `4eme`   | 4ème    |
| `3eme`   | 3ème    |

These match `school_levels.level_code` exactly. Any other casing or spelling (`5ème`, `5e`, `CM1`) will create a separate orphan level.

---

## 7. Full worked example

One subject (reused) → one domain → one subdomain → one objective → one success criterion → one task.

```json
{
  "subjects": [
    {
      "id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "slug": "mathematics",
      "name": "Mathématiques",
      "language": "fr",
      "country_code": "fr",
      "color_scheme": "blue",
      "icon_name": "Calculator"
    }
  ],
  "domains": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "code": "NUMBERS",
      "label": "Nombres et calculs"
    }
  ],
  "subdomains": [
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "domain_id": "11111111-1111-4111-8111-111111111111",
      "code": "FRACTIONS",
      "label": "Fractions"
    }
  ],
  "objectives": [
    {
      "id": "33333333-3333-4333-8333-333333333333",
      "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "domain_id": "11111111-1111-4111-8111-111111111111",
      "subdomain_id": "22222222-2222-4222-8222-222222222222",
      "level": "cm1",
      "text": "Comparer deux fractions simples",
      "notes_from_prog": "Programme officiel CM1 — fractions de référence",
      "keywords": ["fraction", "comparaison"]
    }
  ],
  "success_criteria": [
    {
      "id": "44444444-4444-4444-8444-444444444444",
      "objective_id": "33333333-3333-4333-8333-333333333333",
      "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "domain_id": "11111111-1111-4111-8111-111111111111",
      "subdomain_id": "22222222-2222-4222-8222-222222222222",
      "text": "Identifier la plus grande fraction entre 1/2 et 1/3"
    }
  ],
  "tasks": [
    {
      "id": "55555555-5555-4555-8555-555555555555",
      "success_criterion_id": "44444444-4444-4444-8444-444444444444",
      "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "domain_id": "11111111-1111-4111-8111-111111111111",
      "subdomain_id": "22222222-2222-4222-8222-222222222222",
      "type": "mcq",
      "stem": "Quelle fraction est la plus grande ?",
      "solution": "1/2",
      "rubric": "1 point si la bonne fraction est choisie",
      "difficulty": "core",
      "tags": ["fraction", "comparaison"],
      "source": "manual"
    }
  ],
  "topic_objective_links": [],
  "lessons": []
}
```

---

## 8. Validation checklist

Before uploading, confirm:

- [ ] Every `id` is a unique UUID v4 (lowercase, hyphenated).
- [ ] Every FK references a UUID that exists either in this bundle or in the DB (subject UUIDs from §4).
- [ ] All `level` values match the canonical codes in §6 exactly.
- [ ] `subjects.slug` is one of the 5 allowed values.
- [ ] `subjects.country_code` is set (lowercase ISO).
- [ ] No `topic_id` references unless those topics exist.
- [ ] Every `success_criterion.objective_id` matches an `objective.id` in the bundle.
- [ ] Every `task.success_criterion_id` matches a `success_criterion.id` in the bundle.

### Common errors

| Symptom | Cause | Fix |
|---|---|---|
| `subjects: 0` in import result | Subject already exists, only referenced | ✅ Expected, not a problem |
| `success_criteria.objective_id_uuid_null > 0` | A criterion's `objective_id` doesn't match any objective in the bundle | Check UUIDs match exactly |
| New level appears as separate entry (e.g. `5e` vs `5eme`) | Inconsistent level code | Normalize to canonical code from §6 |
| `Phase 3 readiness: Not ready` with NULL counts | Stale orphan rows from old imports | Re-upload with **Replace existing data** ticked |
| FK error on import | Duplicate UUID used for two different entities | Regenerate fresh UUIDs |

---

## 9. How to upload

1. Go to **`/admin/curriculum`** (Curriculum Manager).
2. Optional: tick **"Replace existing data"** to purge orphans for the bundle's scope before inserting. Recommended when re-uploading the same subject × level.
3. Choose your `bundle.json` file → **Import**.
4. Verify the result card:
   - Per-table insert counts.
   - NULL-FK counts (should all be `0`).
   - **Phase 3 readiness: Ready** ✅.
5. Open the **Curriculum Viewer** — your new subject/level should appear filtered by country.

The new content is queried live from Supabase by the student-facing app — no rebuild required.
