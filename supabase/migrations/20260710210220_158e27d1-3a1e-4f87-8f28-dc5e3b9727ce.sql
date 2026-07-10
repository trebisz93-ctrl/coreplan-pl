REVOKE ALL ON FUNCTION public.create_client_for_org(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_client_for_org(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.create_client_for_org(text, uuid) FROM sandbox_exec;
REVOKE ALL ON FUNCTION public.create_client_for_org(text, uuid) FROM sandbox_exec_aswmmhxyqafqsvnnspqj;
GRANT EXECUTE ON FUNCTION public.create_client_for_org(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_client_for_org(text, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';