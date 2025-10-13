# Guardian Portal Workflow - Complete Documentation

## Overview

The Guardian Portal enables parents and guardians to monitor and manage their children's learning activities, view progress, access exercise results, and manage their subscription.

---

## Architecture

### Database Schema

```
guardians (extends users with user_type='parent')
  ├─ id (uuid, PK)
  ├─ user_id (uuid, FK → users.id)
  ├─ billing_customer_id (text, Stripe)
  ├─ phone (text)
  └─ address_json (jsonb)

children (extends users with user_type='student')
  ├─ id (uuid, PK)
  ├─ user_id (uuid, FK → users.id)
  ├─ contact_email (text)
  ├─ grade (text)
  ├─ curriculum (text)
  ├─ settings_json (jsonb)
  └─ status (text)

guardian_child_links (many-to-many relationship)
  ├─ id (uuid, PK)
  ├─ guardian_id (uuid, FK → guardians.id)
  ├─ child_id (uuid, FK → children.id)
  ├─ relation (text: 'parent', 'guardian', 'tutor')
  └─ permissions_json (jsonb)

user_roles (role-based access control)
  ├─ user_id (uuid, FK → users.id)
  └─ role (enum: 'admin', 'guardian', 'student', 'parent', 'moderator')
```

### Auto-Profile Creation

When a user signs up:
1. If `user_type='parent'` → creates `guardians` profile + assigns `guardian` role
2. If `user_type='student'` → creates `children` profile + assigns `student` role

**Triggers:**
- `auto_create_guardian_profile()` (AFTER INSERT on users)
- `auto_create_child_profile()` (AFTER INSERT on users)
- `auto_assign_guardian_role()` (AFTER INSERT on guardians)

---

## User Flows

### 1. Parent Registration Flow

```
1. User visits /auth
2. Clicks "Create Account"
3. Selects "Parent" user type
4. Fills out registration form:
   - Email
   - Password
   - First Name / Last Name
   - Country
   - Phone Number
5. Submits form
6. BACKEND:
   - Creates auth user with user_type='parent'
   - Trigger creates users table entry
   - Trigger creates guardians profile
   - Trigger assigns guardian role
7. User confirms email
8. Logs in → Redirected to /guardian portal
```

### 2. Adding a Child Flow

```
1. Guardian navigates to /guardian/children
2. Clicks "Add Child" button
3. Fills out child form:
   - Email
   - Password (auto-generated or custom)
   - First Name / Last Name
   - School Level
   - Country
   - Relation (parent/guardian/tutor)
4. Submits form
5. BACKEND (create-child-account Edge Function):
   - Validates guardian is authenticated
   - Creates child auth account
   - Creates child profile in children table
   - Creates guardian_child_links entry
   - Assigns student role
6. Child appears in guardian's children list
7. Guardian can share credentials with child
```

### 3. Viewing Child Progress Flow

```
1. Guardian logs in → Redirected to /guardian
2. Dashboard shows:
   - Total children count
   - Exercises completed this week
   - Average progress (coming soon)
   - Needs attention alerts
3. Guardian navigates to /guardian/results
4. Filters by:
   - Specific child (dropdown)
   - Subject
   - Date range
   - Correctness (all/correct/incorrect)
5. Views exercise cards with:
   - Exercise content
   - Child's answer
   - Correctness status
   - Attempt count
   - Date completed
6. Clicks "View Explanation" to see detailed breakdown
```

---

## Row-Level Security (RLS) Policies

### Guardian Access Rules

✅ **Guardians CAN:**
- View their own guardian profile
- View all children linked to them
- View children's exercise history
- View children's exercise attempts
- View children's chat messages (if enabled)
- View children's exercise explanations
- View children's user profiles
- Create new child accounts via Edge Function
- Update their own profile
- Manage guardian-child links

❌ **Guardians CANNOT:**
- View other guardians' children
- Modify children's exercise data
- Delete children's records
- Access admin-only features
- View unlinked children

### Key RLS Policies

```sql
-- Exercise History
"Guardians view children exercise history"
USING (
  auth.uid() = user_id OR  -- Own data
  user_id IN (
    SELECT c.user_id FROM children c
    INNER JOIN guardian_child_links gcl ON gcl.child_id = c.id
    INNER JOIN guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
)

-- Exercise Attempts
"Guardians view children exercise attempts"
USING (
  exercise_history_id IN (
    SELECT eh.id FROM exercise_history eh
    WHERE eh.user_id = auth.uid() OR
    eh.user_id IN (SELECT c.user_id FROM ... [guardian check])
  )
)

-- Children Profiles
"Guardians can view their children"
USING (
  id IN (
    SELECT gcl.child_id FROM guardian_child_links gcl
    INNER JOIN guardians g ON g.id = gcl.guardian_id
    WHERE g.user_id = auth.uid()
  )
)
```

---

## Frontend Components

### Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/guardian` | `GuardianHome` | Dashboard overview |
| `/guardian/children` | `GuardianChildren` | Manage child accounts |
| `/guardian/results` | `GuardianResults` | View exercise results |
| `/guardian/explanations` | `GuardianExplanations` | View detailed explanations |
| `/guardian/progress` | `GuardianProgress` | Track learning progress |
| `/guardian/billing` | `GuardianBilling` | Subscription management |
| `/guardian/settings` | `GuardianSettings` | Account preferences |

