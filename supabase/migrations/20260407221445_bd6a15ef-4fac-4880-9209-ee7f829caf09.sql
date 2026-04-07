
CREATE TABLE public.import_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id),
  client_id uuid REFERENCES public.clients(id),
  client_name text NOT NULL,
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_import_history" ON public.import_history
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "org_insert_import_history" ON public.import_history
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "super_admin_all_import_history" ON public.import_history
  FOR ALL TO public
  USING (is_super_admin(auth.uid()));
