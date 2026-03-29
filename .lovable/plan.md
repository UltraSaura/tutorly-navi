

## Add Sign Out Button to Profile Page (Mobile)

### Problem
On mobile, the Profile page (`/profile`) has no sign-out button. The sign-out option only exists in the Account bottom sheet (opened from the bottom tab bar), but once the user navigates to the profile page, they lose easy access to it.

### Solution
Add a "Sign Out" button at the bottom of the Profile page, visible on all screen sizes but especially important for mobile.

### Changes

**`src/pages/ProfilePage.tsx`**
- Import `LogOut` icon, `Button`, `supabase`, `useNavigate`, `useToast`, and `useState`
- Add a `handleSignOut` function (same pattern used in `AccountTabContent`)
- Add a Sign Out button card after the Account Deletion section — styled in red/destructive to match the existing sign-out buttons elsewhere in the app

This is a single-file change. The button will appear at the bottom of the profile page scroll, below the existing "Account Deletion" section.

