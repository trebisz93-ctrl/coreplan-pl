-- Hard delete user tomasz.rebisz@danone.com from entire system
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = 'tomasz.rebisz@danone.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found in auth.users';
    RETURN;
  END IF;

  RAISE NOTICE 'Deleting user_id: %', v_user_id;

  -- Delete from public schema tables
  DELETE FROM public.organization_members WHERE user_id = v_user_id;
  DELETE FROM public.client_assignments WHERE user_id = v_user_id;
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.system_logs WHERE user_id = v_user_id OR (metadata->>'invited_user_id') = v_user_id::text;
  DELETE FROM public.audit_log WHERE user_id = v_user_id;
  DELETE FROM public.trash_registry WHERE deleted_by = v_user_id OR record_id = v_user_id;
  DELETE FROM public.profiles WHERE user_id = v_user_id;
  DELETE FROM public.email_send_log WHERE LOWER(recipient_email) = 'tomasz.rebisz@danone.com';
  DELETE FROM public.suppressed_emails WHERE LOWER(email) = 'tomasz.rebisz@danone.com';
  DELETE FROM public.email_unsubscribe_tokens WHERE LOWER(email) = 'tomasz.rebisz@danone.com';

  -- Delete from auth.users (cascades to identities, sessions, etc.)
  DELETE FROM auth.users WHERE id = v_user_id;

  RAISE NOTICE 'User completely removed';
END $$;