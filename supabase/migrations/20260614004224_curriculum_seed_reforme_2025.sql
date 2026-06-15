insert into public.curriculum_edition (
  subject,
  cycle,
  bo_reference,
  bo_url,
  source_pdf_url,
  published_at,
  status
)
values
  (
    'francais',
    'cycle 2',
    'BO n.41 du 31 octobre 2024',
    'https://www.education.gouv.fr/bo/2024/Hebdo41/MENE2415135A',
    null,
    date '2024-10-31',
    'active'
  ),
  (
    'mathematiques',
    'cycle 2',
    'BO n.41 du 31 octobre 2024',
    'https://www.education.gouv.fr/bo/2024/Hebdo41/MENE2415135A',
    null,
    date '2024-10-31',
    'active'
  ),
  (
    'francais',
    'cycle 3',
    'BO n.16 du 17 avril 2025',
    'https://www.education.gouv.fr/bo/2025/Hebdo16/MENE2504620A',
    'https://www.education.gouv.fr/sites/default/files/ensel620_annexe1.pdf',
    date '2025-04-17',
    'active'
  ),
  (
    'mathematiques',
    'cycle 3',
    'BO n.16 du 17 avril 2025',
    'https://www.education.gouv.fr/bo/2025/Hebdo16/MENE2504620A',
    'https://www.education.gouv.fr/sites/default/files/ensel620_annexe2-v2.pdf',
    date '2025-04-17',
    'active'
  ),
  (
    'francais',
    'cycle 3 ancien',
    'ANCIEN cycle 3 - A COMPLETER',
    null,
    null,
    null,
    'projet'
  ),
  (
    'mathematiques',
    'cycle 3 ancien',
    'ANCIEN cycle 3 - A COMPLETER',
    null,
    null,
    null,
    'projet'
  )
on conflict (subject, cycle, bo_reference) do update
set
  bo_url = excluded.bo_url,
  source_pdf_url = excluded.source_pdf_url,
  published_at = excluded.published_at,
  status = excluded.status;

-- TODO: renseigner la référence BO exacte des éditions ANCIEN cycle 3 avant de générer du contenu CM2.

with applicability(level, subject, school_year, status, valid_from, cycle, bo_reference) as (
  values
    ('CP'::public.class_level, 'francais'::public.subject_code, '2025-2026', 'en_vigueur'::public.applicability_status, date '2025-09-01', 'cycle 2', 'BO n.41 du 31 octobre 2024'),
    ('CE1'::public.class_level, 'francais'::public.subject_code, '2025-2026', 'en_vigueur'::public.applicability_status, date '2025-09-01', 'cycle 2', 'BO n.41 du 31 octobre 2024'),
    ('CE2'::public.class_level, 'francais'::public.subject_code, '2025-2026', 'en_vigueur'::public.applicability_status, date '2025-09-01', 'cycle 2', 'BO n.41 du 31 octobre 2024'),
    ('CP'::public.class_level, 'mathematiques'::public.subject_code, '2025-2026', 'en_vigueur'::public.applicability_status, date '2025-09-01', 'cycle 2', 'BO n.41 du 31 octobre 2024'),
    ('CE1'::public.class_level, 'mathematiques'::public.subject_code, '2025-2026', 'en_vigueur'::public.applicability_status, date '2025-09-01', 'cycle 2', 'BO n.41 du 31 octobre 2024'),
    ('CE2'::public.class_level, 'mathematiques'::public.subject_code, '2025-2026', 'en_vigueur'::public.applicability_status, date '2025-09-01', 'cycle 2', 'BO n.41 du 31 octobre 2024'),
    ('CM1'::public.class_level, 'francais'::public.subject_code, '2025-2026', 'transitoire'::public.applicability_status, date '2025-09-01', 'cycle 3', 'BO n.16 du 17 avril 2025'),
    ('6e'::public.class_level, 'francais'::public.subject_code, '2025-2026', 'transitoire'::public.applicability_status, date '2025-09-01', 'cycle 3', 'BO n.16 du 17 avril 2025'),
    ('CM1'::public.class_level, 'mathematiques'::public.subject_code, '2025-2026', 'transitoire'::public.applicability_status, date '2025-09-01', 'cycle 3', 'BO n.16 du 17 avril 2025'),
    ('6e'::public.class_level, 'mathematiques'::public.subject_code, '2025-2026', 'transitoire'::public.applicability_status, date '2025-09-01', 'cycle 3', 'BO n.16 du 17 avril 2025'),
    ('CM2'::public.class_level, 'francais'::public.subject_code, '2025-2026', 'transitoire'::public.applicability_status, date '2025-09-01', 'cycle 3 ancien', 'ANCIEN cycle 3 - A COMPLETER'),
    ('CM2'::public.class_level, 'mathematiques'::public.subject_code, '2025-2026', 'transitoire'::public.applicability_status, date '2025-09-01', 'cycle 3 ancien', 'ANCIEN cycle 3 - A COMPLETER'),
    ('CM2'::public.class_level, 'francais'::public.subject_code, '2026-2027', 'planifie'::public.applicability_status, date '2026-09-01', 'cycle 3', 'BO n.16 du 17 avril 2025'),
    ('CM2'::public.class_level, 'mathematiques'::public.subject_code, '2026-2027', 'planifie'::public.applicability_status, date '2026-09-01', 'cycle 3', 'BO n.16 du 17 avril 2025')
)
insert into public.curriculum_applicability (
  level,
  subject,
  school_year,
  track,
  edition_id,
  status,
  valid_from,
  valid_until
)
select
  a.level,
  a.subject,
  a.school_year,
  null,
  e.id,
  a.status,
  a.valid_from,
  null
from applicability a
join public.curriculum_edition e
  on e.subject = a.subject
  and e.cycle = a.cycle
  and e.bo_reference = a.bo_reference
where not exists (
  select 1
  from public.curriculum_applicability existing
  where existing.level = a.level
    and existing.subject = a.subject
    and existing.school_year = a.school_year
    and existing.track is null
);
