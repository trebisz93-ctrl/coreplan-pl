
-- Drop old trigger and function
DROP TRIGGER IF EXISTS on_notification_insert ON public.notifications;
DROP FUNCTION IF EXISTS public.send_notification_email();

-- Recreate with correct pg_net call signature
CREATE OR REPLACE FUNCTION public.send_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  edge_fn_url text;
  payload jsonb;
  service_key text;
BEGIN
  SELECT decrypted_secret INTO edge_fn_url
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  
  SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  edge_fn_url := edge_fn_url || '/functions/v1/send-notification-email';

  payload := jsonb_build_object(
    'record', jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'description', NEW.description,
      'type', NEW.type,
      'category', NEW.category
    )
  );

  PERFORM net.http_post(
    url := edge_fn_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    )
  );

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_notification_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_notification_email();
