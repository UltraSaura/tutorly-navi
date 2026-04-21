# bundle.json format reference

The `import-curriculum-bundle` edge function consumes a single JSON file with 8 sections. Every entity uses **pre-generated UUIDs**; foreign keys reference those UUIDs.

## Existing subject slugs (must reuse)
`mathematics`, `physics`, `francais`, `history`, `geography`

## Top-level shape

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

## Field-by-field mapping

### 1. subjects
| field | DB column | required | notes |
|---|---|---|---|
| `id` | `subjects.id` (uuid) | yes | reuse existing UUID if subject exists |
| `slug` | `subjects.slug` | yes | one of the 5 above |
| `name` | `subjects.name` | yes | display name |
| `language` | `subjects.language` | no | defaults `'en'` |
| `color_scheme` | `subjects.color_scheme` | no | defaults `'blue'` |
| `icon_name` | `subjects.icon_name` | no | defaults `'BookOpen'` |

### 2. domains
| field | DB column | required |
|---|---|---|
| `id` | `domains.id` (uuid) | yes |
| `subject_id` | `domains.subject_id` (uuid FK) | yes |
| `code` | `domains.code` | yes — e.g. `"NUMBERS"` |
| `label` | `domains.label` | yes |
| `domain` | `domains.domain` (legacy NOT NULL) | importer auto-fills with `code` if omitted |

### 3. subdomains
| field | DB column | required |
|---|---|---|
| `id` | `subdomains.id_new` (uuid) | yes |
| `subject_id` | `subdomains.subject_id` (uuid) | yes |
| `domain_id` | `subdomains.domain_id_new` (uuid FK) | yes |
| `code` | `subdomains.code` | yes |
| `label` | `subdomains.label` | yes |
| `subdomain` | `subdomains.subdomain` (legacy NOT NULL) | auto-filled with `label` if omitted |

### 4. objectives
| field | DB column | required |
|---|---|---|
| `id` | `objectives.id_new` (uuid) | yes |
| `legacy_id` | `objectives.id` (text PK) | optional — defaults to UUID-as-text |
| `subject_id` | `objectives.subject_id_uuid` | yes |
| `domain_id` | `objectives.domain_id_uuid` | yes |
| `subdomain_id` | `objectives.subdomain_id_uuid` | yes |
| `level` | `objectives.level` | yes — e.g. `"CM1"` |
| `text` | `objectives.text` | yes |
| `notes_from_prog` | `objectives.notes_from_prog` | no |
| `keywords` | `objectives.keywords` (text[]) | no |
| `domain`, `subdomain` | legacy display labels | optional |

### 5. success_criteria
| field | DB column | required |
|---|---|---|
| `id` | `success_criteria.id_new` (uuid) | yes |
| `legacy_id` | `success_criteria.id` (text PK) | optional |
| `objective_id` | `success_criteria.objective_id_uuid` | yes |
| `text` | `success_criteria.text` | yes |
| `subject_id`, `domain_id`, `subdomain_id` | mirrored UUID FKs | recommended |

### 6. tasks
| field | DB column | required |
|---|---|---|
| `id` | `tasks.id_new` (uuid) | yes |
| `legacy_id` | `tasks.id` (text PK) | optional |
| `success_criterion_id` | `tasks.success_criterion_id_uuid` | yes |
| `type` | `tasks.type` | yes — e.g. `"mcq"`, `"open"` |
| `stem` | `tasks.stem` | yes |
| `solution`, `rubric`, `difficulty`, `tags`, `source` | matching cols | optional |

### 7. topic_objective_links
Only include if linking to existing topics.
| field | DB column | required |
|---|---|---|
| `topic_id` | `topic_objective_links.topic_id` (uuid) | yes — must exist in `topics` |
| `objective_id` | `topic_objective_links.objective_id_uuid` | yes |
| `order_index` | `order_index` | no, defaults `0` |

### 8. lessons
| field | DB column | required |
|---|---|---|
| `id` | `lessons.id_new` (uuid) | yes |
| `legacy_id` | `lessons.id` (text PK) | optional |
| `topic_id` | `lessons.topic_id` (uuid) | optional |
| `title` | `lessons.title` | yes |
| `objective_ids`, `success_criterion_ids` | jsonb arrays | no |
| `materials`, `misconceptions`, `teacher_talk`, `student_worksheet` | text | no |

## Sanity rules
1. Pre-generate UUIDs for every entity; wire FKs by UUID, never by text codes.
2. Subject `slug` must match one of the 5 above (or pass an existing subject `id`).
3. Omit `topic_objective_links` and `lessons.topic_id` if topic UUIDs don't exist yet.
4. The app reads via legacy text PK — pass `legacy_id` consistently or let the importer use UUID-as-text on both sides of the join.

## Minimal example

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

## Importing
Upload the file at `/admin/curriculum` (Curriculum Manager). The edge function `import-curriculum-bundle` chunks at 100 rows, dual-writes UUID + legacy columns, and returns a `ready_for_phase_3` flag plus per-table NULL-FK counts.
