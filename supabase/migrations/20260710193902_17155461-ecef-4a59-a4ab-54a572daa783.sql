DROP POLICY IF EXISTS org_insert_clients ON public.clients;
CREATE POLICY org_insert_clients ON public.clients
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.get_user_org_ids(auth.uid()))
);