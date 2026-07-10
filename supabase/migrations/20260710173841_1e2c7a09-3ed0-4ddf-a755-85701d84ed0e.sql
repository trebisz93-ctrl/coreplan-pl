
-- 1. Prevent cross-org move on activity_estimation_periods
CREATE OR REPLACE FUNCTION public.prevent_estimation_period_org_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Changing organization_id on activity_estimation_periods is not allowed';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_prevent_estimation_period_org_change ON public.activity_estimation_periods;
CREATE TRIGGER trg_prevent_estimation_period_org_change
BEFORE UPDATE ON public.activity_estimation_periods
FOR EACH ROW EXECUTE FUNCTION public.prevent_estimation_period_org_change();

-- 2. app_settings: split ALL policy into explicit write policies, keep SELECT for members
DROP POLICY IF EXISTS org_admin_manage_settings ON public.app_settings;
CREATE POLICY org_admin_insert_settings ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND get_org_role(auth.uid(), organization_id) = 'org_admin'
  );
CREATE POLICY org_admin_update_settings ON public.app_settings
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND get_org_role(auth.uid(), organization_id) = 'org_admin'
  )
  WITH CHECK (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND get_org_role(auth.uid(), organization_id) = 'org_admin'
  );
CREATE POLICY org_admin_delete_settings ON public.app_settings
  FOR DELETE TO authenticated
  USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND get_org_role(auth.uid(), organization_id) = 'org_admin'
  );

-- 3. client_assignments: same explicit split
DROP POLICY IF EXISTS org_admin_manage_assignments ON public.client_assignments;
CREATE POLICY org_admin_insert_assignments ON public.client_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND get_org_role(auth.uid(), organization_id) = 'org_admin'
  );
CREATE POLICY org_admin_update_assignments ON public.client_assignments
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND get_org_role(auth.uid(), organization_id) = 'org_admin'
  )
  WITH CHECK (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND get_org_role(auth.uid(), organization_id) = 'org_admin'
  );
CREATE POLICY org_admin_delete_assignments ON public.client_assignments
  FOR DELETE TO authenticated
  USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
    AND get_org_role(auth.uid(), organization_id) = 'org_admin'
  );

-- 4. clients: enforce organization_clients link in same transaction via deferred constraint trigger
CREATE OR REPLACE FUNCTION public.enforce_client_org_link()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  -- Super admins and system contexts (no auth.uid) are exempt.
  IF _uid IS NULL OR is_super_admin(_uid) THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM organization_clients oc
    WHERE oc.client_id = NEW.id
      AND oc.organization_id IN (SELECT get_user_org_ids(_uid))
  ) THEN
    RAISE EXCEPTION 'Client % must be linked to one of your organizations via organization_clients', NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enforce_client_org_link ON public.clients;
CREATE CONSTRAINT TRIGGER trg_enforce_client_org_link
AFTER INSERT ON public.clients
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.enforce_client_org_link();

-- 5. Backups bucket: explicitly ensure no signed-in user (incl. super_admin) can access via Data/Storage API.
-- Existing service_role policies remain. Add an explicit no-op policy that prevents any authenticated/anon SELECT.
-- (RLS is deny-by-default; this is a belt-and-braces documentation policy.)
DROP POLICY IF EXISTS "Deny non-service access to backups" ON storage.objects;
CREATE POLICY "Deny non-service access to backups" ON storage.objects
  FOR ALL TO authenticated, anon
  USING (bucket_id <> 'backups')
  WITH CHECK (bucket_id <> 'backups');

-- 6. Revoke EXECUTE from authenticated/anon on internal-only SECURITY DEFINER functions.
-- Keep public: has_role, is_super_admin, get_org_role, get_user_org_ids, is_org_member,
--              grant_prgm_role, revoke_prgm_role (called from client).
REVOKE EXECUTE ON FUNCTION public.audit_trigger_fn() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_backups() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.notify_admin_new_user() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.protect_profile_columns() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.purge_expired_trash() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.send_notification_email() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.validate_org_role_change() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.validate_super_admin_role() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.prevent_estimation_period_org_change() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_client_org_link() FROM PUBLIC, authenticated, anon;
