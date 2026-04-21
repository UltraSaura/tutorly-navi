-- 1. Add country_code to subjects (metadata: which country's curriculum this subject belongs to)
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS country_code text;

-- 2. Tag existing subjects with their country (Mathematics, Physics, Français are FR program)
UPDATE public.subjects SET country_code = 'fr'
WHERE slug IN ('mathematics', 'physics', 'francais', 'history', 'geography');

-- 3. Seed French school levels (lowercase, matches importer normalization)
INSERT INTO public.school_levels (country_code, level_code, level_name, sort_order) VALUES
  ('FR', 'cp',   'CP',   1),
  ('FR', 'ce1',  'CE1',  2),
  ('FR', 'ce2',  'CE2',  3),
  ('FR', 'cm1',  'CM1',  4),
  ('FR', 'cm2',  'CM2',  5),
  ('FR', '6eme', '6ème', 6),
  ('FR', '5eme', '5ème', 7),
  ('FR', '4eme', '4ème', 8),
  ('FR', '3eme', '3ème', 9)
ON CONFLICT DO NOTHING;

-- 4. Normalize legacy uppercase levels in objectives
UPDATE public.objectives SET level = lower(level) WHERE level <> lower(level);