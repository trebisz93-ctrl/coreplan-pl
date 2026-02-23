
-- Add brand, category, subcategory columns to products table
ALTER TABLE public.products ADD COLUMN brand text;
ALTER TABLE public.products ADD COLUMN category text;
ALTER TABLE public.products ADD COLUMN subcategory text;
