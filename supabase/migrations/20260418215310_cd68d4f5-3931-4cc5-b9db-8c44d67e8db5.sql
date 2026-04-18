-- 1) Lock down user_roles: prevent privilege escalation by authenticated users
-- Add a RESTRICTIVE deny-all policy for INSERT/UPDATE/DELETE for anyone other than super_admin/service_role.
-- The existing super_admin_all_roles permissive policy + service_role bypass remain functional.

DROP POLICY IF EXISTS deny_role_writes_non_admin ON public.user_roles;
CREATE POLICY deny_role_writes_non_admin
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- 2) Trash registry: allow org members to view their org's trash entries
-- TrashView is super_admin-only in UI but the table has organization_id.
-- Allow org members SELECT scoped by organization_id; writes still restricted to super_admin.

DROP POLICY IF EXISTS org_members_select_trash ON public.trash_registry;
CREATE POLICY org_members_select_trash
ON public.trash_registry
FOR SELECT
TO authenticated
USING (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  OR deleted_by = auth.uid()
);
