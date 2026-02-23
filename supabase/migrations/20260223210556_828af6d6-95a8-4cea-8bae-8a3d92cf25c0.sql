
-- Create campaign_types table
CREATE TABLE public.campaign_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign types"
  ON public.campaign_types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own campaign types"
  ON public.campaign_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaign types"
  ON public.campaign_types FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaign types"
  ON public.campaign_types FOR DELETE
  USING (auth.uid() = user_id);
