-- Zawężenie dostępu do zgłoszeń demo i ustawień aplikacji do super_admin

-- demo_requests
DROP POLICY IF EXISTS "Admins can view demo requests" ON public.demo_requests;
DROP POLICY IF EXISTS "Admins can update demo requests" ON public.demo_requests;
DROP POLICY IF EXISTS "Admins can delete demo requests" ON public.demo_requests;

CREATE POLICY "super_admin_select_demo_requests" ON public.demo_requests
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_update_demo_requests" ON public.demo_requests
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_delete_demo_requests" ON public.demo_requests
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- app_settings: usuwamy furtkę "OR organization_id IS NULL"
DROP POLICY IF EXISTS "org_select_settings" ON public.app_settings;

CREATE POLICY "org_select_settings" ON public.app_settings FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));