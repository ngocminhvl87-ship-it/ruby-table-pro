-- Đảm bảo các món HOT TREND đã được ẩn
UPDATE public.menu_items
SET is_deleted = true, is_available = false, updated_at = now()
WHERE category_id = '1ad525e1-42f5-4695-a4f4-4b6117bd6ae6';

-- Chuyển sang danh mục khác để tránh CASCADE xoá khi xoá category
UPDATE public.menu_items
SET category_id = '8990d06c-93d1-403f-87d2-9d19e1b43270'
WHERE category_id = '1ad525e1-42f5-4695-a4f4-4b6117bd6ae6';

-- Xoá danh mục HOT TREND
DELETE FROM public.categories WHERE id = '1ad525e1-42f5-4695-a4f4-4b6117bd6ae6';