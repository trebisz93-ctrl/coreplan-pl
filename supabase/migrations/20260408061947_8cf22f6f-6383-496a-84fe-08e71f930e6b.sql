
-- Add RLS policy on realtime.messages to restrict channel subscriptions
-- Users can only listen to channels matching their own user ID
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only subscribe to own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow subscription only when the topic extension contains the user's ID
  -- Supabase Realtime channels use topic format: realtime:<channel_name>
  EXISTS (
    SELECT 1 WHERE auth.uid()::text = ANY(
      string_to_array(
        (extension::jsonb->>'topic')::text, ':'
      )
    )
  )
  OR public.is_super_admin(auth.uid())
);
