
-- Fix backups bucket: restrict upload to service_role only
DROP POLICY IF EXISTS "Service can upload backups" ON storage.objects;
CREATE POLICY "Service role can upload backups"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'backups' AND auth.role() = 'service_role');

-- Fix backups bucket: restrict select to service_role and authenticated admins
DROP POLICY IF EXISTS "Admins can download backups" ON storage.objects;
CREATE POLICY "Service role can read backups"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'backups' AND auth.role() = 'service_role');
