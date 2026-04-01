
CREATE OR REPLACE FUNCTION send_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzd21taHh5cWFmcXN2bm5zcHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTQ5MTQsImV4cCI6MjA4NzQzMDkxNH0.mImBvbvr5Bb0YZxpeYF1j4FYoJ8whAc5HPfCYYXs_o',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzd21taHh5cWFmcXN2bm5zcHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTQ5MTQsImV4cCI6MjA4NzQzMDkxNH0.mImBvbvr5Bb0YZxpeYF1j4FYoJ8whAc5HPfCYYXs_o'
    )
  );

  RETURN NEW;
END;
$$;
