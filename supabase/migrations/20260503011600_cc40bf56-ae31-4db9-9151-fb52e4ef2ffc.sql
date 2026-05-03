-- Move existing TO GO table (currently #21) to #22, then add a new regular table #21
-- Use a temporary high number to avoid unique conflicts if any
UPDATE public.tables SET table_number = 9999 WHERE table_number = 21;
-- If a #22 already exists, push it aside (unlikely)
UPDATE public.tables SET table_number = 9998 WHERE table_number = 22;
-- The TO GO table becomes #22
UPDATE public.tables SET table_number = 22 WHERE table_number = 9999;
-- Insert new regular table #21
INSERT INTO public.tables (table_number, status) VALUES (21, 'available');