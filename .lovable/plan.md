1. Edit `supabase/functions/generate-lesson-content/index.ts`:
   - Replace the objectives-and-success-criteria database fetch block (the query against `topic_objective_links`, flattening, and the dependent `tasks` query) with the three requested empty-array declarations.
   - Remove the "Success Criteria:" block from the AI prompt template.
2. Deploy the updated `generate-lesson-content` edge function to Supabase.