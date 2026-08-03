## Plan

1. **Fix the objective query relationship**
   - Update the Curriculum Viewer objective fetch so success criteria are joined through the UUID relationship (`objective_id_uuid -> objectives.id_new`) instead of relying on the legacy text relationship.
   - Keep the existing filters for level, subject, domain, subdomain, and search.

2. **Make filter values resilient**
   - Normalize level filtering to lowercase consistently.
   - Ensure domain/subdomain selections reset immediately when their available DB options no longer contain the selected value.

3. **Improve empty-state visibility**
   - Add a small admin-only diagnostic message in the empty state showing the active filter IDs, so if a filter combination truly has no rows it is obvious which value is blocking results.

4. **Verify with live data**
   - Check that the selected France / CM1 / Mathématiques filters return the existing CM1 math objectives from Supabase.
   - Confirm the viewer no longer shows `0 objective(s)` for filter combinations that exist in the database.

## Technical notes

- The data exists in Supabase: CM1 Mathématiques objectives are present.
- The most likely remaining blocker is the nested `success_criteria (*)` relationship in the `objectives` query, which may be resolving through the legacy `objective_id` foreign key rather than the imported UUID key.
- No database schema change is planned; this is a frontend query/display fix only.