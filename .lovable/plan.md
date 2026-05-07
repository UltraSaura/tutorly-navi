## Problem
Creating a prompt template with type "Grouped Retry Practice" fails because the database CHECK constraint `prompt_templates_usage_type_check` on `public.prompt_templates.usage_type` only permits the legacy values:

```
('chat', 'grading', 'explanation', 'math_enhanced')
```

The application code (`src/types/admin.ts`, `src/hooks/usePromptManagement.ts`, the create/edit dialogs) already lists `grouped_retry_practice` as a valid type, but the matching DB migration was never applied — so every insert/update with `usage_type = 'grouped_retry_practice'` is rejected by Postgres (error code 23514). The toast message in the screenshot is the friendly version of that exact error.

## Fix
Apply a single Supabase migration that updates the CHECK constraint to include the new value.

```sql
ALTER TABLE public.prompt_templates
  DROP CONSTRAINT IF EXISTS prompt_templates_usage_type_check;

ALTER TABLE public.prompt_templates
  ADD CONSTRAINT prompt_templates_usage_type_check
  CHECK (usage_type IN (
    'chat',
    'grading',
    'explanation',
    'math_enhanced',
    'grouped_retry_practice'
  ));
```

Also extend the same allowed list on `public.subject_prompt_assignments.usage_type` if a matching CHECK constraint exists there, so subject assignments can reference the new type too.

## Files touched
- One new migration file under `supabase/migrations/` containing the ALTER TABLE statements above.

## No code changes needed
- TypeScript types, hooks, and admin UI already support `grouped_retry_practice`. Once the constraint is updated, creating the template will succeed and the existing "Grouped Retry Practice Explanation" form (visible in the screenshot) will save without error.

## Verification after apply
1. Reopen Admin → System Prompts → Add Template, choose Type = "Grouped Retry Practice", click Create — should succeed with no toast error.
2. The new template appears in the list and can be activated.