-- Organizations: add soft-delete + detail fields + onboarding
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS purge_at timestamptz,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS nip text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS internal_note text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Profiles: add soft-delete columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS purge_at timestamptz;

-- Clients: add deleted_by, purge_at
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS purge_at timestamptz;

-- Products: add deleted_by, purge_at
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS purge_at timestamptz;

-- Packages: add deleted_by, purge_at
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS purge_at timestamptz;

-- Trash registry table
CREATE TABLE IF NOT EXISTS public.trash_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL,
  record_id uuid NOT NULL,
  record_name text NOT NULL,
  deleted_by uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  purge_at timestamptz NOT NULL DEFAULT (now() + interval '180 days'),
  organization_id uuid,
  restored_at timestamptz
);

ALTER TABLE public.trash_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_trash" ON public.trash_registry
  FOR ALL USING (is_super_admin(auth.uid()));

-- Function to auto-purge expired trash items
CREATE OR REPLACE FUNCTION public.purge_expired_trash()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM trash_registry WHERE purge_at <= now() AND restored_at IS NULL LOOP
    IF r.record_type = 'organization' THEN
      DELETE FROM organizations WHERE id = r.record_id;
    ELSIF r.record_type = 'user' THEN
      DELETE FROM profiles WHERE user_id = r.record_id;
    ELSIF r.record_type = 'client' THEN
      DELETE FROM clients WHERE id = r.record_id;
    ELSIF r.record_type = 'product' THEN
      DELETE FROM products WHERE id = r.record_id;
    ELSIF r.record_type = 'package' THEN
      DELETE FROM packages WHERE id = r.record_id;
    END IF;
    DELETE FROM trash_registry WHERE id = r.id;
  END LOOP;
END;
$$;