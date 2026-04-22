CREATE UNIQUE INDEX IF NOT EXISTS topics_curriculum_subdomain_unique
  ON public.topics (curriculum_level_code, curriculum_subdomain_id_uuid, category_id)
  WHERE curriculum_subdomain_id_uuid IS NOT NULL;