DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'domains'
  ) THEN
    ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can read domains" ON public.domains;
    CREATE POLICY "Anyone can read domains" ON public.domains FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Admins can manage domains" ON public.domains;
    CREATE POLICY "Admins can manage domains" ON public.domains FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subdomains'
  ) THEN
    ALTER TABLE public.subdomains ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can read subdomains" ON public.subdomains;
    CREATE POLICY "Anyone can read subdomains" ON public.subdomains FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Admins can manage subdomains" ON public.subdomains;
    CREATE POLICY "Admins can manage subdomains" ON public.subdomains FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'objectives'
  ) THEN
    ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can read objectives" ON public.objectives;
    CREATE POLICY "Anyone can read objectives" ON public.objectives FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Admins can manage objectives" ON public.objectives;
    CREATE POLICY "Admins can manage objectives" ON public.objectives FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'success_criteria'
  ) THEN
    ALTER TABLE public.success_criteria ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can read success_criteria" ON public.success_criteria;
    CREATE POLICY "Anyone can read success_criteria" ON public.success_criteria FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Admins can manage success_criteria" ON public.success_criteria;
    CREATE POLICY "Admins can manage success_criteria" ON public.success_criteria FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can read tasks" ON public.tasks;
    CREATE POLICY "Anyone can read tasks" ON public.tasks FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;
    CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'units'
  ) THEN
    ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can read units" ON public.units;
    CREATE POLICY "Anyone can read units" ON public.units FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Admins can manage units" ON public.units;
    CREATE POLICY "Admins can manage units" ON public.units FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lessons'
  ) THEN
    ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can read lessons" ON public.lessons;
    CREATE POLICY "Anyone can read lessons" ON public.lessons FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
    CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
