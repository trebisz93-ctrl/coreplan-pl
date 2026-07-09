
-- Store shared secret for send-notification-email in vault
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'notification_email_secret') THEN
    PERFORM vault.update_secret(
      (SELECT id FROM vault.secrets WHERE name = 'notification_email_secret'),
      '7e5b4330ecbc8a5a400f2a24ce5ee0cbf7a041a822a5b89887f31774fc3ad3d1'
    );
  ELSE
    PERFORM vault.create_secret('7e5b4330ecbc8a5a400f2a24ce5ee0cbf7a041a822a5b89887f31774fc3ad3d1', 'notification_email_secret');
  END IF;
END $$;

-- Update trigger fn to include shared secret header
CREATE OR REPLACE FUNCTION public.send_notification_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  payload jsonb;
  shared_secret text;
BEGIN
  SELECT decrypted_secret INTO shared_secret
  FROM vault.decrypted_secrets WHERE name = 'notification_email_secret';

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
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Notification-Secret', shared_secret
    )
  );

  RETURN NEW;
END;
$function$;
