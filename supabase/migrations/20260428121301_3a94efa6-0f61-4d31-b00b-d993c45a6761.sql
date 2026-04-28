-- Allow staff to update items in their own open orders
CREATE POLICY "Staff can update order items in own open orders"
ON public.order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.staff_id = auth.uid()
      AND orders.status = 'open'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.staff_id = auth.uid()
      AND orders.status = 'open'
  )
);

-- Allow staff to delete items from their own open orders
CREATE POLICY "Staff can delete order items in own open orders"
ON public.order_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.staff_id = auth.uid()
      AND orders.status = 'open'
  )
);

-- Trigger to recalculate order total on insert/update/delete of order_items
DROP TRIGGER IF EXISTS trg_recalc_order_total ON public.order_items;
CREATE TRIGGER trg_recalc_order_total
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_order_total();