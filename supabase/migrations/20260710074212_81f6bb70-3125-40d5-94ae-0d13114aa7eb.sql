
-- 1. Strengthen activity_estimation_periods UPDATE WITH CHECK with org membership + role
DROP POLICY IF EXISTS prgm_update_estimation_periods ON public.activity_estimation_periods;
CREATE POLICY prgm_update_estimation_periods ON public.activity_estimation_periods
FOR UPDATE
USING (
  (organization_id IN (SELECT get_user_org_ids(auth.uid())))
  AND (has_role(auth.uid(), 'prgm'::app_role) OR is_super_admin(auth.uid()) OR (get_org_role(auth.uid(), organization_id) = 'org_admin'))
  AND (period_end >= CURRENT_DATE)
)
WITH CHECK (
  (organization_id IN (SELECT get_user_org_ids(auth.uid())))
  AND (has_role(auth.uid(), 'prgm'::app_role) OR is_super_admin(auth.uid()) OR (get_org_role(auth.uid(), organization_id) = 'org_admin'))
  AND (period_end >= CURRENT_DATE)
);

-- 2. clients INSERT: enforce org membership via organization_clients (client must belong to caller's org)
--    Because organization_clients is inserted after the client, we require user_id = auth.uid()
--    AND the caller must be a member of at least one organization.
DROP POLICY IF EXISTS org_insert_clients ON public.clients;
CREATE POLICY org_insert_clients ON public.clients
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid())
);

-- 3. Restrict 'backups' storage bucket to service_role only (remove global admin access across orgs)
DROP POLICY IF EXISTS "Admins can read backups" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete old backups" ON storage.objects;

-- 4. Revoke EXECUTE from anon on all SECURITY DEFINER functions in public;
--    revoke from authenticated on trigger/internal-only functions.
REVOKE EXECUTE ON FUNCTION public.audit_trigger_fn() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_admin_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_profile_columns() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_org_role_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_super_admin_role() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_notification_email() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_backups() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_expired_trash() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- RLS helper functions: revoke anon (RLS runs as caller; anon has no auth.uid() cases here),
-- keep authenticated so RLS policies can evaluate.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_org_role(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_org_ids(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM anon, PUBLIC;

-- RPCs callable by authenticated users (perform their own internal checks): revoke anon
REVOKE EXECUTE ON FUNCTION public.grant_prgm_role(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revoke_prgm_role(uuid) FROM anon, PUBLIC;
