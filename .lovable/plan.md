

## Plan: Hide Reading Speed Control

**1 file modified**: `src/components/math/MathExplanationReader.tsx`

Remove the rate slider and its label (the `0.85x` text + `<Slider>` block around lines 120-130). The `rate` state stays in the hook at its default 0.85x — just the UI control is hidden.

