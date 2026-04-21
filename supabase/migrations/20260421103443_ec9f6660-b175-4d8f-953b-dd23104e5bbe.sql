-- Seed: add EMC (Éducation Morale et Civique) as a curriculum subject
-- Idempotent: safe to re-run, no-op if slug='emc' already exists.

insert into public.subjects (
  id,
  slug,
  name,
  country_code,
  language,
  color_scheme,
  icon_name,
  is_active,
  order_index
)
select
  'e3c11111-1111-4111-8111-111111111111'::uuid,
  'emc',
  'Éducation Morale et Civique',
  'fr',
  'fr',
  'amber',
  'Scale',
  true,
  6
where not exists (
  select 1 from public.subjects where slug = 'emc'
);