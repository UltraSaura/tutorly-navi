# Decisions

## D-001 — No blind branch overwrite

Use a temporary integration branch from `development`, merge only cleanly applicable `main` and `practice` history, and leave all remote branches untouched.

## D-002 — Deterministic first

The Lab computes and validates mathematical steps locally. AI is reserved for wording based on verified steps and is not called by the Lab MVP, preventing unapproved spend and unverifiable arithmetic.

## D-003 — Development-only surface

Expose the Lab only when `import.meta.env.DEV` is true. It is not part of production Tutor, Learn or Practice routes.

## D-004 — Preserve TwoCards for children under 11

The original animated TwoCards explanation remains the primary explanation
experience for children under 11. Explain V2 is a separate experience and is
not substituted into existing lesson, practice, guardian, history, or chat
surfaces.

The selection policy is implemented in
`src/features/explanations/explanationMode.ts`:

- `auto` keeps under-11 learners on TwoCards.
- Existing lesson callers set `legacyLesson: true`, which keeps TwoCards for
  every age until the product owner approves migration.
- V2 is selected automatically only for a new, non-legacy experience for an
  older learner.
- An under-11 exception requires an explicit V2 request and a documented need
  for conventional notation.

This policy is currently covered by unit tests but is not wired into the
production lesson modal. That is intentional: no existing lesson is migrated
by this architectural decision.
