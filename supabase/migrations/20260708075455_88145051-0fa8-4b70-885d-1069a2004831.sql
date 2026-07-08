CREATE OR REPLACE FUNCTION public.grant_prgm_role(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_org_id uuid;
BEGIN
  SELECT organization_id INTO _caller_org_id
  FROM public.organization_members
  WHERE user_id = auth.uid() AND org_role = 'org_admin'
  LIMIT 1;

  IF _caller_org_id IS NULL THEN
    RAISE EXCEPTION 'Tylko admin organizacji może nadawać rolę PRGM';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _target_user_id AND organization_id = _caller_org_id
  ) THEN
    RAISE EXCEPTION 'Użytkownik nie należy do Twojej organizacji';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, 'prgm'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_prgm_role(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_org_id uuid;
BEGIN
  SELECT organization_id INTO _caller_org_id
  FROM public.organization_members
  WHERE user_id = auth.uid() AND org_role = 'org_admin'
  LIMIT 1;

  IF _caller_org_id IS NULL THEN
    RAISE EXCEPTION 'Tylko admin organizacji może odbierać rolę PRGM';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _target_user_id AND organization_id = _caller_org_id
  ) THEN
    RAISE EXCEPTION 'Użytkownik nie należy do Twojej organizacji';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _target_user_id AND role = 'prgm'::public.app_role;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_prgm_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_prgm_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_prgm_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_prgm_role(uuid) TO authenticated;