

# Implementation Plan — 3 Steps to Complete Missing Features

## Step 1: Login/Logout Logging + Log Filtering

**AuthContext.tsx** — After successful `signIn`, insert a `login` event to `system_logs`. In `signOut`, insert a `logout` event before calling `supabase.auth.signOut()`.

**SystemLogsView.tsx** — Add filter controls:
- Dropdown for event type (all / login / logout / error / context_switch / user_created / ...)
- Text input for search by description
- Date range picker (from/to)
- Organization filter dropdown (load from `useOrganizations`)

Update `useSystemLogs` hook to accept filter parameters and pass them to the query.

**Files:** `src/context/AuthContext.tsx`, `src/components/admin/SystemLogsView.tsx`, `src/hooks/useSuperAdmin.ts`

---

## Step 2: Org Edit Form + User Status Management + Cron Job

**OrganizationsView.tsx** — Add an "Edit" button per org that opens a dialog with fields: name, email, phone, NIP, address, internal_note, status. Save via `supabase.from('organizations').update(...)`.

**GlobalUsersView.tsx** — Add status management buttons:
- "Block" button (sets status to `blocked`)
- "Activate" button (sets status to `active`)
- Display current status with colored badge (already partially done)
- Add org name column by joining `organizations` data

**Cron job for trash purge** — Use `pg_cron` + `pg_net` to schedule daily call to `purge_expired_trash()` via an edge function wrapper. Create a simple `purge-trash` edge function that calls the DB function, then schedule it with `cron.schedule`.

**Files:** `src/components/admin/OrganizationsView.tsx`, `src/components/admin/GlobalUsersView.tsx`, `supabase/functions/purge-trash/index.ts`, DB insert for cron schedule

---

## Step 3: Activity Monitoring View + Wizard Step 3 Expansion

**ActivityMonitoringView.tsx** — New component at `/admin/activity`:
- Shows recent `system_logs` + `audit_log` entries combined
- Filter by org, user, date range
- Shows: who did what, when, in which org
- Columns: timestamp, user, org, action, details

**CreateOrganizationWizard.tsx** — Expand the wizard:
- After Step 2 (user creation), add optional Step 3: quick-add clients and products for the new org
- Simple inline forms: "Add client name + budget", "Add product name + brand"
- Skip button to go straight to summary

**App.tsx** — Add route `/admin/activity` pointing to new `ActivityMonitoringView`

**SuperAdminLayout.tsx** — Add "Aktywność" nav item

**Files:** `src/components/admin/ActivityMonitoringView.tsx`, `src/components/admin/CreateOrganizationWizard.tsx`, `src/App.tsx`, `src/components/admin/SuperAdminLayout.tsx`

---

## Summary

| Step | Scope | Key Deliverables |
|------|-------|-----------------|
| 1 | Logging + Filtering | Login/logout events in system_logs, advanced log filters |
| 2 | Org Edit + User Mgmt + Cron | Edit org form, block/activate users, auto-purge trash |
| 3 | Activity View + Wizard | Activity monitoring page, wizard step 3 with clients/products |

