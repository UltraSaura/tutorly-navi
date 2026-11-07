# Decisions

## D-001 — No blind branch overwrite

Use a temporary integration branch from `development`, merge only cleanly applicable `main` and `practice` history, and leave all remote branches untouched.

## D-002 — Deterministic first

The Lab computes and validates mathematical steps locally. AI is reserved for wording based on verified steps and is not called by the Lab MVP, preventing unapproved spend and unverifiable arithmetic.

## D-003 — Development-only surface

Expose the Lab only when `import.meta.env.DEV` is true. It is not part of production Tutor, Learn or Practice routes.
