
-- ==========================================
-- RLS OVERHAUL: Replace all old policies with org-scoped + super_admin bypass
-- ==========================================

-- ACTIVITIES: drop old, add new
DROP POLICY IF EXISTS "Users can view own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can create own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can delete own activities" ON public.activities;
DROP POLICY IF EXISTS "Assigned users can view client activities" ON public.activities;
DROP POLICY IF EXISTS "Assigned users can create client activities" ON public.activities;
DROP POLICY IF EXISTS "Assigned users can update client activities" ON public.activities;
DROP POLICY IF EXISTS "Assigned users can delete client activities" ON public.activities;

CREATE POLICY "super_admin_all_activities" ON public.activities FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_select_activities" ON public.activities FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_insert_activities" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_update_activities" ON public.activities FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_delete_activities" ON public.activities FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- PRODUCTS: drop old, add new
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can create their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
DROP POLICY IF EXISTS "Assigned users can view client products" ON public.products;
DROP POLICY IF EXISTS "Assigned users can update client products" ON public.products;
DROP POLICY IF EXISTS "Assigned users can delete client products" ON public.products;

CREATE POLICY "super_admin_all_products" ON public.products FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_select_products" ON public.products FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_insert_products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_update_products" ON public.products FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_delete_products" ON public.products FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- PACKAGES
DROP POLICY IF EXISTS "Users can view own packages" ON public.packages;
DROP POLICY IF EXISTS "Users can create packages" ON public.packages;
DROP POLICY IF EXISTS "Users can update own packages" ON public.packages;
DROP POLICY IF EXISTS "Users can delete own packages" ON public.packages;

CREATE POLICY "super_admin_all_packages" ON public.packages FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_select_packages" ON public.packages FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_insert_packages" ON public.packages FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_update_packages" ON public.packages FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_delete_packages" ON public.packages FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- MEDIA_PLANS
DROP POLICY IF EXISTS "Users can view own media plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can create own media plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can update own media plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can delete own media plans" ON public.media_plans;
DROP POLICY IF EXISTS "Assigned users can view client media plans" ON public.media_plans;
DROP POLICY IF EXISTS "Assigned users can update client media plans" ON public.media_plans;
DROP POLICY IF EXISTS "Assigned users can delete client media plans" ON public.media_plans;

CREATE POLICY "super_admin_all_media_plans" ON public.media_plans FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_select_media_plans" ON public.media_plans FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_insert_media_plans" ON public.media_plans FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_update_media_plans" ON public.media_plans FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_delete_media_plans" ON public.media_plans FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- CAMPAIGN_TYPES
DROP POLICY IF EXISTS "Users can view own campaign types" ON public.campaign_types;
DROP POLICY IF EXISTS "Users can create own campaign types" ON public.campaign_types;
DROP POLICY IF EXISTS "Users can update own campaign types" ON public.campaign_types;
DROP POLICY IF EXISTS "Users can delete own campaign types" ON public.campaign_types;

CREATE POLICY "super_admin_all_campaign_types" ON public.campaign_types FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_select_campaign_types" ON public.campaign_types FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_insert_campaign_types" ON public.campaign_types FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_update_campaign_types" ON public.campaign_types FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_delete_campaign_types" ON public.campaign_types FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- CLIENTS: keep as global registry, update RLS for org_clients scoping
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "Assigned users can view client" ON public.clients;

CREATE POLICY "super_admin_all_clients" ON public.clients FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_select_clients" ON public.clients FOR SELECT TO authenticated
  USING (id IN (SELECT client_id FROM public.organization_clients WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));
CREATE POLICY "org_insert_clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "org_update_clients" ON public.clients FOR UPDATE TO authenticated
  USING (id IN (SELECT client_id FROM public.organization_clients WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));
CREATE POLICY "org_delete_clients" ON public.clients FOR DELETE TO authenticated
  USING (id IN (SELECT client_id FROM public.organization_clients WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));

-- CONFIRMATIONS
DROP POLICY IF EXISTS "Users can view own confirmations" ON public.confirmations;
DROP POLICY IF EXISTS "Users can create own confirmations" ON public.confirmations;
DROP POLICY IF EXISTS "Users can update own confirmations" ON public.confirmations;
DROP POLICY IF EXISTS "Users can delete own confirmations" ON public.confirmations;
DROP POLICY IF EXISTS "Assigned users can view client confirmations" ON public.confirmations;
DROP POLICY IF EXISTS "Assigned users can create client confirmations" ON public.confirmations;
DROP POLICY IF EXISTS "Assigned users can update client confirmations" ON public.confirmations;
DROP POLICY IF EXISTS "Assigned users can delete client confirmations" ON public.confirmations;

CREATE POLICY "super_admin_all_confirmations" ON public.confirmations FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_select_confirmations" ON public.confirmations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = confirmations.activity_id AND a.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));
CREATE POLICY "org_insert_confirmations" ON public.confirmations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = confirmations.activity_id AND a.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));
CREATE POLICY "org_update_confirmations" ON public.confirmations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = confirmations.activity_id AND a.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));
CREATE POLICY "org_delete_confirmations" ON public.confirmations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = confirmations.activity_id AND a.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));

-- PRODUCT_CLIENTS
DROP POLICY IF EXISTS "Users can manage own product_clients" ON public.product_clients;
DROP POLICY IF EXISTS "Users can view own product_clients" ON public.product_clients;

CREATE POLICY "super_admin_all_product_clients" ON public.product_clients FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_select_product_clients" ON public.product_clients FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_clients.product_id AND p.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));
CREATE POLICY "org_manage_product_clients" ON public.product_clients FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_clients.product_id AND p.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));

-- CLIENT_ASSIGNMENTS: update for org scope
DROP POLICY IF EXISTS "Admins can manage client assignments" ON public.client_assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON public.client_assignments;

CREATE POLICY "super_admin_all_assignments" ON public.client_assignments FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_select_assignments" ON public.client_assignments FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())) OR user_id = auth.uid());
CREATE POLICY "org_admin_manage_assignments" ON public.client_assignments FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "super_admin_all_notifications" ON public.notifications FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_select_notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "org_insert_notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "org_update_notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "org_delete_notifications" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- PROFILES: update for org scope
DROP POLICY IF EXISTS "Profiles viewable by self and admins" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "super_admin_all_profiles" ON public.profiles FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_select_profiles" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "users_insert_own_profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_update_own_profile" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "org_admin_update_profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- AUDIT_LOG
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;

CREATE POLICY "super_admin_all_audit" ON public.audit_log FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_select_audit" ON public.audit_log FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())) OR user_id = auth.uid());
CREATE POLICY "system_insert_audit" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- BACKUP_HISTORY
DROP POLICY IF EXISTS "Admins can view all backup history" ON public.backup_history;
DROP POLICY IF EXISTS "Admins can insert backup history" ON public.backup_history;
DROP POLICY IF EXISTS "Admins can delete backup history" ON public.backup_history;

CREATE POLICY "super_admin_all_backups" ON public.backup_history FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_admin_select_backups" ON public.backup_history FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_admin_insert_backups" ON public.backup_history FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- APP_SETTINGS
DROP POLICY IF EXISTS "Authenticated can view settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.app_settings;

CREATE POLICY "super_admin_all_settings" ON public.app_settings FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_select_settings" ON public.app_settings FOR SELECT TO authenticated
  USING (organization_id IS NULL OR organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_admin_manage_settings" ON public.app_settings FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- USER_ROLES: update policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "super_admin_all_roles" ON public.user_roles FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "users_view_own_roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
