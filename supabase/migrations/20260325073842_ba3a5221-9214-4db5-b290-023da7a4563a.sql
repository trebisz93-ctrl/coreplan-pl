
-- Allow org_admin to manage members in their own organization
CREATE POLICY "org_admin_manage_members"
ON public.organization_members
FOR ALL
TO authenticated
USING (
  get_org_role(auth.uid(), organization_id) = 'org_admin'
)
WITH CHECK (
  get_org_role(auth.uid(), organization_id) = 'org_admin'
);

-- Allow org_admin to view user_roles for members in their org
CREATE POLICY "org_admin_view_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT om.user_id FROM public.organization_members om
    WHERE om.organization_id IN (
      SELECT om2.organization_id FROM public.organization_members om2
      WHERE om2.user_id = auth.uid() AND om2.org_role = 'org_admin'
    )
  )
);
