# Bundle object reference

Strict, copy-pasteable definitions for every object inside `bundle.json`. Cross-checked against the live Supabase schema and the `import-curriculum-bundle` edge function.

Three parts:

- **Part A** — typed schema snippets (one per array)
- **Part B** — a real, fully-wired working bundle you can submit as-is
- **Part C** — a field-by-field "is this required?" matrix

If you only read one section, read **Part B**.

---

## Part A — Per-entity field lists

Each entity below lists its **Required** and **Optional** fields, plus a one-line **Wire-up** note explaining which sibling UUIDs it references. **Notes** call out auto-fill or legacy-column quirks where relevant.

### 1. `subjects[]`

**Required:**
- `id` — uuid v4 — reuse known UUID if subject already exists (see §4 of `BUNDLE_SCHEMA.md`)
- `slug` — string — one of: `mathematics`, `french`, `english`, `history-geography`, `sciences`
- `name` — string — display name
- `country_code` — string — lowercase ISO (`fr`, `en`, `us`). Drives viewer filtering.

**Optional:**
- `language` — string — defaults to `'en'`
- `color_scheme` — string — defaults to `'blue'`
- `icon_name` — string — lucide-react icon name, defaults to `'BookOpen'`

**Wire-up:** root entity, no FKs.

---

### 2. `domains[]`

**Required:**
- `id` — uuid v4 — primary key
- `subject_id` — uuid — FK → `subjects.id`
- `code` — string — short uppercase code, e.g. `"NUMBERS"`
- `label` — string — display label

**Optional:** none.

**Wire-up:** belongs to one `subject`.

**Notes:** the legacy NOT NULL column `domain` is auto-filled from `code` by the importer — do not send it.

---

### 3. `subdomains[]`

**Required:**
- `id` — uuid v4 — stored as `subdomains.id_new`; this is the real FK target used by objectives/tasks
- `subject_id` — uuid — FK → `subjects.id`
- `domain_id` — uuid — FK → `domains.id`
- `code` — string — short code, e.g. `"FRAC"`
- `label` — string — display label

**Optional:** none.

**Wire-up:** belongs to one `subject` and one `domain`.

**Notes:** the legacy NOT NULL column `subdomain` is auto-filled from `label` by the importer.

---

### 4. `objectives[]`

**Required:**
- `id` — uuid v4 — stored as `objectives.id_new`
- `subject_id` — uuid — FK → `subjects.id`
- `domain_id` — uuid — FK → `domains.id`
- `subdomain_id` — uuid — FK → `subdomains.id` (matches `id_new`)
- `level` — enum string — one of: `cp`, `ce1`, `ce2`, `cm1`, `cm2`, `6eme`, `5eme`, `4eme`, `3eme` (lowercase canonical only)
- `text` — string — single-sentence learning objective

**Optional:**
- `notes_from_prog` — string — defaults to `''`
- `keywords` — string[] — defaults to `[]`

**Wire-up:** belongs to one `subdomain` (and transitively a `domain` + `subject`).

---

### 5. `success_criteria[]`

**Required:**
- `id` — uuid v4 — stored as `success_criteria.id_new`
- `objective_id` — uuid — FK → `objectives.id` (matches `id_new`)
- `text` — string — single observable criterion ("Je sais …")

**Optional:**
- `subject_id` — uuid — FK → `subjects.id` (auto-derived from parent objective if omitted)
- `domain_id` — uuid — FK → `domains.id` (auto-derived)
- `subdomain_id` — uuid — FK → `subdomains.id` (auto-derived)

**Wire-up:** belongs to one `objective`. The 3 optional `*_id` fields are derived from the parent — only set them to override.

---

### 6. `tasks[]`

**Required:**
- `id` — uuid v4 — stored as `tasks.id_new`
- `success_criterion_id` — uuid — FK → `success_criteria.id` (matches `id_new`)
- `type` — enum string — one of: `mcq`, `open`, `numeric`, `short`
- `stem` — string — the question text

