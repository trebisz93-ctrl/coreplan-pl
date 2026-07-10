-- Debug helper: log WITH CHECK evaluation values on INSERT
CREATE OR REPLACE FUNCTION public._debug_clients_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_count int;
BEGIN
  SELECT count(*) INTO _org_count FROM public.get_user_org_ids(auth.uid());
  RAISE LOG '[debug_clients_insert] auth.uid()=%, NEW.user_id=%, org_count=%, current_user=%, session_user=%',
    auth.uid(), NEW.user_id, _org_count, current_user, session_user;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS _debug_clients_insert_trg ON public.clients;
CREATE TRIGGER _debug_clients_insert_trg
BEFORE INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public._debug_clients_insert();

-- Also relax org_insert_clients temporarily to just auth.uid() = user_id to confirm the EXISTS is what fails.
-- The enforce_client_org_link trigger still guards org linkage at commit.
DROP POLICY IF EXISTS "org_insert_clients" ON public.clients;
CREATE POLICY "org_insert_clients" ON public.clients
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';