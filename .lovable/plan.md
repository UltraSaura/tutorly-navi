

User wants a single copy-paste package for ChatGPT. I have:
1. The 5 subject UUIDs (just fetched)
2. The BUNDLE_FORMAT.md (already in repo)
3. Level codes convention (lowercase from memory)

Assemble it as one prompt block they can paste verbatim. No code changes — pure information delivery.

---

## Copy-paste package for ChatGPT

Paste everything below into ChatGPT in one message. Replace the two `[...]` placeholders with your input data and your raw input sample.

---

````
I need you to write a transformer that converts my raw curriculum data into a `bundle.json` file matching the spec below. I will upload the output via my admin web UI — no CLI involved.

═══════════════════════════════════════════════════════════════
PART 1 — EXISTING SUBJECT UUIDs (REUSE EXACTLY, DO NOT INVENT)
═══════════════════════════════════════════════════════════════

| slug          | id (uuid)                            | name        | language |
|---------------|--------------------------------------|-------------|----------|
| mathematics   | f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de | Mathematics | en       |
| physics       | 06e9c3fa-5618-436c-b781-10b39fb21698 | Physics     | en       |
| francais      | 8e5f05b5-77f9-5ccb-a064-398a25e2cdfa | Français    | fr       |
| history       | 0b206783-4f46-47e6-aea1-4adf8c905f18 | History     | en       |
| geography     | a578949a-cfac-4dab-9568-289b0f4a8029 | Geography   | en       |

═══════════════════════════════════════════════════════════════
PART 2 — VALID LEVEL CODES (LOWERCASE ONLY)
═══════════════════════════════════════════════════════════════

Primary (French system): cp, ce1, ce2, cm1, cm2
Secondary (collège):     6eme, 5eme, 4eme, 3eme
Lycée:                   2nde, 1ere, terminale

Always lowercase. Never "CM1", "6ème", or "Terminale".

═══════════════════════════════════════════════════════════════
PART 3 — BUNDLE.JSON SPEC
═══════════════════════════════════════════════════════════════

Top-level shape — exactly 8 arrays:
{
  "subjects": [...],
  "domains": [...],
  "subdomains": [...],
  "objectives": [...],
  "success_criteria": [...],
  "tasks": [...],
  "topic_objective_links": [],
  "lessons": []
}

RULES:
1. Pre-generate a UUID v4 for every entity's `id`.
2. Wire all foreign keys by UUID, never by text codes.
3. Reuse subject UUIDs from PART 1 — do not create new subjects.
4. Leave `topic_objective_links` and `lessons` as empty arrays unless I give you real `topics.id` UUIDs.

FIELD MAPPING:

— subjects (only include if you need to pass-through; usually skip and reuse) —
  id          uuid   required (use one from PART 1)
  slug        text   required (one of the 5 above)
  name        text   required
  language    text   optional (default "en")

— domains —
  id          uuid   required
  subject_id  uuid   required (FK → subjects.id from PART 1)
  code        text   required, e.g. "NUMBERS"
  label       text   required, human label

— subdomains —
  id          uuid   required
  subject_id  uuid   required
  domain_id   uuid   required (FK → domains.id)
  code        text   required
  label       text   required

— objectives —
  id              uuid   required
  subject_id      uuid   required
  domain_id       uuid   required
  subdomain_id    uuid   required
  level           text   required (lowercase, e.g. "cm1")
  text            text   required (the objective statement)
  notes_from_prog text   optional
  keywords        text[] optional

— success_criteria —
  id              uuid   required
  objective_id    uuid   required (FK → objectives.id)
  subject_id      uuid   required (mirror from parent objective)
  domain_id       uuid   required (mirror)
  subdomain_id    uuid   required (mirror)
  text            text   required

— tasks —
  id                    uuid   required
  success_criterion_id  uuid   required (FK → success_criteria.id)
  type                  text   required ("mcq" | "open" | "numeric")
  stem                  text   required
  solution              text   optional
  rubric                text   optional
  difficulty            text   optional ("core" default)
  tags                  text[] optional

═══════════════════════════════════════════════════════════════
PART 4 — MINIMAL VALID EXAMPLE (1 of each)
═══════════════════════════════════════════════════════════════

{
  "subjects": [],
  "domains": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "code": "NUMBERS",
      "label": "Numbers and operations"
    }
  ],
  "subdomains": [
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "domain_id": "11111111-1111-1111-1111-111111111111",
      "code": "FRAC",
      "label": "Fractions"
    }
  ],
  "objectives": [
    {
      "id": "33333333-3333-3333-3333-333333333333",
      "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "domain_id": "11111111-1111-1111-1111-111111111111",
      "subdomain_id": "22222222-2222-2222-2222-222222222222",
      "level": "cm1",
      "text": "Compare two simple fractions"
    }
  ],
  "success_criteria": [
    {
      "id": "44444444-4444-4444-4444-444444444444",
      "objective_id": "33333333-3333-3333-3333-333333333333",
      "subject_id": "f34e5bb1-34f0-41c8-aa3a-8f8b11f2f6de",
      "domain_id": "11111111-1111-1111-1111-111111111111",
      "subdomain_id": "22222222-2222-2222-2222-222222222222",
      "text": "Identify the larger of 1/2 vs 1/3"
    }
  ],
  "tasks": [],
  "topic_objective_links": [],
  "lessons": []
}

═══════════════════════════════════════════════════════════════
PART 5 — MY RAW INPUT
═══════════════════════════════════════════════════════════════

Subject I'm working on: [e.g. mathematics — use UUID f34e5bb1-...]
Level(s): [e.g. cm1]

Sample raw input (paste 3–5 representative rows):
[PASTE YOUR RAW DATA HERE — CSV rows, markdown program excerpt, JSON, whatever you have]

═══════════════════════════════════════════════════════════════
PART 6 — DELIVERABLE
═══════════════════════════════════════════════════════════════

Produce ONE complete `bundle.json` file. Do not split into chunks. Do not add commentary inside the JSON. After the JSON, give me a short summary of:
- # of objectives generated
- # of success criteria generated
- # of tasks generated (or "none")
- Any input rows you couldn't map and why
````

---

### What you do after ChatGPT replies
1. Save its output as `bundle.json`
2. Open `/admin/curriculum` in your app
3. Click the import card → upload `bundle.json`
4. Read the result toast — confirms counts and `ready_for_phase_3` status

That's it. No repo changes needed. The package above is everything ChatGPT requires.

