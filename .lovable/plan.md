

## Goal
On desktop and tablet, hide **My Program**, **Dashboard**, and **Support** from the top navigation bar — they remain accessible only via the account dropdown (where we just added them). Mobile bottom tabs are unaffected.

## Context
`src/components/layout/HeaderNavigation.tsx` defines `desktopNavigation` array, which renders the top nav links when `!isMobile`. Currently it includes 6 items: Home, My Program, Dashboard, Learning, History, Support.

Per request, the visible top tabs should drop My Program, Dashboard, and Support — those three now live exclusively in the avatar dropdown (added in the previous step).

## Change

### `src/components/layout/HeaderNavigation.tsx`
Trim the `desktopNavigation` array from 6 entries to 3:

```ts
const desktopNavigation = [
  { title: "nav.home",     url: "/chat",             icon: MessageSquare },
  { title: "nav.learning", url: "/learning",         icon: GraduationCap },
  { title: "nav.history",  url: "/exercise-history", icon: History },
];
```

Remove the now-unused `BookOpen`, `Trophy`, and `HeadphonesIcon` from the top-of-file `lucide-react` import — but only after confirming they aren't still referenced inside the dropdown JSX. They **are** still used in the dropdown items we just added (`BookOpen` for My Program, `Trophy` for Dashboard, `HeadphonesIcon` for Support), so **all three icon imports stay**. No import changes.

### Tablet behavior
`useIsMobile()` uses a 768px breakpoint, so anything ≥768px (tablet + desktop) renders the top nav and hides the mobile bottom tabs. Trimming `desktopNavigation` covers both surfaces in one change — no separate tablet branch needed.

## Not changed
- Mobile bottom tabs (`MobileBottomTabs.tsx`) — still show Home / Learning / History / Account.
- Account dropdown / mobile Account sheet — still contain My Program, Dashboard, Support (added in previous step).
- Routes themselves — `/my-program`, `/dashboard`, `/support` continue to work.

## Files touched
- **Edit**: `src/components/layout/HeaderNavigation.tsx` (remove 3 entries from `desktopNavigation`)

No DB, no routing, no new components.

