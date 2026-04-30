
-- 1. REPLICA IDENTITY FULL để realtime gửi đầy đủ old+new row
ALTER TABLE public.tables REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;

-- 2. Trigger function: tự động đồng bộ trạng thái bàn theo orders
CREATE OR REPLACE FUNCTION public.sync_table_status_from_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_id uuid;
  v_old_table_id uuid;
  v_has_open boolean;
BEGIN
  -- Xác định bàn liên quan
  IF TG_OP = 'DELETE' THEN
    v_table_id := OLD.table_id;
  ELSE
    v_table_id := NEW.table_id;
    IF TG_OP = 'UPDATE' AND OLD.table_id IS DISTINCT FROM NEW.table_id THEN
      v_old_table_id := OLD.table_id;
    END IF;
  END IF;

  -- Cập nhật bàn hiện tại
  IF v_table_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.orders
      WHERE table_id = v_table_id AND status = 'open' AND is_deleted = false
    ) INTO v_has_open;
    UPDATE public.tables
    SET status = CASE WHEN v_has_open THEN 'occupied' ELSE 'available' END,
        updated_at = now()
    WHERE id = v_table_id
      AND status IS DISTINCT FROM (CASE WHEN v_has_open THEN 'occupied' ELSE 'available' END);
  END IF;

  -- Cập nhật bàn cũ (trường hợp đổi bàn)
  IF v_old_table_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.orders
      WHERE table_id = v_old_table_id AND status = 'open' AND is_deleted = false
    ) INTO v_has_open;
    UPDATE public.tables
    SET status = CASE WHEN v_has_open THEN 'occupied' ELSE 'available' END,
        updated_at = now()
    WHERE id = v_old_table_id
      AND status IS DISTINCT FROM (CASE WHEN v_has_open THEN 'occupied' ELSE 'available' END);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_table_status_ins ON public.orders;
DROP TRIGGER IF EXISTS trg_sync_table_status_upd ON public.orders;
DROP TRIGGER IF EXISTS trg_sync_table_status_del ON public.orders;

CREATE TRIGGER trg_sync_table_status_ins
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_table_status_from_orders();

CREATE TRIGGER trg_sync_table_status_upd
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_table_status_from_orders();

CREATE TRIGGER trg_sync_table_status_del
AFTER DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_table_status_from_orders();

-- 3. Chuẩn hoá dữ liệu hiện tại: bất kỳ bàn nào không có order 'open' → 'available'
UPDATE public.tables t
SET status = 'available', updated_at = now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.table_id = t.id AND o.status = 'open' AND o.is_deleted = false
)
AND t.status <> 'available';

-- Bàn có order open mà status không phải occupied → occupied
UPDATE public.tables t
SET status = 'occupied', updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.table_id = t.id AND o.status = 'open' AND o.is_deleted = false
)
AND t.status <> 'occupied';
