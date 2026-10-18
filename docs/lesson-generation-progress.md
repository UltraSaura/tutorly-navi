# Staging lesson-generation progress

This document describes the isolated `staging_draft` workflow used by the admin staging lesson-version pages and the staging terminal runner.

## Request lifecycle

1. The caller supplies one or more explicit topic UUIDs. Topic titles are display context only; generation never searches by title.
2. The protected `generate-lesson-content` Edge Function receives `mode: "staging_draft"` and one topic UUID.
3. The function calls the provider exactly four times: once for each level, in order from level 1 through level 4.
4. Each level is parsed and validated before the next level is requested. The workflow has no planning call, retry call, repair call, or paid fallback call.
5. The four validated levels are assembled and validated again as one lesson.
6. Only after all four levels pass does the admin client or terminal runner insert one `draft` row in `topic_lesson_versions`.

The staging function never updates `topics.lesson_content`. A successful run therefore has `databaseWrite: true` only for the new lesson-version draft, while `topicLessonContentUnchanged: true` confirms the topic row was not overwritten.

## Response and progress envelope

Every response carries the same `requestId` in JSON and the `x-request-id` response header. CORS exposes that header. Successful staging responses also carry:

- `providerCalls: 4`;
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
- perform automatic provider retries, repair calls, or paid retries;
- silently select a topic by title;
- expose provider credentials, access tokens, or raw secrets in diagnostics.

Provider-free fixtures and dry-run mode may exercise the UI and validation path, but they must report `providerCalls: 0` and `databaseWrite: false`.
