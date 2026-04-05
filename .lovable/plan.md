

## Plan: Add Localized Teacher Explanations to Addition, Subtraction, and Multiplication

### Goal
Match the division explanation quality: every step of addition, subtraction, and multiplication gets a detailed, localized (FR/EN) teacher explanation displayed in a dedicated panel below the visual animation.

### Changes

**1 file modified**: `src/components/math/CompactMathStepper.tsx`

#### 1. Add explanation text generation to `additionData` useMemo

Add `language` to the dependency array and generate an `explanations` array — one entry per step phase (2 phases per column + optional final carry):

- **Even phase (carry check)**: "Look at the ones column: 7 + 5 = 12. Since 12 ≥ 10, we carry 1." / "On regarde la colonne des unités : 7 + 5 = 12. Comme 12 ≥ 10, on retient 1."
- **Odd phase (write digit)**: "Write 2 in the ones column of the result." / "On écrit 2 dans la colonne des unités du résultat."
- **Final carry**: "Write the final carry 1 to get the answer: 127." / "On écrit la retenue finale 1 pour obtenir le résultat : 127."
- **Complete**: "Addition complete! 58 + 69 = 127." / "L'addition est terminée ! 58 + 69 = 127."

Place names (ones/tens/hundreds) will be localized: unités/dizaines/centaines.

#### 2. Add explanation text generation to `subtractionData` useMemo

Same pattern, add `language` dep:

- **Even phase (borrow check)**: "Look at the ones column: 3 − 7. Since 3 < 7, we borrow 1 from the tens." / "On regarde la colonne des unités : 3 − 7. Comme 3 < 7, on emprunte 1 à la dizaine."
- **Odd phase (write digit)**: "13 − 7 = 6. Write 6 in the ones column." / "13 − 7 = 6. On écrit 6 dans la colonne des unités."
- **Complete**: "Subtraction complete! 83 − 47 = 36." / "La soustraction est terminée ! 83 − 47 = 36."

#### 3. Add explanation text generation to `multiplicationData` useMemo

Add `language` dep and replace brief English-only `explanation` strings with localized teacher text:

- **Step 0 (setup)**: "We will multiply 345 × 27 step by step." / "On va multiplier 345 × 27 étape par étape."
- **Partial product digit**: "7 × 5 = 35. Write 5, carry 3." / "7 × 5 = 35. On écrit 5 et on retient 3."
- **Last digit of partial**: "7 × 3 + 2 = 23. Write 23 to complete the row." / "7 × 3 + 2 = 23. On écrit 23 pour compléter la ligne."
- **Final sum digit**: "Adding the ones column: 5. Write 5." / "On additionne la colonne des unités : 5. On écrit 5."
- **Complete**: "Multiplication complete! 345 × 27 = 9315." / "La multiplication est terminée ! 345 × 27 = 9 315."

#### 4. Add explanation panels to addition and subtraction rendering

Currently lines 754-838 (addition) and 840-976 (subtraction) have no explanation panel. Add a `<motion.div>` explanation block at the bottom of each, identical to division's pattern (lines 1101-1112):

```tsx
<div className="mt-3">
  <motion.div
    key={`exp-${currentStep}`}
    className="text-sm text-center text-muted-foreground leading-relaxed px-2"
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
  >
    {additionData.explanations[Math.min(currentStep, additionData.explanations.length - 1)]}
  </motion.div>
</div>
```

#### 5. Update multiplication explanation rendering

Replace the existing brief explanation line (line 1613-1615) with the same styled `<motion.div>` pattern used by division.

### Helper: localized place names

```typescript
const placeName = (colFromRight: number, lang: string) => {
  const fr = ['unités', 'dizaines', 'centaines', 'milliers'];
  const en = ['ones', 'tens', 'hundreds', 'thousands'];
  const names = lang === 'fr' ? fr : en;
  return names[colFromRight] || `column ${colFromRight + 1}`;
};
```

### Dependency array updates
- `additionData`: add `language`
- `subtractionData`: add `language`
- `multiplicationData`: add `language`

### What stays the same
- All visual animations, column highlighting, carries, borrows, frames
- Division explanations (already done)
- Control buttons, auto-play, progress bar
- The fallback animator path (line 1620+)

