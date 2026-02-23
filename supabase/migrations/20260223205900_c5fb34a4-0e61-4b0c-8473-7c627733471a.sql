
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  description text,
  entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  cta_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users see own notifications, admins see all
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: notify admins when new user registers
CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, category, title, description, cta_path)
  SELECT ur.user_id, 'info', 'account',
    'Nowe konto do zatwierdzenia',
    'Użytkownik ' || COALESCE(NEW.display_name, 'nieznany') || ' czeka na zatwierdzenie.',
    '/settings'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_profile_notify_admins
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_user();
