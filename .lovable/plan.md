

## Plan: Smart Animation Filtering for Non-Arithmetic Problems

### Problem
The Interactive Math Stepper always shows for young students regardless of problem type. For time calculations, word problems, geometry, etc., it extracts a random arithmetic expression from the explanation text and animates it — which is confusing and misleading.

### Solution: Add problem-type detection to gate the stepper

**File: `src/features/explanations/TwoCards.tsx`**

Add a function `isPureArithmeticProblem(exerciseText)` that checks whether the exercise is a simple arithmetic operation (where the stepper adds value) vs. a conceptual/word problem (where it doesn't).

The stepper should only appear when ALL of these are true:
1. Student is under 11 (existing check)
2. The exercise is a **pure arithmetic** expression (e.g., `234 + 567`, `45 × 12`)
3. NOT a word problem involving time, money, geometry, measurement, etc.

Detection approach — check the exercise text for:
- **Time keywords**: "heure", "minute", "départ", "arrivée", "durée", "hour", "time", "clock", "AM", "PM", ":"  followed by digits (like `14:30`)
- **Geometry keywords**: "périmètre", "aire", "surface", "triangle", "rectangle", "cercle", "perimeter", "area", "angle"
- **Measurement keywords**: "km", "mètre", "litre", "gramme", "meter", "kilogram"
- **Money keywords**: "€", "$", "prix", "coût", "monnaie", "price", "cost", "change"
- **General word problem signals**: sentences longer than ~30 chars with no bare arithmetic expression

If any of these are detected, suppress the stepper — the text explanation from the AI is sufficient.

### Change summary

```
// TwoCards.tsx — new helper
function isPureArithmeticProblem(text: string): boolean {
  const lower = text.toLowerCase();
  const conceptualKeywords = [
    'heure', 'minute', 'départ', 'arrivée', 'durée', 'temps',
    'hour', 'time', 'clock', 'am', 'pm',
    'périmètre', 'aire', 'surface', 'triangle', 'rectangle',
    'perimeter', 'area', 'angle', 'circle',
    'km', 'mètre', 'litre', 'gramme', 'meter',
    '€', '$', 'prix', 'coût', 'monnaie', 'price', 'cost',
  ];
  if (conceptualKeywords.some(kw => lower.includes(kw))) return false;
  if (/\d{1,2}:\d{2}/.test(text)) return false; // time format like 14:30
  // Must contain a bare arithmetic expression
  return /\d+\s*[+\-×÷*/]\s*\d+/.test(text);
}
```

Then update the guard:
```
const shouldShowInteractiveStepper = !isGuardian 
  && userContext?.student_level 
  && isUnder11YearsOld(userContext.student_level) 
  && exampleExpression
  && isPureArithmeticProblem(s.exercise || '');  // NEW
```

### Files to edit
- `src/features/explanations/TwoCards.tsx` — add `isPureArithmeticProblem()` and update the `shouldShowInteractiveStepper` condition

### What stays the same
- The stepper still works perfectly for `23 + 45`, `456 × 12`, etc.
- AI explanations, voice, language — all untouched
- Long division animation — untouched (separate component)