### Hooks

| Hook | Purpose |
|------|---------|
| `useGuardianAuth()` | Check guardian authentication & get guardian ID |
| `useGuardianExerciseHistory()` | Fetch children's exercise data with filters |

### Layout

`GuardianLayout` provides:
- Sidebar navigation (desktop)
- Mobile hamburger menu
- Route protection (redirects non-guardians to /auth)
- Consistent header/footer

---

## Testing Checklist

### ✅ Registration & Authentication

- [ ] Parent can register with email/password
- [ ] Guardian profile auto-created on signup
- [ ] Guardian role auto-assigned
- [ ] Guardian redirected to /guardian on login (not /chat)
- [ ] Student registration creates child profile

### ✅ Child Management

- [ ] Guardian can view empty state when no children
- [ ] Guardian can add new child via form
- [ ] Child account created via Edge Function
- [ ] Child appears in guardian's children list
- [ ] Guardian can view child details (email, grade, status)

### ✅ Admin Panel Integration

- [ ] Admin can view parents in User Management
- [ ] Admin can see parent's children in "Children" tab
- [ ] Admin can manually add child to parent
- [ ] Uses `guardian_child_links` table (not `parent_child`)
- [ ] No errors when fetching relationships

### ✅ Exercise Results

- [ ] Guardian can view all children's exercises
- [ ] Can filter by specific child
- [ ] Can filter by subject, date range, correctness
- [ ] Shows exercise content, answer, attempts
- [ ] Displays child name when "All Children" selected
- [ ] Empty state shows when no exercises

### ✅ Progress Tracking

- [ ] Dashboard shows correct children count
- [ ] Shows exercises completed this week
- [ ] Progress page displays subject breakdown
- [ ] Overall progress percentage calculated
- [ ] Recent achievements displayed

### ✅ RLS Policies

- [ ] Guardian can only view own children's data
- [ ] Guardian cannot access other guardians' children
- [ ] Exercise history queries work without errors
- [ ] Chat messages accessible (if feature enabled)
- [ ] Explanations visible for children's attempts

### ✅ Navigation & UX

- [ ] All navigation links work
- [ ] Mobile menu functions correctly
- [ ] Loading states display properly
- [ ] Error messages shown appropriately
- [ ] Empty states provide clear CTAs

---

## Common Issues & Solutions

### Issue: "No guardian profile found"

**Cause:** Existing parent users created before trigger was added

**Solution:** Run backfill migration:
```sql
INSERT INTO public.guardians (user_id, phone)
SELECT id, phone_number
FROM public.users
WHERE user_type = 'parent'
AND id NOT IN (SELECT user_id FROM public.guardians)
ON CONFLICT (user_id) DO NOTHING;
```

### Issue: Admin panel can't fetch children

**Cause:** Code still references `parent_child` table

**Solution:** Updated in `UserManagement.tsx` to use `guardian_child_links`

### Issue: Guardian sees student portal

**Cause:** Missing redirect logic in Index.tsx

**Solution:** Added `useGuardianAuth()` check before chat redirect

### Issue: RLS policies blocking data

**Cause:** Missing or incorrect RLS policies

**Solution:** Run comprehensive RLS migration (`20251013000002_comprehensive_guardian_rls.sql`)

---

## Database Migrations Applied

1. **20251011174955** - Guardian and children tables
2. **20251011175120** - Enhanced explanations for parents
3. **20251011175152** - Audit log for compliance
4. **20251013000000** - Auto-create guardian/child profiles (NEW)
5. **20251013000001** - Add guardian role support (NEW)
6. **20251013000002** - Comprehensive guardian RLS (NEW)

---

## API Endpoints

### Edge Functions

#### `create-child-account`
Creates a child account and links it to the guardian.

**Request:**
```json
{
  "email": "child@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "country": "US",
  "phoneNumber": "+1234567890",
  "schoolLevel": "Grade 5",
  "relation": "parent"
}
```

**Response:**
```json
{
  "success": true,
  "child": {
    "id": "uuid",
    "user_id": "uuid",
    "email": "child@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Security:**
- Requires authentication (guardian JWT)
- Validates guardian profile exists
- Uses service role key for user creation
- Atomic transaction with cleanup on failure

---

## Future Enhancements

- [ ] Real-time notifications when child completes exercise
- [ ] Weekly email reports for guardians
- [ ] Performance alerts (struggling topics)
- [ ] Billing integration with Stripe
- [ ] Child account switching (guardian can view as child)
- [ ] Bulk child import via CSV
- [ ] Mobile app for guardians
- [ ] Advanced analytics dashboard

---

## Support & Troubleshooting

For issues:
1. Check browser console for errors
2. Verify user has guardian profile: `SELECT * FROM guardians WHERE user_id = 'xxx'`
3. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename IN ('guardians', 'children', 'guardian_child_links')`
4. Validate child links: `SELECT * FROM guardian_child_links WHERE guardian_id = 'xxx'`
5. Test Edge Function: `supabase functions invoke create-child-account --debug`

---

**Last Updated:** October 13, 2024
**Version:** 1.0.0

