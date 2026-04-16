-- Allow super_admin to read email send log
CREATE POLICY "Super admin can read email send log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Allow super_admin to read suppressed emails
CREATE POLICY "Super admin can read suppressed emails"
ON public.suppressed_emails
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));