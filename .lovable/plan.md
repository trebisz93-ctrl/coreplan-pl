

# Super Admin — Full Control Suite

This is a large feature set. I'll break it into implementation rounds.

---

## Round 1: Database Schema Changes

### Migration: Add soft-delete + status columns

**`organizations`** table:
- Add `deleted_at timestamptz`, `deleted_by uuid`, `purge_at timestamptz`
- Add `email text`, `phone text`, `nip text`, `address text`, `internal_note text`
- Change default `status` to `'configuring'`
- Add `onboarding_completed boolean default false`

**`profiles`** table:
- Add `deleted_at timestamptz`, `deleted_by uuid`, `purge_at timestamptz`
- Expand status options (already text, so just use new values in code: active, inactive, invited, blocked, deleted)

**`clients`** table — already has `deleted_at`, add `deleted_by uuid`, `purge_at timestamptz`

**`products`** table — already has `deleted_at`, add `deleted_by uuid`, `purge_at timestamptz`

**`packages`** table — already has `deleted_at`, add `deleted_by uuid`, `purge_at timestamptz`

### New table: `trash_registry`
Central registry for the trash view:
- `id uuid PK`, `record_type text` (organization/user/client/product/package), `record_id uuid`, `record_name text`, `deleted_by uuid`, `deleted_at timestamptz default now()`, `purge_at timestamptz default now() + interval '180 days'`, `organization_id uuid nullable`, `restored_at timestamptz nullable`

RLS: super_admin only.

### Update RLS policies
- All queries on org/profiles/clients/products/packages should filter `deleted_at IS NULL` by default (or handle in application code).

---

## Round 2: Organization Context Switcher + Impersonation

### `OrganizationContext` updates
- Add `viewMode: 'global' | 'org' | 'impersonate'`
- Add `impersonatedUserId: string | null`
- Add `switchToOrg(orgId)`, `switchToGlobal()`, `impersonateUser(userId)`, `stopImpersonation()`
- When Super Admin switches to an org, set `currentOrg` and navigate to `/app`
- Log every context switch to `system_logs`

### Context bar (top of page)
- New `AdminContextBar` component shown when Super Admin is in org/impersonate mode
- Shows: current mode, org name, impersonated user name, "Exit" button
- Colored banner (amber for org view, red for impersonation)

### Super Admin sidebar update
- Add org switcher dropdown at top
- "Global" option + list of all orgs

---

## Round 3: Trash / Recycle Bin View

### New component: `TrashView` at `/admin/trash`
- Table with filters: all / organizations / users / clients / products / packages
- Columns: type, name, deleted by, deleted at, days remaining, actions
- Actions: Restore, Permanent Delete
- Restore: clear `deleted_at`, `deleted_by`, `purge_at`, remove from `trash_registry`
- Permanent delete: hard delete from source table + `trash_registry`

### Delete operations
- Update `OrganizationsView` to add Delete button (soft delete)
- Update `GlobalUsersView` to add Delete button (soft delete)
- On org delete: also soft-delete all org members (set profile status to 'deleted')
- On restore: restore org + reactivate members

### Add to SuperAdminLayout nav: `Kosz` with Trash2 icon

---

## Round 4: Organization Creation Wizard

### Replace current simple dialog with multi-step wizard

**Step 1 — Company details:**
- Name, email, phone, NIP (optional), address (optional), internal note (optional)

**Step 2 — First user (org admin):**
- First name, last name, email, password
- Role auto-set to `org_admin`
- Creates auth user via edge function, creates profile, adds to `organization_members`

**Step 3 — Initial setup (optional quick-add):**
- Add first clients
- Add first products

**Step 4 — Summary:**
- Show created org + user
- "Go to company dashboard" button

### New edge function: `create-org-user`
- Creates auth user with given email/password
- Creates profile with `organization_id`
- Adds to `organization_members` as `org_admin`
- Sets profile status to `active`, `onboarding_completed` to true

---

## Round 5: Organization Dashboard + Onboarding

### When Super Admin clicks org in list → navigate to `/app` with that org set in context

### Organization onboarding checklist
- Show when `organization.onboarding_completed === false`
- Checklist items:
  1. Admin created (auto-checked after wizard)
  2. Clients added (check count > 0)
  3. Users added (check count > 1)
  4. Products added (check count > 0)
  5. Packages added (optional, check count > 0)
- Big tile cards: "Add User", "Add Client", "Add Product", "Add Package", "Finish Setup"
- "Finish Setup" marks `onboarding_completed = true`

---

## Round 6: Enhanced Super Admin Navigation

### Update `SuperAdminLayout` nav:
```
Dashboard          /admin
Firmy              /admin/organizations
Użytkownicy        /admin/users
Klienci globalni   /admin/clients
Aktywność          /admin/activity
Logi systemowe     /admin/logs
Backupy            /admin/backups
Kosz               /admin/trash
Ustawienia         /admin/settings
```

### Enhanced SuperAdminDashboard KPIs:
- Total orgs (active/configuring/suspended)
- Total users (active/pending/blocked)
- Logins today (from system_logs)
- Items in trash
- Recent activity feed
- Quick actions: Create org, View trash, View logs

---

## Files to create/modify

**New files:**
- `src/components/admin/TrashView.tsx`
- `src/components/admin/CreateOrganizationWizard.tsx`
- `src/components/admin/AdminContextBar.tsx`
- `src/components/admin/OrgOnboarding.tsx`
- `supabase/functions/create-org-user/index.ts`

**Modified files:**
- `src/context/OrganizationContext.tsx` — add view modes, impersonation, context switching
- `src/components/admin/SuperAdminLayout.tsx` — add context bar, expanded nav, trash link
- `src/components/admin/SuperAdminDashboard.tsx` — enhanced KPIs and quick actions
- `src/components/admin/OrganizationsView.tsx` — delete button, click-to-enter, wizard trigger
- `src/components/admin/GlobalUsersView.tsx` — delete button, status management
- `src/App.tsx` — add new admin routes (/admin/trash, etc.)
- `src/components/AppSidebar.tsx` — show onboarding for new orgs
- `src/hooks/useSuperAdmin.ts` — add trash queries, activity queries

**Database migration:**
- Add soft-delete columns to organizations, profiles
- Add `deleted_by`, `purge_at` to clients, products, packages
- Create `trash_registry` table
- Add org detail columns (email, phone, nip, etc.)
- Add `onboarding_completed` to organizations

Given message size limits, implementation will be split across 3-4 rounds, starting with DB migration + trash system, then wizard + context switching.

