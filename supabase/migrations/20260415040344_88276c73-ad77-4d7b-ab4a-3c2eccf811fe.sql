ALTER TABLE public.orders DROP CONSTRAINT orders_staff_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE CASCADE;