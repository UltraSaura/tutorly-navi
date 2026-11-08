# Architectural Decision Record — TwoCards and Explain V2

Date: 2026-11-08  
Status: Accepted by product owner; implementation boundary in force  
Scope: Explanation Lab / TwoCards explanation surfaces

## Decision

Keep the original animated TwoCards experience as the primary explanation
system for learners under 11. Explain V2 remains a separate development
experience for older learners and is not automatically integrated into Tutor,
Learn, Practice, history, guardian, or chat flows.

## Original TwoCards inventory

### Presentation components

- `src/features/explanations/ExplanationModal.tsx` — modal shell, loading,
  retry, feedback, and generated-practice handoff.
- `src/features/explanations/TwoCards.tsx` — established lesson explanation
  composition; selects the kid/student learning mode, preserves legacy sections,
  and provides the under-11 interactive arithmetic branch.
- `src/features/explanations/ExplanationRenderer.tsx` — dispatches `kid`
  explanations to the progressive renderer and other explanations to cards.
- `src/components/kids/KidExplanationFlow.tsx` — progressive child flow with
  next/previous navigation, completion, guided check, and reduced-motion-aware
  animation primitives.
- `src/features/explanations/AnimatedStepCard.tsx` — animated step card used by
  the kid flow.
- `src/components/math/CompactMathStepper.tsx` — interactive arithmetic
  demonstration shown for eligible under-11 pure arithmetic examples.
- `src/features/explanations/ObjectCounter.tsx` — lazy-loaded concrete object
  support used by child arithmetic explanations.
- `src/features/explanations/RuntimeMiniPracticeInline.tsx` — embedded check
  and student interaction at the end of the progressive explanation.
- `src/features/explanations/ExplanationCards.tsx` — non-kid card renderer and
  legacy fallback section presentation.

### Generation, normalization, and support services

- `src/features/explanations/useTwoCardTeaching.ts` — opens explanations,
  chooses language/grade/style, checks and writes the explanation cache,
  generates deterministic supported-division/fraction paths, and calls the
  Supabase `ai-chat` edge function only for the adaptive fallback.
- `src/domain/learningMode.ts` — maps a resolved school level to `kid` or
  `student`.
- `src/utils/gradeLevelMapping.ts` — defines the under-11 curriculum mapping.
- `src/features/explanations/quickExplanation.ts` — deterministic supported
  division explanation and validation helpers.
- `src/features/explanations/runtimeMiniPractice.ts` — runtime practice
  context contract.
- `src/services/learningAnalytics.ts` — records explanation-opened, support,
  and check-started interactions.
- `src/integrations/supabase/client.ts` — Supabase client used for cache,
  topic lookup, user role lookup, and AI fallback requests.

### Existing entry points

`ExplanationModal` and the teaching hook are used by:

- `src/pages/ExerciseHistoryPage.tsx` (`/exercise-history`)
- `src/pages/guardian/GuardianExplanations.tsx`
- `src/pages/guardian/GuardianResults.tsx`
- `src/components/guardian/ExerciseRow.tsx`
- `src/components/learning/QuizOverlay.tsx` (practice session)
- `src/components/user/chat/AIResponse.tsx` (chat explanation)
- `src/components/user/chat/GroupedProblemExplanationModal.tsx`

The V2-only entry point is `src/pages/dev/StuwyExplainLabPage.tsx`, mounted at
`/dev/stuwy-explain-v2` only when `import.meta.env.DEV` is true. It uses
`src/features/explanations/stuwyExplainLab.ts` and
`src/components/math/StructuredOperationGrid.tsx`; it does not import
`TwoCards`, `ExplanationModal`, or `useTwoCardTeaching`.

## Rendering flow

```text
lesson/history/practice/guardian/chat caller
              │
              ▼
      useTwoCardTeaching.openFor
              │
       cache / deterministic
       quick path / ai-chat fallback
              │
              ▼
       ExplanationModal
              │
              ▼
           TwoCards
        ┌─────┴─────────────┐
        │                   │
   under-11 arithmetic   ordered steps
   CompactMathStepper     + learning mode
        │                   │
        └───────┬───────────┘
                ▼
      ExplanationRenderer
        ┌───────┴────────┐
        │                │
   mode=kid or math    mode=student
        │                │
   KidExplanationFlow  ExplanationCards
        │
   AnimatedStepCard + RuntimeMiniPracticeInline
```

The V2 route is intentionally a separate branch:

```text
/dev/stuwy-explain-v2  →  StuwyExplainLabPage
                       →  buildLabSolution
                       →  StructuredOperationGrid
```

## Regression protection

`src/features/explanations/explanationMode.test.ts` protects the routing
policy: CE2/CM1/CM2 remain on TwoCards, legacy lessons remain on TwoCards at
all ages, older non-legacy experiences may opt into V2, and under-11 V2 needs
an explicit conventional-notation exception. The existing
`ExplanationRenderer.test.tsx` continues to protect arithmetic dispatch to the
progressive kid renderer.

The original component files and production route wiring were not changed for
this decision. Visual baselines remain owned by the isolated V2 harness.

## Consequences

Positive: guided child explanations, progressive reveal, student checks, and
existing analytics/cache behavior remain stable. V2 can evolve its structured
mathematical renderer independently.

Trade-off: the product now has two explanation systems and needs an approved
rollout decision before any existing lesson is migrated. Product-owner review
is required before wiring the selector into production callers.
