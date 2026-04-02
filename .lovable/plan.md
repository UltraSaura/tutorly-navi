
Issue summary
- I checked for explicit auto-refresh logic and did not find a timer or redirect loop tied to the auth page itself.
- The session replay shows the app returning to `/auth` and showing `Loading translations...`, then `Loading...`, multiple times.
- The current language fix is only partial: it prevents unmounting during a language change inside the same provider instance, but if `SimpleLanguageProvider` remounts, `translations` starts again as `{}` with `isLoading=true`, so the whole auth tree still unmounts and looks like a page refresh.
- That explains why the problem can still happen even on the Sign in page.

Implementation plan

1. Make translation bootstrap non-blocking after the first cold load
- File: `src/context/SimpleLanguageContext.tsx`
- Initialize `translations` from `translationCache` for the current language instead of always starting from `{}`.
- Add a one-time bootstrap flag/ref so the full-screen `Loading translations...` screen appears only on the first cold app load, not on later remounts.
- Keep syncing i18next in the background, but never replace the whole app with the loader once translations have already been available.

2. Disable auto language switching during auth
- Files:
  - `src/context/SimpleLanguageContext.tsx`
  - `src/components/auth/StudentRegistrationForm.tsx`
  - `src/components/auth/ParentRegistrationForm.tsx`
- Guard country-detection / auto-language effects when the route starts with `/auth`.
- In the registration forms, selecting a country should update country and school-level data only; do not auto-call `setLanguageFromCountry()` during signup.
- This removes the biggest auth-flow trigger for mid-form translation reloads.

3. Preserve auth state even if a remount still happens
- File: `src/pages/AuthPage.tsx`
- Persist the current auth step (`login`, `userType`, `studentForm`, `parentForm`, `resetPassword`) in `sessionStorage` or the URL.
- Restore that step on mount so the page does not jump back to Sign in unexpectedly.
- Recommended safety net: persist registration draft values in `sessionStorage` so typed data survives any unexpected remount.

4. Remove remaining forced reloads in the app
- Files:
  - `src/components/ui/language-select.tsx`
  - `src/components/ui/language-selector.tsx`
  - `src/components/layout/HeaderNavigation.tsx`
  - `src/components/layout/Navbar.tsx`
- Remove `window.location.reload()` after language changes.
- These are not the direct `/auth` trigger, but they are real hard-refresh points elsewhere and should be cleaned up to prevent similar reset behavior.

Technical detail
- Why the previous fix did not fully solve it:
  - Current guard:
    `if (isLoading && Object.keys(translations).length === 0) ...`
  - Remaining problem:
    when the provider remounts, `translations` is reset to `{}` before the effect repopulates from cache, so the loader still replaces the whole app.
  - Better fix:
    seed translations synchronously from cache and treat the loader as a first-boot-only state.

Expected result
- No more visible refresh/reset while typing on Sign in or Create Account.
- Country selection no longer resets the auth flow.
- Even if the app re-renders, the auth step and typed form data remain intact.
