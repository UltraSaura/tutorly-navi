

## Interactive Pie Coloring Question Type

### What it does
A new interaction mode for the existing pie visual question. Instead of selecting which pie chart is correct, the student sees a single pie divided into slices and must **tap/click slices to color them** to represent a fraction (e.g., "Color 1/2 of the pie" → student colors 3 out of 6 slices).

### How it works

**Admin creates the question:**
- Sets the prompt: "Color 1/2 of the pie"
- Chooses number of slices (e.g., 6)
- Sets the required number of colored slices as the correct answer (e.g., 3)
- All slices start uncolored for the student

**Student answers:**
- Sees a single pie with N equal slices, all gray
- Taps slices to toggle color on/off
- Submits when they think they've colored the right number

**Evaluation:**
- Correct if the student colored exactly the right number of slices (position doesn't matter, only count)

### Changes

**1. `src/lib/quiz/visual-types.ts`**
- Add `interactionMode?: "select_pie" | "color_slices"` to `VisualPie`
- Add `correctColoredCount?: number` for the color_slices mode answer

**2. `src/lib/quiz/visual-evaluate.ts`**
- Add `color_slices` case inside the `pie` evaluator: count how many slices the student colored and compare to `correctColoredCount`

**3. `src/components/admin/visual-editors/PieEditor.tsx`**
- Add a toggle at the top: "Select pie charts" vs "Color slices" mode
- In "Color slices" mode: show simplified UI — number of slices input + correct colored count input (no variants needed)

**4. `src/components/learning/QuestionCard.tsx` (PieStudentView)**
- When `interactionMode === "color_slices"`: render a single pie with all slices uncolored, let student tap individual slices to toggle color. Answer is the list of colored slice IDs.

**5. `src/components/admin/VisualQuestionBuilder.tsx`**
- Pass through the new mode — no structural changes needed since PieEditor handles it internally.

### Technical detail
- Student answer format for color_slices: `string[]` of selected segment IDs (same format as existing pie, reuses `setsEqual` logic)
- Evaluation: since any combination of N slices out of total is correct (not position-specific), evaluate by count: `selected.size === correctColoredCount`

