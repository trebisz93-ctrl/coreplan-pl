
-- Create media_plans table
CREATE TABLE public.media_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  year integer NOT NULL DEFAULT 2026,
  version text DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media plans" ON public.media_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own media plans" ON public.media_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own media plans" ON public.media_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own media plans" ON public.media_plans FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_media_plans_updated_at BEFORE UPDATE ON public.media_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create activities table
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.media_plans(id) ON DELETE SET NULL,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'online',
  campaign_type text NOT NULL DEFAULT 'display',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL DEFAULT CURRENT_DATE,
  product_ids uuid[] NOT NULL DEFAULT '{}',
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" ON public.activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own activities" ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activities" ON public.activities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own activities" ON public.activities FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
