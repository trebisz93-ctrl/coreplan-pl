
-- Create backup_history table
CREATE TABLE public.backup_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  file_path text NOT NULL,
  checksum text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'success',
  error_message text,
  user_id uuid NOT NULL
);

ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all backup history"
  ON public.backup_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert backup history"
  ON public.backup_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete backup history"
  ON public.backup_history FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create private backups storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('backups', 'backups', false);

-- Storage policies for backups bucket
CREATE POLICY "Admins can read backups"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'backups' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can upload backups"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'backups');

CREATE POLICY "Admins can delete old backups"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'backups' AND has_role(auth.uid(), 'admin'::app_role));

-- Enable pg_cron and pg_net for scheduled backups
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Cleanup function for old backups (>30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_backups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete from storage via marking in history
  DELETE FROM public.backup_history
  WHERE created_at < now() - interval '30 days';
END;
$$;
