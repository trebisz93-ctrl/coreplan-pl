
-- Tighten the INSERT policy - only service role or admin can insert
DROP POLICY "System can insert backup history" ON public.backup_history;
CREATE POLICY "Admins can insert backup history"
  ON public.backup_history FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
