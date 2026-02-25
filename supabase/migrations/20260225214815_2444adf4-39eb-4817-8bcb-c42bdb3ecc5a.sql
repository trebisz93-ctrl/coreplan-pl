
-- RLS: Assigned users can view clients
CREATE POLICY "Assigned users can view client"
ON public.clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = clients.id
    AND ca.user_id = auth.uid()
  )
);

-- RLS: Assigned users can view activities of their assigned clients
CREATE POLICY "Assigned users can view client activities"
ON public.activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = activities.client_id
    AND ca.user_id = auth.uid()
  )
);

-- RLS: Assigned users can update activities of their assigned clients
CREATE POLICY "Assigned users can update client activities"
ON public.activities FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = activities.client_id
    AND ca.user_id = auth.uid()
  )
);

-- RLS: Assigned users can view products of their assigned clients
CREATE POLICY "Assigned users can view client products"
ON public.products FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = products.client_id
    AND ca.user_id = auth.uid()
  )
);

-- RLS: Assigned users can view media plans of their assigned clients
CREATE POLICY "Assigned users can view client media plans"
ON public.media_plans FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = media_plans.client_id
    AND ca.user_id = auth.uid()
  )
);

-- RLS: Assigned users can view confirmations for activities of their assigned clients
CREATE POLICY "Assigned users can view client confirmations"
ON public.confirmations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    JOIN public.activities a ON a.id = confirmations.activity_id
    WHERE ca.client_id = a.client_id
    AND ca.user_id = auth.uid()
  )
);
