
UPDATE storage.buckets SET public = false WHERE id = 'confirmations';

DROP POLICY IF EXISTS "Users can view confirmations" ON storage.objects;

CREATE POLICY "Users can view own org confirmations"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'confirmations' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.confirmations c
      JOIN public.activities a ON a.id = c.activity_id
      WHERE c.image_url LIKE '%' || storage.objects.name || '%'
      AND a.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    )
  )
);
