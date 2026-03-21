

# Multi-Tenant Architecture — CorePlan

## Overview

Transform CorePlan from a single-organization app into a full multi-tenant platform with a central Super Admin, per-organization isolation, and shared global clients.

---

## Database Changes

### New Tables

**`organizations`** — tenant registry
- `id`, `name`, `slug`, `status` (active/suspended/archived), `created_at`, `updated_at`, `created_by` (super admin user_id)
- RLS: super_admin sees all; org members see own org only

**`organization_members`** — links users to organizations with org-level role
- `id`, `organization_id`, `user_id`, `org_role` (org_admin / manager / user / viewer), `created_at`
- A user can belong to multiple orgs (future-proof), but initially one
- RLS: super_admin all; org_admin sees own org members; user sees self

**`organization_clients`** — links shared clients to orgs
- `id`, `organization_id`, `client_id`, `created_at`
- Replaces current `client_assignments` for data scoping
- RLS: org members see own org's client links only

**`system_logs`** — login events, admin actions, errors
- `id`, `user_id`, `organization_id` (nullable), `event_type` (login/logout/error/admin_action), `description`, `metadata` (jsonb), `created_at`

### Modified Tables (add `organization_id`)

All business tables get a non-nullable `organization_id` FK:
- `clients` — becomes a global registry (remove `user_id` requirement, keep for creator tracking)
- `activities` — add `organization_id`
- `products` — add `organization_id`
- `packages` — add `organization_id`
- `media_plans` — add `organization_id`
- `confirmations` — inherits org via activity
- `campaign_types` — add `organization_id`
- `notifications` — add `organization_id` (nullable for system-wide)
- `backup_history` — add `organization_id` (nullable = global backup)
- `audit_log` — add `organization_id`
- `profiles` — add `organization_id` (nullable for super_admin)
- `app_settings` — add `organization_id` (nullable = global settings)

### Role System Changes

Replace current `app_role` enum:
```
super_admin → central admin (sees everything)
org_admin   → organization administrator
manager     → org-level manager
user        → org-level user
viewer      → org-level viewer
```

New `has_role` function checks both `user_roles` (for super_admin) and `organization_members` (for org roles).

New security definer functions:
- `get_user_org_id(user_id)` — returns current user's org
- `is_super_admin(user_id)` — checks super_admin role
- `is_org_member(user_id, org_id)` — checks membership
- `get_org_role(user_id, org_id)` — returns org-level role

### RLS Policy Overhaul

Every business table gets policies like:
```sql
-- Super admin sees all
CREATE POLICY "super_admin_all" ON table
  USING (is_super_admin(auth.uid()));

-- Org members see own org data
CREATE POLICY "org_member_select" ON table
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );
```

### Clients — Shared Model

`clients` table becomes a **global registry** (no org_id on the client itself). Instead, `organization_clients` links clients to orgs. Each org only sees clients linked to it. Activities, products, etc. are scoped by `organization_id`, so even if two orgs share a client, their operational data is fully isolated.

### Starter Account

Migration will:
1. Create admin@coreplane.pl account via edge function (since we can't insert into auth.users directly from migrations)
2. Assign `super_admin` role
3. Deactivate all existing profiles (set status = 'deactivated')
4. Create a default "System" organization and migrate existing data to it

---

## Frontend Architecture

### Routing

```
/admin              → Super Admin dashboard
/admin/organizations → Org management
/admin/users        → Global user management
/admin/logs         → System logs
/admin/backups      → Global backups
/admin/settings     → System settings

/app                → Org-scoped media plan (existing)
/dashboard          → Org-scoped dashboard (existing)
/clients            → Org-scoped clients
/products           → Org-scoped products
... (existing routes stay, but scoped to org)
```

### New Components

**Super Admin views:**
- `SuperAdminDashboard` — KPIs: org count, active users, logins today, recent activity, errors, backup status, quick actions
- `OrganizationsView` — CRUD for organizations, status toggle, member count
- `CreateOrganizationDialog` — name, slug, assign initial org_admin
- `GlobalUsersView` — all users across orgs, filter by org
- `SystemLogsView` — filterable by org/user/date/event type
- `GlobalBackupsView` — backup history across all orgs

**Super Admin sidebar:**
- Separate `SuperAdminSidebar` with the menu structure from requirements
- Conditionally rendered based on `is_super_admin`

**Organization context:**
- `OrganizationContext` — provides current `organization_id` to all org-scoped components
- Stored in session/localStorage after login
- Super admin can switch between orgs or view global

### Modified Components

- `AppSidebar` — org admin sees current org name + existing nav
- `AppContext` — all queries pass `organization_id`
- `useData` hooks — all queries filter by `organization_id`
- `useActivities` — filter by `organization_id`
- `ProtectedRoute` — check org membership, redirect super_admin to `/admin`
- `AuthContext` — after login, determine if super_admin or org user, set org context

### Edge Functions

- `scheduled-backup` — add org_id parameter, support global backups
- `data-export` / `data-import` — scope to organization
- `send-notification-email` — include org context

---

## Implementation Steps (ordered)

### Step 1: Database migration (~1 large migration)
- Create `organizations` table
- Create `organization_members` table
- Create `organization_clients` table
- Create `system_logs` table
- Extend `app_role` enum with `super_admin`
- Add `organization_id` to all business tables
- Create security definer functions
- Drop old RLS policies, create new org-scoped ones
- Create default org, migrate existing data
- Deactivate old accounts

### Step 2: Create super admin account
- Edge function or manual step to create admin@coreplane.pl
- Assign super_admin role, skip onboarding

### Step 3: Organization context + auth flow
- `OrganizationContext` provider
- Update `AuthContext` to detect super_admin vs org user
- Update `ProtectedRoute` for org routing

### Step 4: Super Admin UI
- `SuperAdminLayout` + `SuperAdminSidebar`
- `SuperAdminDashboard`
- `OrganizationsView` + create/edit dialogs
- `GlobalUsersView`
- `SystemLogsView`

### Step 5: Org-scoped data hooks
- Update all `useData`, `useActivities`, `useClientAssignments` hooks to pass `organization_id`
- Update `AppContext` to use org-scoped queries

### Step 6: Org Admin UI adjustments
- Show org name in sidebar
- Org-scoped settings
- Org-scoped backup section

### Step 7: System logging
- Log login/logout events
- Log admin actions (create org, approve user, etc.)
- Log errors

---

## Estimated Scope

This is a **very large change** touching:
- ~15 database tables (schema changes + new RLS)
- ~20+ frontend files (new + modified)
- ~5 edge functions
- Multiple migrations

Given Lovable's per-message limits, this will require **5-8 implementation rounds** minimum.

---

## Security Considerations

- All org isolation enforced at DB level via RLS (not just UI)
- Super admin bypass via `is_super_admin()` security definer function
- `organization_id` required on all business inserts (not nullable)
- No cross-org data leakage possible through API
- Audit trail for all admin actions

