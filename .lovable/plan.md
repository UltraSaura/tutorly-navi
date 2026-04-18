

## Verified mapping: Supabase ↔ App ↔ bundle.json

I cross-checked the live DB schema, the edge function (`import-curriculum-bundle`), and how the app reads objectives/success criteria. Everything aligns. Here is the canonical bundle.json shape and the field-by-field mapping.

### Current DB state (confirmed)
- `subjects`: 5 rows. **Slugs already in DB**: `francais`, `geography`, `history`, `mathematics`, `physics`. Your bundle MUST use these exact slugs (or a UUID matching one of these IDs).
- `domains`: 1 row, `subdomains`: 1, `objectives`: 1, `success_criteria`: 1, `tasks/topics/links/lessons`: 0. (Effectively empty — clean re-import is safe.)

### The 8 sections of bundle.json

```json
{
  "subjects": [...],
  "domains": [...],
  "subdomains": [...],
  "objectives": [...],
  "success_criteria": [...],
  "tasks": [...],
  "topic_objective_links": [...],
  "lessons": [...]
}
```

Every entity needs a pre-generated UUID for `id`. Foreign keys reference those UUIDs.

### Field-by-field mapping

**1. subjects**

| bundle field | DB column | required | notes |
|---|---|---|---|
| `id` | `subjects.id` (uuid) | yes | UUID. Use existing ID if subject exists, else new |
| `slug` | `subjects.slug` | yes | Must match one of: `mathematics`, `physics`, `francais`, `history`, `geography` |
| `name` | `subjects.name` | yes | Display name |
| `language` | `subjects.language` | no | defaults `'en'` |
| `color_scheme` | `subjects.color_scheme` | no | defaults `'blue'` |
| `icon_name` | `subjects.icon_name` | no | defaults `'BookOpen'` |

**2. domains**

| bundle field | DB column | required |
|---|---|---|
| `id` | `domains.id` (uuid) | yes |
| `subject_id` | `domains.subject_id` (uuid) | yes — FK to subjects.id |
| `code` | `domains.code` | yes — short stable code, e.g. `"NUMBERS"` |
| `label` | `domains.label` | yes — human label |
| `domain` | `domains.domain` (legacy NOT NULL) | importer auto-fills with `code` if omitted |

**3. subdomains**

| bundle field | DB column | required |
|---|---|---|
| `id` | `subdomains.id_new` (uuid) | yes |
| `subject_id` | `subdomains.subject_id` (uuid) | yes |
| `domain_id` | `subdomains.domain_id_new` (uuid) | yes — FK to domains.id |
| `code` | `subdomains.code` | yes |
| `label` | `subdomains.label` | yes |
| `subdomain` | `subdomains.subdomain` (legacy NOT NULL) | importer auto-fills with `label` if omitted |

**4. objectives**

| bundle field | DB column | required |
|---|---|---|
| `id` | `objectives.id_new` (uuid) | yes |
| `legacy_id` | `objectives.id` (text PK) | optional — if omitted, importer uses the UUID as text PK |
| `subject_id` | `objectives.subject_id_uuid` | yes |
| `domain_id` | `objectives.domain_id_uuid` | yes |
| `subdomain_id` | `objectives.subdomain_id_uuid` | yes |
| `level` | `objectives.level` | yes — e.g. `"CM1"` |
| `text` | `objectives.text` | yes |
| `notes_from_prog` | `objectives.notes_from_prog` | no |
| `keywords` | `objectives.keywords` (text[]) | no |
| `domain`, `subdomain` | legacy text labels | optional, helpful for display fallback |

**5. success_criteria**

| bundle field | DB column | required |
|---|---|---|
| `id` | `success_criteria.id_new` (uuid) | yes |
| `legacy_id` | `success_criteria.id` (text PK) | optional |
| `objective_id` | `success_criteria.objective_id_uuid` | yes — UUID of parent objective |
| `text` | `success_criteria.text` | yes |
| `subject_id`, `domain_id`, `subdomain_id` | mirrored UUID FKs | recommended (importer copies from objective if omitted? — no, pass them) |

**6. tasks**

