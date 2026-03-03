
-- ============================================
-- 1. SOFT-DELETE: Add deleted_at to key tables
-- ============================================

ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.media_plans ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.confirmations ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Indexes for soft-delete filtering
CREATE INDEX IF NOT EXISTS idx_activities_deleted_at ON public.activities(deleted_at);
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON public.clients(deleted_at);
CREATE INDEX IF NOT EXISTS idx_media_plans_deleted_at ON public.media_plans(deleted_at);
CREATE INDEX IF NOT EXISTS idx_packages_deleted_at ON public.packages(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_confirmations_deleted_at ON public.confirmations(deleted_at);

-- ============================================
-- 2. AUDIT LOG table
-- ============================================

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,          -- 'INSERT', 'UPDATE', 'DELETE', 'RESTORE'
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
ON public.audit_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
ON public.audit_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can see all audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 3. AUDIT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _record_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _user_id := OLD.user_id;
    _record_id := OLD.id;
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data)
    VALUES (_user_id, 'DELETE', TG_TABLE_NAME, _record_id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    _user_id := NEW.user_id;
    _record_id := NEW.id;
    -- Log soft-delete as 'DELETE' action
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data)
      VALUES (_user_id, 'SOFT_DELETE', TG_TABLE_NAME, _record_id, to_jsonb(OLD));
    -- Log restore
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      INSERT INTO public.audit_log (user_id, action, table_name, record_id, new_data)
      VALUES (_user_id, 'RESTORE', TG_TABLE_NAME, _record_id, to_jsonb(NEW));
    ELSE
      INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
      VALUES (_user_id, 'UPDATE', TG_TABLE_NAME, _record_id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    _user_id := NEW.user_id;
    _record_id := NEW.id;
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, new_data)
    VALUES (_user_id, 'INSERT', TG_TABLE_NAME, _record_id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- ============================================
-- 4. ATTACH AUDIT TRIGGERS to key tables
-- ============================================

CREATE TRIGGER audit_activities
AFTER INSERT OR UPDATE OR DELETE ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_clients
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_media_plans
AFTER INSERT OR UPDATE OR DELETE ON public.media_plans
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_packages
AFTER INSERT OR UPDATE OR DELETE ON public.packages
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
