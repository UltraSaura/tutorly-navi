

## Enable Edit & Delete for Guardian Children

### Current state
- Edit dialog exists and works (`EditChildDialog.tsx`) — it's wired to the gear icon on each child card
- No delete functionality exists anywhere

### Changes

**1. Add Delete to `EditChildDialog.tsx`**
- Add a "Delete Child" button (destructive, red) at the bottom of the edit dialog
- On click, show an `AlertDialog` confirmation: "Are you sure? This will permanently remove this child account."
- On confirm, delete in order:
  1. `guardian_child_links` where `child_id = child.id` (already has DELETE RLS for guardians)
  2. `children` where `id = child.id` — needs a new DELETE RLS policy
- Close dialog and refresh the list

**2. Database migration — allow guardians to delete their linked children**
- Add DELETE policy on `children` table for guardians (currently missing)
```sql
CREATE POLICY "Guardians can delete their children"
ON public.children FOR DELETE TO authenticated
USING (id IN (
  SELECT gcl.child_id FROM guardian_child_links gcl
  JOIN guardians g ON g.id = gcl.guardian_id
  WHERE g.user_id = auth.uid()
));
```

**3. Files changed**

| File | Change |
|------|--------|
| `src/components/guardian/EditChildDialog.tsx` | Add delete button with AlertDialog confirmation; delete `guardian_child_links` then `children` row |
| Migration SQL | Add DELETE policy on `children` for guardians |

Note: The auth user account itself is NOT deleted (that requires admin/service-role access). Only the child profile and guardian link are removed. The user account becomes an unlinked student account.

