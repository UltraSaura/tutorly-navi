
Problem found: the sign-out button does exist in code in two places already:
- `src/pages/ProfilePage.tsx` at the bottom of the page
- `src/components/layout/AccountTabContent.tsx` inside the mobile Account sheet

So this is likely a mobile layout/visibility issue, not a missing feature.

Plan:
1. Inspect the mobile Profile page layout and bottom navigation stacking
   - Verify whether the bottom tab bar is covering the sign-out button on small screens
   - Check whether the page has enough bottom spacing when `AccountDeletion` expands vertically

2. Make the sign-out action impossible to miss on mobile
   - Keep the existing full-page sign-out button in `ProfilePage`
   - Add a dedicated mobile-only sticky/fixed sign-out action near the bottom safe area, above the mobile tab bar, or place it in a clearly separated card section with extra bottom margin
   - Ensure it remains reachable even after long content like account deletion

3. Improve mobile account sheet visibility
   - In `AccountTabContent`, move Sign Out higher in the menu (above language, or directly under profile/support)
   - Keep the current red styling so it stands out immediately without scrolling

4. Add spacing/safe-area protection
   - Update the mobile layout so profile content has enough bottom padding for:
     - the bottom tabs
     - safe-area inset
     - the final action button
   - This prevents the last CTA from being hidden behind the fixed nav

5. Preserve existing logout behavior
   - Reuse the current sign-out logic exactly as-is:
     - `supabase.auth.signOut()`
     - success/error toast
     - redirect to `/auth`

Files to update:
- `src/pages/ProfilePage.tsx`
- `src/components/layout/AccountTabContent.tsx`
- potentially `src/components/layout/MainLayout.tsx` if extra mobile bottom spacing is needed globally

Expected result:
- On mobile, the user will always see an obvious sign-out option either on the Profile page without it being hidden by the bottom nav, or near the top of the Account sheet without needing to scroll.

Technical note:
The current code already has `pb-20` in `MainLayout`, but the Profile page itself contains long stacked cards (`ProfileEditForm`, `AccountDeletion`, then Sign Out). On a 390px-wide mobile viewport, the last button can still feel hidden or be visually buried. The safest implementation is a mobile-prominent placement plus extra protected bottom spacing.
