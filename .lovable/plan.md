

## Render OCR Exercises as Math Formulas

### Problem
Exercise questions from OCR are displayed as plain text (e.g., `"a. Simplifiez la fraction 30/63"`) instead of rendered mathematical notation with proper fraction display like in the uploaded worksheet image.

### Solution
Create a utility that detects fraction patterns in exercise text and converts them to LaTeX, then use `MathRenderer` in the `ExerciseCard` to display questions and answers as rendered math.

### Changes

**1. Create `src/utils/mathFormatUtils.ts`**
- `containsMathContent(text: string): boolean` — detects fractions, square roots, LaTeX in text
- `textToMathDisplay(text: string): { prefix: string, latex: string }` — splits text like `"a. Simplifiez la fraction 30/63"` into:
  - prefix: `"a. Simplifiez la fraction"`
  - latex: `\frac{30}{63}`
- Handles patterns: `N/D`, `\frac{N}{D}`, `√N`, answer fractions

**2. Update `src/components/user/chat/AIResponse.tsx`**
- Import `MathRenderer` and the new util
- In both the JSON-response and fallback ExerciseCard renders, replace:
  ```
  <div>{question}</div>
  ```
  with a component that splits the text into prefix + math, rendering the math part via `MathRenderer`:
  ```
  <div>
    <span>{prefix}</span>
    <MathRenderer latex={latex} inline />
  </div>
  ```
- Also render the answer badge with `MathRenderer` when the answer contains fractions (e.g., `13/23` → `\frac{13}{23}`)

This affects 4 locations in the file:
- Line 232: JSON-format question display
- Line 283: JSON-format answer badge
- Line 522: Fallback question display  
- Line ~600: Fallback answer badge

### Result
- Questions show `a. Simplifiez la fraction` followed by a properly rendered fraction (numerator over denominator)
- Answers display as rendered fractions too
- Non-math text passes through unchanged

