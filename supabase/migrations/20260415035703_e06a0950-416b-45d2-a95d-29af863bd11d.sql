
DROP POLICY "Staff can update own open orders" ON public.orders;

CREATE POLICY "Staff can update own open orders" ON public.orders
FOR UPDATE TO authenticated
USING (staff_id = auth.uid() AND status = 'open')
WITH CHECK (staff_id = auth.uid());
