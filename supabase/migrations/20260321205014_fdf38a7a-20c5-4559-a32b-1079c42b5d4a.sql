
-- Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create organization_members table
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Create organization_clients table
CREATE TABLE public.organization_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, client_id)
);

ALTER TABLE public.organization_clients ENABLE ROW LEVEL SECURITY;

-- Create system_logs table
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Security definer: is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Security definer: get_user_org_ids (returns all org ids for user)
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = _user_id
$$;

-- Security definer: is_org_member
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- Security definer: get_org_role
CREATE OR REPLACE FUNCTION public.get_org_role(_user_id uuid, _org_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_role FROM public.organization_members
  WHERE user_id = _user_id AND organization_id = _org_id
  LIMIT 1
$$;

-- RLS for organizations
CREATE POLICY "Super admin sees all orgs" ON public.organizations
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Org members can view own org" ON public.organizations
  FOR SELECT USING (id IN (SELECT public.get_user_org_ids(auth.uid())));

-- RLS for organization_members
CREATE POLICY "Super admin manages all members" ON public.organization_members
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Org admins can view own org members" ON public.organization_members
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can view own membership" ON public.organization_members
  FOR SELECT USING (user_id = auth.uid());

-- RLS for organization_clients
CREATE POLICY "Super admin manages all org clients" ON public.organization_clients
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Org members can view own org clients" ON public.organization_clients
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org admins can manage org clients" ON public.organization_clients
  FOR ALL USING (
    public.get_org_role(auth.uid(), organization_id) IN ('org_admin', 'admin')
  );

-- RLS for system_logs
CREATE POLICY "Super admin views all logs" ON public.system_logs
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin inserts logs" ON public.system_logs
  FOR INSERT WITH CHECK (true);

-- Update trigger for organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
