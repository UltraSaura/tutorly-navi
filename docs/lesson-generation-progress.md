# Staging lesson-generation progress

This document describes the isolated `staging_draft` workflow used by the admin staging lesson-version pages and the staging terminal runner.

## Request lifecycle

1. The caller supplies one or more explicit topic UUIDs. Topic titles are display context only; generation never searches by title.
2. The protected `generate-lesson-content` Edge Function receives `mode: "staging_draft"` and one topic UUID.
3. The function requests exactly one level at a time, in order from level 1 through level 4. A level may make one bounded second request only when the first response is empty, truncated, malformed, or ambiguous JSON; schema and pedagogical failures are never retried.
4. Each level is parsed and validated before the next level is requested. The provider receives a compact, strict object contract for five blocks (`concept`, `concept`, `guided_example`, `student_try`, `mastery_check`). The application then assembles the four validated level objects deterministically; it never invents missing educational fields.
5. The four validated levels are assembled and validated again as one lesson.
6. Only after all four levels pass does the admin client or terminal runner insert one `draft` row in `topic_lesson_versions`.

The staging function never updates `topics.lesson_content`. A successful run therefore has `databaseWrite: true` only for the new lesson-version draft, while `topicLessonContentUnchanged: true` confirms the topic row was not overwritten.

## Response and progress envelope

Every response carries the same `requestId` in JSON and the `x-request-id` response header. CORS exposes that header. Successful staging responses also carry:

- `providerCalls` is at least 4 and equals the sum of the per-level calls; bounded JSON retries are reported separately as `retryCount` and `retryCategory`.
- `build` and `promptVersion` markers;
- aggregate `validation`;
- `progress` and `levelResults`, each ordered from level 1 to level 4;
- `topic_id` and the validated `lesson_content`.

Each per-level result contains, when available:

- `level` and `status` (`complete` or `failed`);
- `providerCalls` (one for a completed provider level);
- canonical, pedagogical, prerequisite, geometry, and interaction validation booleans;
- field-level issue arrays and safe diagnostic strings;
- provider token usage;
- `requestId`, `promptVersion`, and `build`.

The explicit prerequisite result is separate from canonical validation. A valid staging prerequisite uses the modern contract:

```json
{
  "type": "numeric",
  "prompt": "...",
  "expected_answer": 12
}
```

Provider output with legacy `check_question` or `answer_type` fields is rejected. The normalizer does not rename fields, infer answers, or rewrite invalid educational content.

DeepSeek's `response_format: { "type": "json_object" }` guarantees an object-oriented response mode, not application-level schema enforcement for this nested lesson contract. The staging prompt therefore requests one compact root object, but the application remains the authority: it parses exactly one object, validates every field and visual, and only then performs deterministic five-block assembly. A malformed response is rejected or receives the single bounded JSON retry; no content is guessed.

## Persistence and safety

- A topic failure does not cancel other topics in a bundle.
- A failed level or incomplete four-level response is never saved.
- A duplicate active draft is refused before a provider request.
- A returned topic UUID must equal the requested UUID.
- Fixture topic IDs are rejected.
- Draft preview is admin-protected, read-only, and accepts only rows whose status is `draft`.
- The normal staging generation button never exposes controls that modify or delete `topics.lesson_content`.
- Legacy generation and its destructive topic-content controls are isolated and explicitly labelled as legacy.

## Forbidden operations

The staging workflow must not:

- call a production Supabase project;
- publish or validate a draft automatically;
- update, overwrite, or delete `topics.lesson_content`;
- save partial levels;
- perform retries for validation failures, repair calls, planning calls, or paid retries;
- silently select a topic by title;
- expose provider credentials, access tokens, or raw secrets in diagnostics.

Provider-free fixtures and dry-run mode may exercise the UI and validation path, but they must report `providerCalls: 0` and `databaseWrite: false`.

Provider diagnostics contain only HTTP/status metadata, finish reason, lengths, choice count, parse category, SHA-256, and syntax-error message/position. They never contain provider content, excerpts, tokens, or syntax context.
