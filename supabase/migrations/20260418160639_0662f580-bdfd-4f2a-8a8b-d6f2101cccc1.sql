-- ============================================================
-- PHASE 2 (retry): Backfill + constraints with explicit text casts
-- Non-breaking. Legacy text columns stay intact.
-- ============================================================

-- ---------- 0. Pre-cleanup: ensure id_new uniqueness on parents ----------
CREATE UNIQUE INDEX IF NOT EXISTS uq_subdomains_id_new ON public.subdomains(id_new);
CREATE UNIQUE INDEX IF NOT EXISTS uq_objectives_id_new ON public.objectives(id_new);
CREATE UNIQUE INDEX IF NOT EXISTS uq_success_criteria_id_new ON public.success_criteria(id_new);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_id_new ON public.tasks(id_new);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lessons_id_new ON public.lessons(id_new);
CREATE UNIQUE INDEX IF NOT EXISTS uq_domains_id ON public.domains(id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_slug ON public.subjects(slug);

-- ---------- 1. domains.subject_id ----------
UPDATE public.domains d
SET subject_id = sub.subject_uuid
FROM (
  SELECT DISTINCT ON (o.domain) o.domain AS domain_code, s.id AS subject_uuid
  FROM public.objectives o
  JOIN public.subjects s ON s.slug = o.subject_id::text
  WHERE o.domain IS NOT NULL
) sub
WHERE d.domain = sub.domain_code
  AND d.subject_id IS NULL;

-- ---------- 2. subdomains.subject_id + subdomains.domain_id_new ----------
UPDATE public.subdomains sd
SET domain_id_new = d.id,
    subject_id = d.subject_id
FROM public.domains d
WHERE sd.domain = d.domain
  AND sd.domain_id_new IS NULL;

-- ---------- 3. objectives.subject_id_uuid ----------
UPDATE public.objectives o
SET subject_id_uuid = s.id
FROM public.subjects s
WHERE s.slug = o.subject_id::text
  AND o.subject_id_uuid IS NULL;

-- ---------- 4. objectives.domain_id_uuid ----------
UPDATE public.objectives o
SET domain_id_uuid = d.id
FROM public.domains d
WHERE d.domain = o.domain
  AND (d.subject_id = o.subject_id_uuid OR o.subject_id_uuid IS NULL)
  AND o.domain_id_uuid IS NULL;

-- ---------- 5. objectives.subdomain_id_uuid ----------
UPDATE public.objectives o
SET subdomain_id_uuid = sd.id_new
FROM public.subdomains sd
WHERE sd.subdomain = o.subdomain
  AND (sd.domain_id_new = o.domain_id_uuid OR o.domain_id_uuid IS NULL)
  AND o.subdomain_id_uuid IS NULL;

-- ---------- 6. success_criteria.objective_id_uuid ----------
UPDATE public.success_criteria sc
SET objective_id_uuid = o.id_new
FROM public.objectives o
WHERE o.id = sc.objective_id
  AND sc.objective_id_uuid IS NULL;

-- ---------- 7. Cascade subject/domain/subdomain on success_criteria ----------
UPDATE public.success_criteria sc
SET subject_id_uuid   = COALESCE(sc.subject_id_uuid,   o.subject_id_uuid),
    domain_id_uuid    = COALESCE(sc.domain_id_uuid,    o.domain_id_uuid),
    subdomain_id_uuid = COALESCE(sc.subdomain_id_uuid, o.subdomain_id_uuid)
FROM public.objectives o
WHERE o.id_new = sc.objective_id_uuid;

-- ---------- 8. tasks.success_criterion_id_uuid + cascaded FKs ----------
UPDATE public.tasks t
SET success_criterion_id_uuid = sc.id_new
FROM public.success_criteria sc
WHERE sc.id = t.success_criterion_id
  AND t.success_criterion_id_uuid IS NULL;

UPDATE public.tasks t
SET subject_id_uuid   = COALESCE(t.subject_id_uuid,   sc.subject_id_uuid),
    domain_id_uuid    = COALESCE(t.domain_id_uuid,    sc.domain_id_uuid),
    subdomain_id_uuid = COALESCE(t.subdomain_id_uuid, sc.subdomain_id_uuid)
FROM public.success_criteria sc
WHERE sc.id_new = t.success_criterion_id_uuid;

-- ---------- 9. topics.curriculum_subject_id_uuid ----------
UPDATE public.topics tp
SET curriculum_subject_id_uuid = s.id
FROM public.subjects s
WHERE s.slug = tp.curriculum_subject_id::text
  AND tp.curriculum_subject_id_uuid IS NULL;

-- ---------- 10. topics.curriculum_domain_id_uuid ----------
UPDATE public.topics tp
SET curriculum_domain_id_uuid = d.id
FROM public.domains d
WHERE d.domain = tp.curriculum_domain_id
  AND (d.subject_id = tp.curriculum_subject_id_uuid OR tp.curriculum_subject_id_uuid IS NULL)
  AND tp.curriculum_domain_id_uuid IS NULL;

-- ---------- 11. topics.curriculum_subdomain_id_uuid ----------
UPDATE public.topics tp
SET curriculum_subdomain_id_uuid = sd.id_new
FROM public.subdomains sd
WHERE sd.subdomain = tp.curriculum_subdomain_id
  AND (sd.domain_id_new = tp.curriculum_domain_id_uuid OR tp.curriculum_domain_id_uuid IS NULL)
  AND tp.curriculum_subdomain_id_uuid IS NULL;

-- ---------- 12. topic_objective_links.objective_id_uuid ----------
UPDATE public.topic_objective_links tol
SET objective_id_uuid = o.id_new
FROM public.objectives o
WHERE o.id = tol.objective_id
  AND tol.objective_id_uuid IS NULL;

-- ---------- 13. lessons.topic_id (best-effort via topic_objective_links) ----------
UPDATE public.lessons l
SET topic_id = sub.topic_id
FROM (
  SELECT DISTINCT ON (l2.id) l2.id AS lesson_id, tol.topic_id
  FROM public.lessons l2
  CROSS JOIN LATERAL jsonb_array_elements_text(l2.objective_ids) AS oid(val)
  JOIN public.topic_objective_links tol ON tol.objective_id = oid.val
  WHERE l2.topic_id IS NULL
) sub
WHERE l.id = sub.lesson_id
  AND l.topic_id IS NULL;

-- ---------- 14. videos.subject_id_uuid (text -> uuid via subjects.slug) ----------
UPDATE public.videos v
SET subject_id_uuid = s.id
FROM public.subjects s
WHERE s.slug = v.subject_id::text
  AND v.subject_id_uuid IS NULL;

-- ---------- 15. objective_mastery.objective_id_uuid ----------
UPDATE public.objective_mastery om
SET objective_id_uuid = o.id_new
FROM public.objectives o
WHERE o.id = om.objective_id
  AND om.objective_id_uuid IS NULL;

-- ---------- 16. lesson_sessions.lesson_id_uuid ----------
UPDATE public.lesson_sessions ls
SET lesson_id_uuid = l.id_new
FROM public.lessons l
WHERE l.id = ls.lesson_id
  AND ls.lesson_id_uuid IS NULL;

-- ============================================================
-- Foreign key constraints on new UUID columns
-- ============================================================

ALTER TABLE public.domains
  DROP CONSTRAINT IF EXISTS domains_subject_id_fkey,
  ADD CONSTRAINT domains_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

ALTER TABLE public.subdomains
  DROP CONSTRAINT IF EXISTS subdomains_subject_id_fkey,
  ADD CONSTRAINT subdomains_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS subdomains_domain_id_new_fkey,
  ADD CONSTRAINT subdomains_domain_id_new_fkey
    FOREIGN KEY (domain_id_new) REFERENCES public.domains(id) ON DELETE CASCADE;

ALTER TABLE public.objectives
  DROP CONSTRAINT IF EXISTS objectives_subject_id_uuid_fkey,
  ADD CONSTRAINT objectives_subject_id_uuid_fkey
    FOREIGN KEY (subject_id_uuid) REFERENCES public.subjects(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS objectives_domain_id_uuid_fkey,
  ADD CONSTRAINT objectives_domain_id_uuid_fkey
    FOREIGN KEY (domain_id_uuid) REFERENCES public.domains(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS objectives_subdomain_id_uuid_fkey,
  ADD CONSTRAINT objectives_subdomain_id_uuid_fkey
    FOREIGN KEY (subdomain_id_uuid) REFERENCES public.subdomains(id_new) ON DELETE SET NULL;

ALTER TABLE public.success_criteria
  DROP CONSTRAINT IF EXISTS success_criteria_objective_id_uuid_fkey,
  ADD CONSTRAINT success_criteria_objective_id_uuid_fkey
    FOREIGN KEY (objective_id_uuid) REFERENCES public.objectives(id_new) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS success_criteria_subject_id_uuid_fkey,
  ADD CONSTRAINT success_criteria_subject_id_uuid_fkey
    FOREIGN KEY (subject_id_uuid) REFERENCES public.subjects(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS success_criteria_domain_id_uuid_fkey,
  ADD CONSTRAINT success_criteria_domain_id_uuid_fkey
    FOREIGN KEY (domain_id_uuid) REFERENCES public.domains(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS success_criteria_subdomain_id_uuid_fkey,
  ADD CONSTRAINT success_criteria_subdomain_id_uuid_fkey
    FOREIGN KEY (subdomain_id_uuid) REFERENCES public.subdomains(id_new) ON DELETE SET NULL;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_success_criterion_id_uuid_fkey,
  ADD CONSTRAINT tasks_success_criterion_id_uuid_fkey
    FOREIGN KEY (success_criterion_id_uuid) REFERENCES public.success_criteria(id_new) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS tasks_subject_id_uuid_fkey,
  ADD CONSTRAINT tasks_subject_id_uuid_fkey
    FOREIGN KEY (subject_id_uuid) REFERENCES public.subjects(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS tasks_domain_id_uuid_fkey,
  ADD CONSTRAINT tasks_domain_id_uuid_fkey
    FOREIGN KEY (domain_id_uuid) REFERENCES public.domains(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS tasks_subdomain_id_uuid_fkey,
  ADD CONSTRAINT tasks_subdomain_id_uuid_fkey
    FOREIGN KEY (subdomain_id_uuid) REFERENCES public.subdomains(id_new) ON DELETE SET NULL;

ALTER TABLE public.topics
  DROP CONSTRAINT IF EXISTS topics_curriculum_subject_id_uuid_fkey,
  ADD CONSTRAINT topics_curriculum_subject_id_uuid_fkey
    FOREIGN KEY (curriculum_subject_id_uuid) REFERENCES public.subjects(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS topics_curriculum_domain_id_uuid_fkey,
  ADD CONSTRAINT topics_curriculum_domain_id_uuid_fkey
    FOREIGN KEY (curriculum_domain_id_uuid) REFERENCES public.domains(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS topics_curriculum_subdomain_id_uuid_fkey,
  ADD CONSTRAINT topics_curriculum_subdomain_id_uuid_fkey
    FOREIGN KEY (curriculum_subdomain_id_uuid) REFERENCES public.subdomains(id_new) ON DELETE SET NULL;

ALTER TABLE public.topic_objective_links
  DROP CONSTRAINT IF EXISTS topic_objective_links_objective_id_uuid_fkey,
  ADD CONSTRAINT topic_objective_links_objective_id_uuid_fkey
    FOREIGN KEY (objective_id_uuid) REFERENCES public.objectives(id_new) ON DELETE CASCADE;

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_topic_id_fkey,
  ADD CONSTRAINT lessons_topic_id_fkey
    FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE SET NULL;

ALTER TABLE public.videos
  DROP CONSTRAINT IF EXISTS videos_subject_id_uuid_fkey,
  ADD CONSTRAINT videos_subject_id_uuid_fkey
    FOREIGN KEY (subject_id_uuid) REFERENCES public.subjects(id) ON DELETE SET NULL;

ALTER TABLE public.objective_mastery
  DROP CONSTRAINT IF EXISTS objective_mastery_objective_id_uuid_fkey,
  ADD CONSTRAINT objective_mastery_objective_id_uuid_fkey
    FOREIGN KEY (objective_id_uuid) REFERENCES public.objectives(id_new) ON DELETE CASCADE;

ALTER TABLE public.lesson_sessions
  DROP CONSTRAINT IF EXISTS lesson_sessions_lesson_id_uuid_fkey,
  ADD CONSTRAINT lesson_sessions_lesson_id_uuid_fkey
    FOREIGN KEY (lesson_id_uuid) REFERENCES public.lessons(id_new) ON DELETE CASCADE;

-- ============================================================
-- Unique constraints (natural keys for upsert)
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_domains_subject_code
  ON public.domains(subject_id, code)
  WHERE subject_id IS NOT NULL AND code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subdomains_domain_code
  ON public.subdomains(domain_id_new, code)
  WHERE domain_id_new IS NOT NULL AND code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_topic_objective_links_topic_objective
  ON public.topic_objective_links(topic_id, objective_id_uuid)
  WHERE objective_id_uuid IS NOT NULL;

-- ============================================================
-- Indexes on new FK columns for query performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_domains_subject_id ON public.domains(subject_id);
CREATE INDEX IF NOT EXISTS idx_subdomains_subject_id ON public.subdomains(subject_id);
CREATE INDEX IF NOT EXISTS idx_subdomains_domain_id_new ON public.subdomains(domain_id_new);
CREATE INDEX IF NOT EXISTS idx_objectives_subject_id_uuid ON public.objectives(subject_id_uuid);
CREATE INDEX IF NOT EXISTS idx_objectives_domain_id_uuid ON public.objectives(domain_id_uuid);
CREATE INDEX IF NOT EXISTS idx_objectives_subdomain_id_uuid ON public.objectives(subdomain_id_uuid);
CREATE INDEX IF NOT EXISTS idx_success_criteria_objective_id_uuid ON public.success_criteria(objective_id_uuid);
CREATE INDEX IF NOT EXISTS idx_tasks_success_criterion_id_uuid ON public.tasks(success_criterion_id_uuid);
CREATE INDEX IF NOT EXISTS idx_topics_curriculum_subject_id_uuid ON public.topics(curriculum_subject_id_uuid);
CREATE INDEX IF NOT EXISTS idx_topics_curriculum_domain_id_uuid ON public.topics(curriculum_domain_id_uuid);
CREATE INDEX IF NOT EXISTS idx_topics_curriculum_subdomain_id_uuid ON public.topics(curriculum_subdomain_id_uuid);
CREATE INDEX IF NOT EXISTS idx_topic_objective_links_objective_id_uuid ON public.topic_objective_links(objective_id_uuid);
CREATE INDEX IF NOT EXISTS idx_lessons_topic_id ON public.lessons(topic_id);
CREATE INDEX IF NOT EXISTS idx_videos_subject_id_uuid ON public.videos(subject_id_uuid);
CREATE INDEX IF NOT EXISTS idx_objective_mastery_objective_id_uuid ON public.objective_mastery(objective_id_uuid);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_lesson_id_uuid ON public.lesson_sessions(lesson_id_uuid);
