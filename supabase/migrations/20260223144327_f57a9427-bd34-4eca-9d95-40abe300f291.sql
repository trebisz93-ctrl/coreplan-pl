
ALTER TABLE public.products ADD COLUMN ean TEXT;
ALTER TABLE public.clients ADD COLUMN annual_budget NUMERIC NOT NULL DEFAULT 0;