| bundle field | DB column | required |
|---|---|---|
| `id` | `tasks.id_new` (uuid) | yes |
| `legacy_id` | `tasks.id` (text PK) | optional |
| `success_criterion_id` | `tasks.success_criterion_id_uuid` | yes |
| `type` | `tasks.type` | yes — e.g. `"mcq"`, `"open"` |
| `stem` | `tasks.stem` | yes |
| `solution`, `rubric`, `difficulty`, `tags`, `source` | matching cols | optional |

**7. topic_objective_links** (only if you're linking objectives to existing topics)

| bundle field | DB column | required |
|---|---|---|
| `topic_id` | `topic_objective_links.topic_id` (uuid) | yes — must match an existing `topics.id` |
| `objective_id` | `topic_objective_links.objective_id_uuid` | yes — UUID of objective |
| `order_index` | `order_index` | no, defaults 0 |

**8. lessons**

| bundle field | DB column | required |
|---|---|---|
| `id` | `lessons.id_new` (uuid) | yes |
| `legacy_id` | `lessons.id` (text PK) | optional |
| `topic_id` | `lessons.topic_id` (uuid) | optional |
| `title` | `lessons.title` | yes |
| `objective_ids`, `success_criterion_ids` | jsonb arrays | no |
| `materials`, `misconceptions`, `teacher_talk`, `student_worksheet` | text | no |

### App-side alignment (already correct)
- `useObjectives` (CurriculumManager) reads `objectives.*` + nested `success_criteria(*)` — works as long as `success_criteria.objective_id` (text PK) matches `objectives.id`. The importer guarantees this when you pass `legacy_id` consistently, OR keeps both sides UUID-as-text.
- `useTopicObjectives` reads `topic_objective_links.objective_id` (text) — also satisfied by dual-write.
- `src/types/curriculum.ts` already matches these field names.

### Minimal sanity rules for your transformer
1. Pre-generate UUIDs for every `subjects/domains/subdomains/objectives/success_criteria/tasks/lessons` row.
2. Wire FKs by UUID, never by text codes.
3. Subject slug must be one of the 5 above (or pass an existing subject `id`).
4. `topic_id` in links/lessons must reference UUIDs that exist in the `topics` table — if you don't have those yet, omit `topic_objective_links` and `lessons.topic_id`.

### Example minimal bundle.json (1 of each)
```json
{
  "subjects": [
    {"id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de", "slug": "mathematics", "name": "Mathematics", "language": "en"}
  ],
  "domains": [
    {"id": "11111111-1111-1111-1111-111111111111", "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de", "code": "NUMBERS", "label": "Numbers and operations"}
  ],
  "subdomains": [
    {"id": "22222222-2222-2222-2222-222222222222", "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de", "domain_id": "11111111-1111-1111-1111-111111111111", "code": "FRAC", "label": "Fractions"}
  ],
  "objectives": [
    {"id": "33333333-3333-3333-3333-333333333333", "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de", "domain_id": "11111111-1111-1111-1111-111111111111", "subdomain_id": "22222222-2222-2222-2222-222222222222", "level": "CM1", "text": "Compare two simple fractions"}
  ],
  "success_criteria": [
    {"id": "44444444-4444-4444-4444-444444444444", "objective_id": "33333333-3333-3333-3333-333333333333", "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de", "domain_id": "11111111-1111-1111-1111-111111111111", "subdomain_id": "22222222-2222-2222-2222-222222222222", "text": "Identify the larger of 1/2 vs 1/3"}
  ],
  "tasks": [],
  "topic_objective_links": [],
  "lessons": []
}
```

### What I'll do next (if you approve)
Nothing to code — this is a documentation/verification answer. After you approve, I'll:
1. Save this mapping as a memory (`mem://technical/curriculum/bundle-mapping`) so future sessions never drift.
2. Add a short `BUNDLE_FORMAT.md` in `curriculum-import/` with the table above so your transformer author has a single reference file.

Reply with one of:
- **"Save it"** → memory + reference doc
- **"Just memory"** → memory only
- **"No save"** → skip persistence, mapping is in chat

