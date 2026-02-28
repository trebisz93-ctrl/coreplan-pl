
DROP TRIGGER IF EXISTS on_notification_insert ON public.notifications;
DROP FUNCTION IF EXISTS public.send_notification_email();

CREATE OR REPLACE FUNCTION public.send_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payload jsonb;
BEGIN
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
    url := 'https://aswmmhxyqafqsvnnspqj.supabase.co/functions/v1/send-notification-email',
    body := payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_notification_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_notification_email();
