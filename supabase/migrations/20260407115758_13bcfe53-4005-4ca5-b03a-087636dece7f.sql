
-- =============================================
-- 1. Protect profile columns from non-super_admin
-- =============================================
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    NEW.id := OLD.id;
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_cols
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- =============================================
-- 2. Prevent org_role escalation by non-admins
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_org_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.org_role IS DISTINCT FROM NEW.org_role THEN
    IF NOT is_super_admin(auth.uid())
       AND get_org_role(auth.uid(), NEW.organization_id) != 'org_admin' THEN
      RAISE EXCEPTION 'Insufficient privileges to change org_role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_org_role
BEFORE UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.validate_org_role_change();

-- =============================================
-- 3. Prevent super_admin role grant by non-super_admin
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_super_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'super_admin' AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super_admin can grant super_admin role';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_super_role
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.validate_super_admin_role();

-- =============================================
-- 4. Fix audit_trigger_fn for tables without user_id
-- =============================================
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _record_id uuid;
  _old_json jsonb;
  _new_json jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _old_json := to_jsonb(OLD);
    _user_id := COALESCE((_old_json->>'user_id')::uuid, auth.uid());
    _record_id := (COALESCE(_old_json->>'id', gen_random_uuid()::text))::uuid;
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data)
    VALUES (_user_id, 'DELETE', TG_TABLE_NAME, _record_id, _old_json);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    _new_json := to_jsonb(NEW);
    _old_json := to_jsonb(OLD);
    _user_id := COALESCE((_new_json->>'user_id')::uuid, auth.uid());
    _record_id := (COALESCE(_new_json->>'id', gen_random_uuid()::text))::uuid;
    IF (_old_json->>'deleted_at') IS NULL AND (_new_json->>'deleted_at') IS NOT NULL THEN
      INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data)
      VALUES (_user_id, 'SOFT_DELETE', TG_TABLE_NAME, _record_id, _old_json);
    ELSIF (_old_json->>'deleted_at') IS NOT NULL AND (_new_json->>'deleted_at') IS NULL THEN
      INSERT INTO public.audit_log (user_id, action, table_name, record_id, new_data)
      VALUES (_user_id, 'RESTORE', TG_TABLE_NAME, _record_id, _new_json);
    ELSE
      INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
      VALUES (_user_id, 'UPDATE', TG_TABLE_NAME, _record_id, _old_json, _new_json);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    _new_json := to_jsonb(NEW);
    _user_id := COALESCE((_new_json->>'user_id')::uuid, auth.uid());
    _record_id := (COALESCE(_new_json->>'id', gen_random_uuid()::text))::uuid;
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, new_data)
    VALUES (_user_id, 'INSERT', TG_TABLE_NAME, _record_id, _new_json);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- =============================================
-- 5. Add audit triggers to unmonitored tables
-- =============================================
CREATE TRIGGER audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_org_members
AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_organizations
AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
