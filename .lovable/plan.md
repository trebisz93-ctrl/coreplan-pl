

# Security Hardening — 5 Critical Fixes

## Current Vulnerabilities Found

### 1. Profile UPDATE not column-restricted
- RLS policy `org_admin_update_profiles` allows updating ANY column on profiles within the org
- No database-level restriction on which columns can be changed (user_id, id, created_at all editable)

### 2. Role escalation possible
- `useSetUserRole` in `useData.ts` does DELETE + INSERT on `user_roles` from client side
- RLS on `user_roles` has no INSERT/DELETE policy for non-super_admin — but `useSetOrgRole` in `useOrgMembers.ts` updates `org_role` without server-side validation that the caller has higher privileges
- `RolesManagementView` allows changing `org_role` via direct Supabase update — no trigger prevents setting `org_admin` by a `manager`

### 3. SELECT isolation — mostly good
- All major tables use `get_user_org_ids()` for RLS — correct pattern
- `system_logs` SELECT is super_admin only — correct
- `profiles` allows org members to see each other — correct
- No gaps found in existing tables

### 4. Audit logging — partial coverage
- Triggers exist on: `activities`, `clients`, `media_plans`, `packages`, `products`
- Missing triggers on: `profiles`, `organization_members`, `user_roles`, `organizations`
- Critical gap: role changes and user modifications are NOT audited

### 5. Backup security
- Backups stored in Supabase Storage bucket `backups` (private) — this is fine
- External Hostinger backup is outside scope of code changes but documented as recommendation

---

## Implementation Plan

### Migration 1: Column-restricted profile updates

Create a trigger `BEFORE UPDATE ON profiles` that prevents non-super_admin users from changing protected columns:

```sql
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only super_admin can change these columns
  IF NOT is_super_admin(auth.uid()) THEN
    NEW.id := OLD.id;
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_cols
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION protect_profile_columns();
```

### Migration 2: Role escalation prevention

Create a trigger on `organization_members` that prevents setting `org_admin` unless the caller is already `org_admin` or `super_admin`:

```sql
CREATE OR REPLACE FUNCTION validate_org_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- If role is being changed
  IF OLD.org_role IS DISTINCT FROM NEW.org_role THEN
    -- Only super_admin or org_admin of that org can change roles
    IF NOT is_super_admin(auth.uid()) 
       AND get_org_role(auth.uid(), NEW.organization_id) != 'org_admin' THEN
      RAISE EXCEPTION 'Insufficient privileges to change org_role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_org_role
BEFORE UPDATE ON organization_members
FOR EACH ROW EXECUTE FUNCTION validate_org_role_change();
```

Also add a trigger on `user_roles` to prevent non-super_admin from inserting/updating `super_admin` role:

```sql
CREATE OR REPLACE FUNCTION validate_super_admin_role()
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
BEFORE INSERT OR UPDATE ON user_roles
FOR EACH ROW EXECUTE FUNCTION validate_super_admin_role();
```

### Migration 3: Audit triggers on missing tables

Add audit triggers to `profiles`, `organization_members`, `user_roles`, and `organizations`:

```sql
CREATE TRIGGER audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_org_members
AFTER INSERT OR UPDATE OR DELETE ON organization_members
FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_organizations
AFTER INSERT OR UPDATE OR DELETE ON organizations
FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
```

Note: `audit_trigger_fn` references `NEW.user_id` — for tables like `organizations` that don't have `user_id`, the trigger function needs a small update to handle that gracefully (use `coalesce` or conditional check).

### Migration 4: Fix audit_trigger_fn for tables without user_id

Update the function to handle tables that may not have a `user_id` column:

```sql
CREATE OR REPLACE FUNCTION audit_trigger_fn() ...
  -- Use auth.uid() as fallback when table has no user_id column
  _user_id := coalesce(
    CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END,
    auth.uid()
  );
```

### Code change: Remove useSetUserRole from client

The `useSetUserRole` hook in `useData.ts` does DELETE+INSERT on `user_roles` from the client. This is dangerous — it should be removed or restricted to super_admin only in the UI. The trigger will block escalation at DB level, but the client code should also not offer this path.

---

## Files to modify

| File | Change |
|------|--------|
| 1 SQL migration | 4 triggers + 3 functions + audit_trigger_fn fix |
| `src/hooks/useData.ts` | Remove or guard `useSetUserRole` |
| `src/components/admin/RolesManagementView.tsx` | No code change needed (already super_admin only view, DB triggers protect) |

## Backup recommendation (documentation only)

For Hostinger: store `.sql` dumps above `public_html` (e.g., `/home/user/backups/`) and access only via SSH/SFTP. This is a server config change, not a code change.

