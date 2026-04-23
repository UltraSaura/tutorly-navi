

## Goal
Increase the fox mascot video size by 50% on the `/chat` welcome screen so it reads as a prominent character rather than a small thumbnail.

## Change
**File**: `src/components/user/chat/WelcomeFox.tsx`

Update the `<video>` element's sizing classes and inline `maxHeight`:

- `max-w-xs` (20rem / 320px) → `max-w-md` (28rem / 448px) — +40% mobile width
- `sm:max-w-sm` (24rem / 384px) → `sm:max-w-xl` (36rem / 576px) — +50% desktop width
- `style={{ maxHeight: "45vh" }}` → `style={{ maxHeight: "67vh" }}` — +50% vertical cap

Net effect: the fox renders ~50% larger in both dimensions on all breakpoints, while still respecting viewport limits so it never overflows on small phones.

## Preserved
- Speech bubble size, position, and upward pointer (unchanged so the bubble stays proportionate and tightly anchored under the fox).
- `mix-blend-multiply`, `object-contain`, autoplay/loop/muted/playsInline attributes.
- Bilingual greeting, name resolution, animations, exports.

## Out of scope
- Resizing the speech bubble.
- Changing layout, page background, or the video file itself.

