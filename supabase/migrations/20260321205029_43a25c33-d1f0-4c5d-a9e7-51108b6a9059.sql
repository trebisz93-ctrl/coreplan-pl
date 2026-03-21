
-- Fix: restrict system_logs insert to authenticated users only
DROP POLICY IF EXISTS "Super admin inserts logs" ON public.system_logs;
CREATE POLICY "Authenticated can insert logs" ON public.system_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- Add organization_id to business tables (nullable initially for migration)
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.media_plans ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_types ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.backup_history ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.client_assignments ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
