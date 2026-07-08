DROP VIEW IF EXISTS public.view_activity_estimations_report;
CREATE VIEW public.view_activity_estimations_report AS
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
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', pr.first_name, pr.last_name)), ''), pr.display_name) AS user_display_name,
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
LEFT JOIN public.profiles pr ON pr.user_id = ape.user_id
LEFT JOIN public.activity_estimation_periods before_p ON before_p.estimation_id = ape.id AND before_p.period = 'before'
LEFT JOIN public.activity_estimation_periods during_p ON during_p.estimation_id = ape.id AND during_p.period = 'during'
LEFT JOIN public.activity_estimation_periods after_p ON after_p.estimation_id = ape.id AND after_p.period = 'after';

ALTER VIEW public.view_activity_estimations_report SET (security_invoker = true);
GRANT SELECT ON public.view_activity_estimations_report TO authenticated;