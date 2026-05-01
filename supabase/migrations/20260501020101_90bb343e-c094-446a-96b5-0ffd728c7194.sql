
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon text;