**Optional:**
- `solution` — string — defaults to `''`
- `rubric` — string — defaults to `''`
- `difficulty` — enum string — one of: `easy`, `core`, `stretch` (defaults to `'core'`)
- `tags` — string[] — defaults to `[]`
- `source` — enum string — one of: `manual`, `auto` (defaults to `'auto'`)
- `subject_id` — uuid — auto-derived from parent
- `domain_id` — uuid — auto-derived
- `subdomain_id` — uuid — auto-derived

**Wire-up:** belongs to one `success_criterion`. The 3 optional `*_id` fields are derived from the parent chain.

---

### 7. `topic_objective_links[]`

**Required:**
- `topic_id` — uuid — FK → `topics.id`. **Must already exist in the `topics` table** — the importer will reject unknown UUIDs.
- `objective_id` — uuid — FK → `objectives.id` (matches `id_new`)

**Optional:**
- `id` — uuid v4 — generated if omitted
- `order_index` — integer — defaults to `0`

**Wire-up:** links a pre-existing `topic` to an `objective` from this bundle.

> ⚠️ Skip this array entirely unless the referenced `topic_id` UUIDs already exist in the database.

---

### 8. `lessons[]`

**Required:**
- `id` — uuid v4 — stored as `lessons.id_new`
- `title` — string — display title

**Optional:**
- `topic_id` — uuid — FK → `topics.id` (must exist if set)
- `unit_id` — string — free-text unit reference
- `objective_ids` — uuid[] — jsonb array, defaults to `[]`
- `success_criterion_ids` — uuid[] — jsonb array, defaults to `[]`
- `materials` — string — defaults to `''`
- `misconceptions` — string — defaults to `''`
- `teacher_talk` — string — defaults to `''`
- `student_worksheet` — string — defaults to `''`

**Wire-up:** optionally references a `topic` plus arrays of `objective` and `success_criterion` UUIDs from this bundle.

**Notes:** `objective_ids` and `success_criterion_ids` are stored as jsonb arrays — pass them as plain JSON arrays of UUID strings.

---

## Part B — Real working bundle

A complete, valid `bundle.json` for **5ème · Mathematics · Numbers · Fractions**. Every UUID is lowercase v4, every FK resolves inside the bundle, and the `mathematics` subject UUID is the real one already in the database (see `BUNDLE_SCHEMA.md` §4).

