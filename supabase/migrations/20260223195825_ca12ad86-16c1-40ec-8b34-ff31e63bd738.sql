
-- 1. Add status to profiles for approval flow
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Update existing profiles to active (they were already approved implicitly)
UPDATE public.profiles SET status = 'active' WHERE status = 'pending';

-- Update handle_new_user to set status=pending for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, status)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'email', 'pending');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

-- 2. Client assignments table (manager ↔ client)
CREATE TABLE public.client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id)
);

ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage client assignments"
ON public.client_assignments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own assignments"
ON public.client_assignments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Product-client junction table (many-to-many)
CREATE TABLE public.product_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, client_id)
);

ALTER TABLE public.product_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own product_clients"
ON public.product_clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage own product_clients"
ON public.product_clients
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid()
  )
);

-- 4. Confirmations table (activity proofs/photos)
CREATE TABLE public.confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  link text,
  is_cover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own confirmations"
ON public.confirmations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own confirmations"
ON public.confirmations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own confirmations"
ON public.confirmations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own confirmations"
ON public.confirmations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Add currency to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PLN';

-- 6. Storage bucket for confirmation images
INSERT INTO storage.buckets (id, name, public) VALUES ('confirmations', 'confirmations', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload confirmations"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'confirmations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view confirmations"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'confirmations');

CREATE POLICY "Users can delete own confirmations"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'confirmations' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 7. Make products.client_id nullable (products become tenant-wide, linked via product_clients)
-- Keep client_id for backward compat but allow null for shared products
ALTER TABLE public.products ALTER COLUMN client_id DROP NOT NULL;

-- 8. Seed existing product→client relationships into product_clients junction
INSERT INTO public.product_clients (product_id, client_id)
SELECT id, client_id FROM public.products WHERE client_id IS NOT NULL
ON CONFLICT (product_id, client_id) DO NOTHING;

-- 9. Update profiles RLS to allow admin to update status
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
