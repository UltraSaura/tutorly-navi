

## Fix: Quiz Questions Overflow on Mobile

### Problem
Visual questions (pie charts, angles) with multiple options overflow the screen on mobile. The SVG previews are 160px fixed, cards have generous padding, and `QuestionCard` uses `max-w-md` — all fine on desktop but too tall for mobile viewports (390×726).

### Solution
Make the quiz card and its visual content responsive to screen size:

1. **QuestionCard container** — reduce padding on mobile, allow scrolling
2. **Pie/Angle SVGs** — shrink from 160px to ~120px on small screens  
3. **Grid layout** — use 2 columns on mobile for visual options (they're just pie charts, they fit at smaller sizes)
4. **QuizOverlay wrapper** — ensure `overflow-y-auto` works properly with max-height constraints

### Changes

| File | Change |
|------|--------|
| `src/components/learning/QuestionCard.tsx` | Reduce SVG `width`/`height` from 160 to 120 on pie/angle cards; use `grid-cols-2` instead of `grid-cols-1 sm:grid-cols-2` for visual options; reduce card padding on small screens |
| `src/components/learning/QuizOverlay.tsx` | Already has `max-h-[90vh] overflow-y-auto` — no change needed |

### Technical detail
In `PieStudentView` (select_pie mode, ~line 465) and `AngleStudentView` (~line 310):
- Change SVG dimensions: `width={120} height={120}` (from 160)
- Change grid: `grid-cols-2 gap-3` (from `grid-cols-1 sm:grid-cols-2 gap-4`)
- Reduce button padding: `p-2` (from `p-3`)

In `QuestionCard` outer div (line 64):
- Change to `p-3 sm:p-4` for tighter mobile spacing

These are small CSS/prop changes across ~6 lines in one file.