```json
{
  "subjects": [
    {
      "id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "slug": "mathematics",
      "name": "Mathématiques",
      "country_code": "fr",
      "language": "fr",
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
      "code": "FRAC",
      "label": "Fractions"
    }
  ],

  "objectives": [
    {
      "id": "33333333-3333-4333-8333-333333333333",
      "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "domain_id": "11111111-1111-4111-8111-111111111111",
      "subdomain_id": "22222222-2222-4222-8222-222222222222",
      "level": "5eme",
      "text": "Comparer deux fractions simples de même dénominateur ou de dénominateurs différents",
      "notes_from_prog": "Programme officiel cycle 4 · 5e",
      "keywords": ["fractions", "comparaison", "dénominateur"]
    },
    {
      "id": "44444444-4444-4444-8444-444444444444",
      "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "domain_id": "11111111-1111-4111-8111-111111111111",
      "subdomain_id": "22222222-2222-4222-8222-222222222222",
      "level": "5eme",
      "text": "Additionner et soustraire deux fractions de même dénominateur",
      "notes_from_prog": "Programme officiel cycle 4 · 5e",
      "keywords": ["fractions", "addition", "soustraction"]
    }
  ],

  "success_criteria": [
    {
      "id": "55555555-5555-4555-8555-555555555555",
      "objective_id": "33333333-3333-4333-8333-333333333333",
      "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "domain_id": "11111111-1111-4111-8111-111111111111",
      "subdomain_id": "22222222-2222-4222-8222-222222222222",
      "text": "Je sais entourer la plus grande de deux fractions données"
    },
    {
      "id": "66666666-6666-4666-8666-666666666666",
      "objective_id": "33333333-3333-4333-8333-333333333333",
      "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "domain_id": "11111111-1111-4111-8111-111111111111",
      "subdomain_id": "22222222-2222-4222-8222-222222222222",
      "text": "Je sais expliquer ma comparaison en une phrase"
    },
    {
      "id": "77777777-7777-4777-8777-777777777777",
      "objective_id": "44444444-4444-4444-8444-444444444444",
      "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "domain_id": "11111111-1111-4111-8111-111111111111",
      "subdomain_id": "22222222-2222-4222-8222-222222222222",
      "text": "Je calcule a/n + b/n et je donne le résultat sous forme irréductible si possible"
    }
  ],

  "tasks": [
    {
      "id": "88888888-8888-4888-8888-888888888888",
      "success_criterion_id": "55555555-5555-4555-8555-555555555555",
      "type": "mcq",
      "stem": "Quelle est la plus grande fraction : 3/5 ou 2/5 ?",
      "solution": "3/5",
      "rubric": "Comparaison directe : même dénominateur, plus grand numérateur l'emporte.",
      "difficulty": "easy",
      "tags": ["fractions", "comparaison"],
      "source": "manual"
    },
    {
      "id": "99999999-9999-4999-8999-999999999999",
      "success_criterion_id": "55555555-5555-4555-8555-555555555555",
      "type": "open",
      "stem": "Compare les fractions 1/2 et 1/3. Justifie ta réponse.",
      "solution": "1/2 > 1/3 car 1/2 = 3/6 et 1/3 = 2/6",
      "rubric": "1 pt comparaison correcte + 1 pt justification (mise au même dénominateur).",
      "difficulty": "core",
      "tags": ["fractions", "comparaison", "justification"]
    },
    {
      "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "success_criterion_id": "77777777-7777-4777-8777-777777777777",
      "type": "numeric",
      "stem": "Calcule 2/7 + 3/7. Donne ta réponse sous forme de fraction.",
      "solution": "5/7",
      "rubric": "Réponse exacte uniquement.",
      "difficulty": "core",
      "tags": ["fractions", "addition"]
    },
    {
      "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "success_criterion_id": "77777777-7777-4777-8777-777777777777",
      "type": "short",
      "stem": "Calcule 5/8 - 1/8 et simplifie.",
      "solution": "1/2",
      "rubric": "1 pt calcul (4/8) + 1 pt simplification (1/2).",
      "difficulty": "stretch",
      "tags": ["fractions", "soustraction", "simplification"]
    }
  ],

  "topic_objective_links": [],
  "lessons": []
}
```

> `topic_objective_links` and `lessons` are intentionally empty — neither is required, and `topic_objective_links` would need pre-existing `topics.id` UUIDs which we don't have for this example.

---

## Part C — Field decision matrix

