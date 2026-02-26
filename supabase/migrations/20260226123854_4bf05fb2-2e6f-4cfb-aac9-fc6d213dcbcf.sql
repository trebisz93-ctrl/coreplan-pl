
-- 1. Activities: DELETE for assigned users
CREATE POLICY "Assigned users can delete client activities"
ON public.activities FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = activities.client_id AND ca.user_id = auth.uid()
  )
);

-- 2. Activities: INSERT for assigned users
CREATE POLICY "Assigned users can create client activities"
ON public.activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = activities.client_id AND ca.user_id = auth.uid()
  )
);

-- 3. Confirmations: INSERT for assigned users
CREATE POLICY "Assigned users can create client confirmations"
ON public.confirmations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    JOIN public.activities a ON a.id = confirmations.activity_id
    WHERE ca.client_id = a.client_id AND ca.user_id = auth.uid()
  )
);

-- 4. Confirmations: UPDATE for assigned users
CREATE POLICY "Assigned users can update client confirmations"
ON public.confirmations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    JOIN public.activities a ON a.id = confirmations.activity_id
    WHERE ca.client_id = a.client_id AND ca.user_id = auth.uid()
  )
);

-- 5. Confirmations: DELETE for assigned users
CREATE POLICY "Assigned users can delete client confirmations"
ON public.confirmations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    JOIN public.activities a ON a.id = confirmations.activity_id
    WHERE ca.client_id = a.client_id AND ca.user_id = auth.uid()
  )
);

-- 6. Products: UPDATE for assigned users
CREATE POLICY "Assigned users can update client products"
ON public.products FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = products.client_id AND ca.user_id = auth.uid()
  )
);

-- 7. Products: DELETE for assigned users
CREATE POLICY "Assigned users can delete client products"
ON public.products FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = products.client_id AND ca.user_id = auth.uid()
  )
);

-- 8. Media Plans: UPDATE for assigned users
CREATE POLICY "Assigned users can update client media plans"
ON public.media_plans FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = media_plans.client_id AND ca.user_id = auth.uid()
  )
);

-- 9. Media Plans: DELETE for assigned users
CREATE POLICY "Assigned users can delete client media plans"
ON public.media_plans FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = media_plans.client_id AND ca.user_id = auth.uid()
  )
);
