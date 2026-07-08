-- CENNIK
CREATE TABLE public.product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price numeric NOT NULL CHECK (price >= 0),
  effective_from date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_prices_product ON public.product_prices(product_id, effective_from DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_prices TO authenticated;
GRANT ALL ON public.product_prices TO service_role;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_product_prices" ON public.product_prices FOR ALL
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY "org_select_product_prices" ON public.product_prices FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "org_insert_product_prices" ON public.product_prices FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (public.has_role(auth.uid(), 'prgm'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
  );

-- ESTYMACJE — rodzic
CREATE TABLE public.activity_product_estimations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit text NOT NULL CHECK (unit IN ('units','value')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, product_id)
);
CREATE INDEX idx_activity_product_estimations_activity ON public.activity_product_estimations(activity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_product_estimations TO authenticated;
GRANT ALL ON public.activity_product_estimations TO service_role;
ALTER TABLE public.activity_product_estimations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_product_estimations" ON public.activity_product_estimations FOR ALL
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY "prgm_select_product_estimations" ON public.activity_product_estimations FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (public.has_role(auth.uid(), 'prgm'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );
CREATE POLICY "prgm_insert_product_estimations" ON public.activity_product_estimations FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (public.has_role(auth.uid(), 'prgm'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );
CREATE POLICY "prgm_update_product_estimations" ON public.activity_product_estimations FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (public.has_role(auth.uid(), 'prgm'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
  WITH CHECK (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (public.has_role(auth.uid(), 'prgm'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );

-- ESTYMACJE — okresy
CREATE TABLE public.activity_estimation_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  estimation_id uuid NOT NULL REFERENCES public.activity_product_estimations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('before','during','after')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  units numeric,
  unit_price_snapshot numeric,
  unit_price_effective_from date,
  value numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estimation_id, period),
  CHECK (period_end >= period_start)
);
CREATE INDEX idx_activity_estimation_periods_estimation ON public.activity_estimation_periods(estimation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_estimation_periods TO authenticated;
GRANT ALL ON public.activity_estimation_periods TO service_role;
ALTER TABLE public.activity_estimation_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_estimation_periods" ON public.activity_estimation_periods FOR ALL
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY "prgm_select_estimation_periods" ON public.activity_estimation_periods FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (public.has_role(auth.uid(), 'prgm'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );
CREATE POLICY "prgm_insert_estimation_periods" ON public.activity_estimation_periods FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (public.has_role(auth.uid(), 'prgm'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );
CREATE POLICY "prgm_update_estimation_periods" ON public.activity_estimation_periods FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
    AND (public.has_role(auth.uid(), 'prgm'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
    AND period_end >= CURRENT_DATE
  )
  WITH CHECK (period_end >= CURRENT_DATE);

-- WIDOK RAPORTOWY
CREATE OR REPLACE VIEW public.view_activity_estimations_report AS
SELECT
  ape.id AS estimation_id,
  ape.activity_id,
  a.name AS activity_name,
  a.client_id,
  ape.product_id,
  p.name AS product_name,
  ape.unit,
  ape.organization_id,
  ape.user_id,
  ape.created_at,
  before_p.period_start AS before_start,
  before_p.period_end AS before_end,
  before_p.units AS before_units,
  before_p.value AS before_value,
  during_p.period_start AS during_start,
  during_p.period_end AS during_end,
  during_p.units AS during_units,
  during_p.value AS during_value,
  after_p.period_start AS after_start,
  after_p.period_end AS after_end,
  after_p.units AS after_units,
  after_p.value AS after_value,
  COALESCE(during_p.unit_price_snapshot, after_p.unit_price_snapshot, before_p.unit_price_snapshot) AS unit_price_snapshot,
  COALESCE(during_p.unit_price_effective_from, after_p.unit_price_effective_from, before_p.unit_price_effective_from) AS unit_price_effective_from,
  CASE WHEN before_p.value IS NOT NULL AND before_p.value <> 0
    THEN ROUND(((during_p.value - before_p.value) / before_p.value) * 100)
    ELSE NULL END AS growth_during_pct,
  CASE WHEN before_p.value IS NOT NULL AND before_p.value <> 0
    THEN ROUND(((after_p.value - before_p.value) / before_p.value) * 100)
    ELSE NULL END AS growth_after_pct
FROM public.activity_product_estimations ape
JOIN public.activities a ON a.id = ape.activity_id
JOIN public.products p ON p.id = ape.product_id
LEFT JOIN public.activity_estimation_periods before_p ON before_p.estimation_id = ape.id AND before_p.period = 'before'
LEFT JOIN public.activity_estimation_periods during_p ON during_p.estimation_id = ape.id AND during_p.period = 'during'
LEFT JOIN public.activity_estimation_periods after_p ON after_p.estimation_id = ape.id AND after_p.period = 'after';

ALTER VIEW public.view_activity_estimations_report SET (security_invoker = true);
GRANT SELECT ON public.view_activity_estimations_report TO authenticated;

-- AUDYT
CREATE TRIGGER audit_product_prices AFTER INSERT OR UPDATE OR DELETE ON public.product_prices
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER audit_activity_product_estimations AFTER INSERT OR UPDATE OR DELETE ON public.activity_product_estimations
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER audit_activity_estimation_periods AFTER INSERT OR UPDATE OR DELETE ON public.activity_estimation_periods
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();