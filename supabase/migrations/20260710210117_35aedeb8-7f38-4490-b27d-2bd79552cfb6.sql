CREATE OR REPLACE FUNCTION public.create_client_for_org(_name text, _organization_id uuid)
RETURNS public.clients
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  _client public.clients;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _organization_id IS NULL THEN
    RAISE EXCEPTION 'Organization is required';
  END IF;

  IF NULLIF(btrim(_name), '') IS NULL THEN
    RAISE EXCEPTION 'Client name is required';
  END IF;

  IF NOT (
    public.is_super_admin(_uid)
    OR public.get_org_role(_uid, _organization_id) = ANY (ARRAY['org_admin', 'admin'])
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges to create clients for this organization';
  END IF;

  INSERT INTO public.clients (name, user_id)
  VALUES (btrim(_name), _uid)
  RETURNING * INTO _client;

  INSERT INTO public.organization_clients (organization_id, client_id)
  VALUES (_organization_id, _client.id)
  ON CONFLICT (organization_id, client_id) DO NOTHING;

  RETURN _client;
END;
$$;

REVOKE ALL ON FUNCTION public.create_client_for_org(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_client_for_org(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_client_for_org(text, uuid) TO service_role;

DROP TRIGGER IF EXISTS _debug_clients_insert_trg ON public.clients;
DROP FUNCTION IF EXISTS public._debug_clients_insert();

DROP POLICY IF EXISTS org_insert_clients ON public.clients;
CREATE POLICY org_insert_clients
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.has_any_org_membership(auth.uid())
);

NOTIFY pgrst, 'reload schema';