| Entity | Field | Required | Notes |
|---|---|---|---|
| `subjects` | `id` | ✅ | Reuse from `BUNDLE_SCHEMA.md` §4 if the subject already exists |
| `subjects` | `slug` | ✅ | One of the 5 known slugs |
| `subjects` | `name` | ✅ | Display name |
| `subjects` | `country_code` | ✅ | Lowercase ISO. Drives viewer filtering |
| `subjects` | `language` | ⬜ | Defaults to `'en'` |
| `subjects` | `color_scheme` | ⬜ | Defaults to `'blue'` |
| `subjects` | `icon_name` | ⬜ | Defaults to `'BookOpen'` |
| `domains` | `id` | ✅ | UUID PK |
| `domains` | `subject_id` | ✅ | FK → `subjects.id` |
| `domains` | `code` | ✅ | Short uppercase code |
| `domains` | `label` | ✅ | Display label |
| `subdomains` | `id` | ✅ | Stored as `id_new`, real FK target |
| `subdomains` | `subject_id` | ✅ | FK → `subjects.id` |
| `subdomains` | `domain_id` | ✅ | FK → `domains.id` |
| `subdomains` | `code` | ✅ | Short code |
| `subdomains` | `label` | ✅ | Display label |
| `objectives` | `id` | ✅ | Stored as `id_new` |
| `objectives` | `subject_id` | ✅ | FK → `subjects.id` |
| `objectives` | `domain_id` | ✅ | FK → `domains.id` |
| `objectives` | `subdomain_id` | ✅ | FK → `subdomains.id` |
| `objectives` | `level` | ✅ | `cp\|ce1\|ce2\|cm1\|cm2\|6eme\|5eme\|4eme\|3eme` |
| `objectives` | `text` | ✅ | Single-sentence objective |
| `objectives` | `notes_from_prog` | ⬜ | Defaults to `''` |
| `objectives` | `keywords` | ⬜ | Defaults to `[]` |
| `success_criteria` | `id` | ✅ | Stored as `id_new` |
| `success_criteria` | `objective_id` | ✅ | FK → `objectives.id` |
| `success_criteria` | `text` | ✅ | The criterion |
| `success_criteria` | `subject_id` | ⬜ | Auto-derived from parent objective if omitted |
| `success_criteria` | `domain_id` | ⬜ | Auto-derived |
| `success_criteria` | `subdomain_id` | ⬜ | Auto-derived |
| `tasks` | `id` | ✅ | Stored as `id_new` |
| `tasks` | `success_criterion_id` | ✅ | FK → `success_criteria.id` |
| `tasks` | `type` | ✅ | `mcq\|open\|numeric\|short` |
| `tasks` | `stem` | ✅ | The question |
| `tasks` | `solution` | ⬜ | Defaults to `''` |
| `tasks` | `rubric` | ⬜ | Defaults to `''` |
| `tasks` | `difficulty` | ⬜ | `easy\|core\|stretch`, defaults `'core'` |
| `tasks` | `tags` | ⬜ | Defaults to `[]` |
| `tasks` | `source` | ⬜ | `manual\|auto`, defaults `'auto'` |
| `tasks` | `subject_id` / `domain_id` / `subdomain_id` | ⬜ | Auto-derived from parent |
| `topic_objective_links` | `id` | ⬜ | Generated if omitted |
| `topic_objective_links` | `topic_id` | ✅ | Must already exist in `topics` |
| `topic_objective_links` | `objective_id` | ✅ | FK → `objectives.id` |
| `topic_objective_links` | `order_index` | ⬜ | Defaults to `0` |
| `lessons` | `id` | ✅ | Stored as `id_new` |
| `lessons` | `title` | ✅ | Display title |
| `lessons` | `topic_id` | ⬜ | Must exist in `topics` if set |
| `lessons` | `unit_id` | ⬜ | Free-text unit reference |
| `lessons` | `objective_ids` | ⬜ | jsonb array of UUIDs, defaults `[]` |
| `lessons` | `success_criterion_ids` | ⬜ | jsonb array of UUIDs, defaults `[]` |
| `lessons` | `materials` / `misconceptions` / `teacher_talk` / `student_worksheet` | ⬜ | All default to `''` |

---

## Validation reflexes (before submitting)

1. Every `*_id` value is a lowercase v4 UUID.
2. Every FK in this bundle resolves to an `id` in a sibling array (or to a known UUID from `BUNDLE_SCHEMA.md` §4).
3. `level` values are lowercase canonical codes (`5eme`, not `5ème` or `5EME`).
4. `tasks.type`, `tasks.difficulty`, `tasks.source` use only the listed enum values.
5. `topic_objective_links` is empty unless the `topic_id` UUIDs already exist in the `topics` table.
