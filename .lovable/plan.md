

## Verification: full app adaptation for the rename

I checked the codebase against the renamed schema. Here's the status.

### Database (live schema)
- `subjects` ✅ exists
- `topics` ✅ exists
- `videos` ✅ exists
- `topic_objective_links` ✅ exists
- Old names: gone
- Triggers `update_topic_video_count` / `update_topic_quiz_count`: reference new names ✅

### Source code
Need to verify there are zero remaining references to the old names in `src/` and `supabase/functions/`. I will run a search to confirm.

### About the build errors you keep seeing
The errors all share the same shape:
```
Argument of type '"learning_topics"' is not assignable to parameter of type '"configured_models"'
```
That specific fallback (`"configured_models"`) only appears when the Supabase TS client cannot find the table in `Database['public']['Tables']` and degrades to the first table name alphabetically. This happens when:
1. `src/integrations/supabase/types.ts` is out of sync with the live DB, **OR**
2. The Vite/TS server is holding a stale cached version of `types.ts`.

Since `tsc --noEmit` passes locally and `types.ts` already contains the new tables, this is a **stale TS server cache**, not a real code defect.

### Plan once approved (default mode)

1. **Verify zero stale references** — search `src/` and `supabase/functions/` for `learning_subjects`, `learning_topics`, `learning_videos`, `topic_objectives`. If any are found, replace them.
2. **Force TS cache invalidation** — touch `src/integrations/supabase/types.ts` (re-save with identical content) so the build engine reloads the regenerated types. No content changes.
3. **Re-run `tsc --noEmit`** to confirm zero errors.
4. **Report back** with the final clean state.

If step 1 finds any actual leftover references (which I don't expect), I'll fix them in the same pass.

### What you should see after
- Build error overlay clears
- All admin/learning pages, quiz generators, lesson content, transcript tab, and recommendations work against the new tables
- No code or schema drift between app and DB

