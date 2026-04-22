

## Goal
Add **My Program**, **Dashboard**, and **Support** entries to the account dropdown so students can reach them from the avatar menu (desktop) and the Account sheet (mobile).

## Context
Two surfaces render the "account dropdown":
- **Desktop**: `src/components/layout/HeaderNavigation.tsx` — the avatar `DropdownMenu`. Currently shows: Profile → (Admin) → Language → Sign Out. Missing: My Program, Dashboard, Support.
- **Mobile**: `src/components/layout/AccountTabContent.tsx` — the bottom Account sheet. Currently shows: Profile → Support → (Admin) → Language → Sign Out. Missing: My Program, Dashboard.

Routes already exist (`/my-program`, `/dashboard`, `/support`) and are present in the desktop top-nav (`desktopNavigation` array in `HeaderNavigation.tsx`), so we're only mirroring them into the dropdown — no routing changes.

## Changes

### 1. `src/components/layout/HeaderNavigation.tsx` (desktop dropdown)
Insert three `DropdownMenuItem`s right after the Profile item, before the Admin item:

```tsx
<DropdownMenuItem asChild>
  <NavLink to="/my-program" className="flex items-center">
    <BookOpen className="mr-2 h-4 w-4" />
    <span>My Program</span>
  </NavLink>
</DropdownMenuItem>
<DropdownMenuItem asChild>
  <NavLink to="/dashboard" className="flex items-center">
    <Trophy className="mr-2 h-4 w-4" />
    <span>Dashboard</span>
  </NavLink>
</DropdownMenuItem>
<DropdownMenuItem asChild>
  <NavLink to="/support" className="flex items-center">
    <HeadphonesIcon className="mr-2 h-4 w-4" />
    <span>{t('nav.support')}</span>
  </NavLink>
</DropdownMenuItem>
```

Icons (`BookOpen`, `Trophy`, `HeadphonesIcon`) are already imported in this file — no new imports needed. Labels match the existing top-nav strings ("My Program", "Dashboard" hardcoded; Support uses `t('nav.support')` like everywhere else).

### 2. `src/components/layout/AccountTabContent.tsx` (mobile Account sheet)
Add **My Program** and **Dashboard** buttons in the Account Actions block, immediately after the Profile button and before the existing Support button. Pattern matches the existing Profile/Support buttons:

```tsx
<Button variant="ghost" asChild className="w-full justify-start h-12" onClick={onClose}>
  <NavLink to="/my-program" className="flex items-center">
    <BookOpen className="mr-3 h-5 w-5" />
    <span>My Program</span>
  </NavLink>
</Button>
<Button variant="ghost" asChild className="w-full justify-start h-12" onClick={onClose}>
  <NavLink to="/dashboard" className="flex items-center">
    <Trophy className="mr-3 h-5 w-5" />
    <span>Dashboard</span>
  </NavLink>
</Button>
```

Add `BookOpen, Trophy` to the existing `lucide-react` import. Support stays where it is (already present).

### Visibility / role scoping
The header/account dropdown is rendered in the student layout. Guardian and teacher portals use their own bottom navs (`GuardianBottomNav`, etc.) and won't be affected. Admin gating for the existing "Admin Panel" entry is unchanged.

### Not changed
- Top desktop nav bar — already has these three; no duplication concerns since dropdown is a separate surface used as a quick-access menu.
- Mobile bottom tabs — unchanged.
- i18n — "My Program" and "Dashboard" are hardcoded strings in the existing top-nav too; keeping consistency. Can be moved to translation keys later if you want.

## Files touched
- **Edit**: `src/components/layout/HeaderNavigation.tsx` (3 new dropdown items)
- **Edit**: `src/components/layout/AccountTabContent.tsx` (2 new buttons + icon imports)

No DB, no routing, no new components.

