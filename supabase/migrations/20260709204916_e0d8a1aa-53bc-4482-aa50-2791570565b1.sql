DROP POLICY IF EXISTS "org_insert_product_prices" ON public.product_prices;
CREATE POLICY "org_insert_product_prices" ON public.product_prices FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (
      public.has_role(auth.uid(), 'prgm'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.get_org_role(auth.uid(), organization_id) = 'org_admin'
    )
  );

DROP POLICY IF EXISTS "prgm_insert_product_estimations" ON public.activity_product_estimations;
CREATE POLICY "prgm_insert_product_estimations" ON public.activity_product_estimations FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (
      public.has_role(auth.uid(), 'prgm'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.get_org_role(auth.uid(), organization_id) = 'org_admin'
    )
  );

DROP POLICY IF EXISTS "prgm_update_product_estimations" ON public.activity_product_estimations;
CREATE POLICY "prgm_update_product_estimations" ON public.activity_product_estimations FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (
      public.has_role(auth.uid(), 'prgm'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.get_org_role(auth.uid(), organization_id) = 'org_admin'
    )
  )
  WITH CHECK (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (
      public.has_role(auth.uid(), 'prgm'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.get_org_role(auth.uid(), organization_id) = 'org_admin'
    )
  );

DROP POLICY IF EXISTS "prgm_insert_estimation_periods" ON public.activity_estimation_periods;
CREATE POLICY "prgm_insert_estimation_periods" ON public.activity_estimation_periods FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (
      public.has_role(auth.uid(), 'prgm'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.get_org_role(auth.uid(), organization_id) = 'org_admin'
    )
  );

DROP POLICY IF EXISTS "prgm_update_estimation_periods" ON public.activity_estimation_periods;
CREATE POLICY "prgm_update_estimation_periods" ON public.activity_estimation_periods FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (
      public.has_role(auth.uid(), 'prgm'::public.app_role)
      OR public.is_super_admin(auth.uid())
      OR public.get_org_role(auth.uid(), organization_id) = 'org_admin'
    )
    AND period_end >= CURRENT_DATE
  )
  WITH CHECK (period_end >= CURRENT_DATE);

DROP POLICY IF EXISTS "prgm_select_product_estimations" ON public.activity_product_estimations;
CREATE POLICY "prgm_select_product_estimations" ON public.activity_product_estimations FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (
      public.has_role(auth.uid(), 'prgm'::public.app_role)
      OR public.get_org_role(auth.uid(), organization_id) = 'org_admin'
    )
  );

DROP POLICY IF EXISTS "prgm_select_estimation_periods" ON public.activity_estimation_periods;
CREATE POLICY "prgm_select_estimation_periods" ON public.activity_estimation_periods FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (
      public.has_role(auth.uid(), 'prgm'::public.app_role)
      OR public.get_org_role(auth.uid(), organization_id) = 'org_admin'
    )
  );