# Explanation V2 — clear questions at every school level

## Student-facing quality rule
Every activity and every intermediate step must make four things explicit, **before** the student is asked to answer:

1. **Context:** what the visual shows and which quantities are involved.
2. **One question:** a single concrete action or calculation, with the relevant numbers.
3. **Response method:** where to type, drag, tap, or select, and the expected answer format.
4. **Feedback:** what was correct or what to reconsider, followed by targeted hints rather than an immediate solution.

The question must use the learner's grade and prior vocabulary, not simply shorten or lengthen the same generic sentence.

## Grade progression (French curriculum)
- **CE1–CE2:** familiar objects and quantities, one short instruction at a time; introduce terms only after an example.
- **CM1–CM2:** a concrete example, clearly labelled diagram, two or three explicit steps; name fractions and parts without assuming familiarity with abstract jargon.
- **6e–5e:** connect the picture to the mathematical representation; define new vocabulary (fraction, numerator, coordinate) at first use.
- **4e–3e:** mathematical terminology with a concise reminder of its meaning; require interpretation and verification, not just copying.
- **2nde–Terminale:** precise symbolic notation and multi-step reasoning; explain assumptions and the expected form of the answer.

These are **authoring guidelines**, not proof of curriculum alignment for every generated lesson. Curriculum/topic appropriateness requires separate teacher review.

## Current MVP implementation
- The optional `schoolLevel` field is validated and used to select age-appropriate scaffolding. Existing blocks without this field remain supported, with a safe default.
- Fraction-bar questions are derived from exact validated fraction values, not the free-text `prompt`. Step 1 asks for the equivalent colored parts; step 2 asks for their total.
- Coordinate questions explain the horizontal and vertical axes, starting point, direction, and validation action; directions are correct for negative and zero coordinates.
- The demo uses **CM2** for fractions and **4e** for the coordinate plane.
- The free-text `prompt` remains in the schema for compatibility but is not presented as a substitute for the structured student question.
- No production lesson generation or Supabase content was rewritten.

## Required acceptance tests for each future activity type
- At least one explicit question ending in a question mark (or an equally unambiguous task command), not an ambiguous label like “Combien en tout ?”.
- All nouns, units, quantities and diagrams agree with the exact mathematical data.
- The student knows whether to enter a whole number, fraction, unit, point, or choose/move an object.
- Intermediate steps have separate questions and hints; no answer leakage in the question.
- Wrong answers produce a useful next action and preserve progress.
- Readable at 375px and 447px; input has an associated label and instructions.
- Teacher reviews examples at each supported grade, especially before generated content is published.

**Scope:** this PR establishes the reusable pattern and validates the two existing activity types. A full audit of all Tutorly-generated lessons is a separate task; do not claim it is complete.
