-- Create countries table with common countries
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create school levels table
CREATE TABLE public.school_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  level_code TEXT NOT NULL,
  level_name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (country_code) REFERENCES public.countries(code) ON DELETE CASCADE,
  UNIQUE(country_code, level_code)
);

-- Enable RLS
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_levels ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (everyone can see countries and school levels)
CREATE POLICY "Countries are publicly readable"
  ON public.countries FOR SELECT
  USING (true);

CREATE POLICY "School levels are publicly readable"
  ON public.school_levels FOR SELECT
  USING (true);

-- Insert sample countries
INSERT INTO public.countries (code, name) VALUES
  ('US', 'United States'),
  ('CA', 'Canada'),
  ('GB', 'United Kingdom'),
  ('FR', 'France'),
  ('DE', 'Germany'),
  ('AU', 'Australia'),
  ('IN', 'India'),
  ('BR', 'Brazil'),
  ('MX', 'Mexico'),
  ('ES', 'Spain');

-- Insert school levels for different countries
-- United States
INSERT INTO public.school_levels (country_code, level_code, level_name, sort_order) VALUES
  ('US', 'K', 'Kindergarten', 1),
  ('US', '1', 'Grade 1', 2),
  ('US', '2', 'Grade 2', 3),
  ('US', '3', 'Grade 3', 4),
  ('US', '4', 'Grade 4', 5),
  ('US', '5', 'Grade 5', 6),
  ('US', '6', 'Grade 6', 7),
  ('US', '7', 'Grade 7', 8),
  ('US', '8', 'Grade 8', 9),
  ('US', '9', 'Grade 9 (Freshman)', 10),
  ('US', '10', 'Grade 10 (Sophomore)', 11),
  ('US', '11', 'Grade 11 (Junior)', 12),
  ('US', '12', 'Grade 12 (Senior)', 13);

-- Canada
INSERT INTO public.school_levels (country_code, level_code, level_name, sort_order) VALUES
  ('CA', 'K', 'Kindergarten', 1),
  ('CA', '1', 'Grade 1', 2),
  ('CA', '2', 'Grade 2', 3),
  ('CA', '3', 'Grade 3', 4),
  ('CA', '4', 'Grade 4', 5),
  ('CA', '5', 'Grade 5', 6),
  ('CA', '6', 'Grade 6', 7),
  ('CA', '7', 'Grade 7', 8),
  ('CA', '8', 'Grade 8', 9),
  ('CA', '9', 'Grade 9', 10),
  ('CA', '10', 'Grade 10', 11),
  ('CA', '11', 'Grade 11', 12),
  ('CA', '12', 'Grade 12', 13);

-- United Kingdom
INSERT INTO public.school_levels (country_code, level_code, level_name, sort_order) VALUES
  ('GB', 'YR', 'Reception', 1),
  ('GB', 'Y1', 'Year 1', 2),
  ('GB', 'Y2', 'Year 2', 3),
  ('GB', 'Y3', 'Year 3', 4),
  ('GB', 'Y4', 'Year 4', 5),
  ('GB', 'Y5', 'Year 5', 6),
  ('GB', 'Y6', 'Year 6', 7),
  ('GB', 'Y7', 'Year 7', 8),
  ('GB', 'Y8', 'Year 8', 9),
  ('GB', 'Y9', 'Year 9', 10),
  ('GB', 'Y10', 'Year 10', 11),
  ('GB', 'Y11', 'Year 11', 12),
  ('GB', 'Y12', 'Year 12', 13),
  ('GB', 'Y13', 'Year 13', 14);

-- France
INSERT INTO public.school_levels (country_code, level_code, level_name, sort_order) VALUES
  ('FR', 'CP', 'CP (Cours Préparatoire)', 1),
  ('FR', 'CE1', 'CE1 (Cours Élémentaire 1)', 2),
  ('FR', 'CE2', 'CE2 (Cours Élémentaire 2)', 3),
  ('FR', 'CM1', 'CM1 (Cours Moyen 1)', 4),
  ('FR', 'CM2', 'CM2 (Cours Moyen 2)', 5),
  ('FR', '6EME', '6ème', 6),
  ('FR', '5EME', '5ème', 7),
  ('FR', '4EME', '4ème', 8),
  ('FR', '3EME', '3ème', 9),
  ('FR', '2NDE', 'Seconde', 10),
  ('FR', '1ERE', 'Première', 11),
  ('FR', 'TERM', 'Terminale', 12);

-- Australia
INSERT INTO public.school_levels (country_code, level_code, level_name, sort_order) VALUES
  ('AU', 'PREP', 'Prep/Foundation', 1),
  ('AU', 'Y1', 'Year 1', 2),
  ('AU', 'Y2', 'Year 2', 3),
  ('AU', 'Y3', 'Year 3', 4),
  ('AU', 'Y4', 'Year 4', 5),
  ('AU', 'Y5', 'Year 5', 6),
  ('AU', 'Y6', 'Year 6', 7),
  ('AU', 'Y7', 'Year 7', 8),
  ('AU', 'Y8', 'Year 8', 9),
  ('AU', 'Y9', 'Year 9', 10),
  ('AU', 'Y10', 'Year 10', 11),
  ('AU', 'Y11', 'Year 11', 12),
  ('AU', 'Y12', 'Year 12', 13);