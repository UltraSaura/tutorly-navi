ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS icon_image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('subject-icons', 'subject-icons', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

DROP POLICY IF EXISTS "Public can read subject icons" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload subject icons" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update subject icons" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete subject icons" ON storage.objects;

CREATE POLICY "Public can read subject icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'subject-icons');

CREATE POLICY "Admins can upload subject icons"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'subject-icons'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND user_type = 'admin'
    )
  )
);

CREATE POLICY "Admins can update subject icons"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'subject-icons'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND user_type = 'admin'
    )
  )
)
WITH CHECK (
  bucket_id = 'subject-icons'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND user_type = 'admin'
    )
  )
);

CREATE POLICY "Admins can delete subject icons"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'subject-icons'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND user_type = 'admin'
    )
  )
);
