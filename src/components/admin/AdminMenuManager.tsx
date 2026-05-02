import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatVND } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";

// Bộ icon dùng chung cho cả Danh mục và Món để đảm bảo đồng bộ
const SHARED_ICONS = [
  "☕", "🥃", "🍵", "🧋", "🥤", "🧉", "🍶", "🍷", "🍺", "🍹",
  "🥛", "🧃", "🍨", "🍦", "🍰", "🎂", "🧁", "🍮", "🍪", "🥐",
  "🥯", "🍞", "🥪", "🍔", "🍟", "🍕", "🌮", "🍱", "🥗", "🍝",
];
const CATEGORY_ICONS = SHARED_ICONS;
const ITEM_ICONS = SHARED_ICONS;

interface Category {
  id: string;
  name: string;
  icon: string | null;
  display_order: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category_id: string;
  description: string | null;
  icon: string | null;
  is_available: boolean;
  is_deleted: boolean;
  categories?: { name: string };
}

export default function AdminMenuManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const { toast } = useToast();

  // Add category
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("☕");

  // Edit category
  const [editCat, setEditCat] = useState<Category | null>(null);

  // Add / edit item
  const [showAddItem, setShowAddItem] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const emptyItem = { name: "", price: "", category_id: "", description: "", icon: "☕" };
  const [itemForm, setItemForm] = useState(emptyItem);

  // Delete confirm
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);

  const fetchData = async () => {
    const [{ data: cats }, { data: items }] = await Promise.all([
      supabase.from("categories").select("*").order("display_order"),
      supabase.from("menu_items").select("*, categories(name)").eq("is_deleted", false).order("name"),
    ]);
    if (cats) setCategories(cats as Category[]);
    if (items) setMenuItems(items as MenuItem[]);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ----- Category CRUD -----
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const { error } = await supabase.from("categories").insert({
      name: newCatName.toUpperCase(),
      icon: newCatIcon,
      display_order: categories.length,
    });
    if (error) toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    else {
      setNewCatName("");
      setNewCatIcon("☕");
      fetchData();
      toast({ title: "✅ Đã thêm danh mục" });
    }
  };

  const saveEditCategory = async () => {
    if (!editCat) return;
    const { error } = await supabase
      .from("categories")
      .update({ name: editCat.name.toUpperCase(), icon: editCat.icon })
      .eq("id", editCat.id);
    if (error) toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    else {
      setEditCat(null);
      fetchData();
      toast({ title: "✅ Đã cập nhật danh mục" });
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCat) return;
    const itemsInCat = menuItems.filter((m) => m.category_id === deleteCat.id);
    if (itemsInCat.length > 0) {
      // 1) Ẩn các món để không hiển thị nữa
      const { error: e1 } = await supabase
        .from("menu_items")
        .update({ is_deleted: true, is_available: false })
        .eq("category_id", deleteCat.id);
      if (e1) {
        toast({ title: "Lỗi", description: e1.message, variant: "destructive" });
        setDeleteCat(null);
        return;
      }
      // 2) Chuyển sang danh mục khác để tránh ON DELETE CASCADE xoá menu_items
      //    (sẽ vướng FK với order_items của hoá đơn cũ)
      const fallback = categories.find((c) => c.id !== deleteCat.id);
      if (fallback) {
        const { error: e2 } = await supabase
          .from("menu_items")
          .update({ category_id: fallback.id })
          .eq("category_id", deleteCat.id);
        if (e2) {
          toast({ title: "Lỗi", description: e2.message, variant: "destructive" });
          setDeleteCat(null);
          return;
        }
      }
    }
    const { error } = await supabase.from("categories").delete().eq("id", deleteCat.id);
    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "🗑️ Đã xoá danh mục", description: itemsInCat.length > 0 ? `Đã ẩn ${itemsInCat.length} món thuộc danh mục` : undefined });
      fetchData();
    }
    setDeleteCat(null);
  };

  // ----- Item CRUD -----
  const openAddItem = () => {
    setItemForm({ ...emptyItem, category_id: categories[0]?.id || "" });
    setShowAddItem(true);
  };

  const addMenuItem = async () => {
    if (!itemForm.name || !itemForm.price || !itemForm.category_id) {
      toast({ title: "Thiếu thông tin", description: "Nhập đủ tên, giá, danh mục", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("menu_items").insert({
      name: itemForm.name,
      price: Math.round(parseFloat(itemForm.price)),
      category_id: itemForm.category_id,
      description: itemForm.description || null,
      icon: itemForm.icon,
    });
    if (error) toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    else {
      setItemForm(emptyItem);
      setShowAddItem(false);
      fetchData();
      toast({ title: "✅ Đã thêm món" });
    }
  };

  const openEditItem = (item: MenuItem) => {
    setEditItem({ ...item });
  };

  const saveEditItem = async () => {
    if (!editItem) return;
    const { error } = await supabase
      .from("menu_items")
      .update({
        name: editItem.name,
        price: editItem.price,
        category_id: editItem.category_id,
        description: editItem.description,
        icon: editItem.icon,
      })
      .eq("id", editItem.id);
    if (error) toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    else {
      setEditItem(null);
      fetchData();
      toast({ title: "✅ Đã cập nhật món" });
    }
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    await supabase.from("menu_items").update({ is_available: !current }).eq("id", id);
    fetchData();
  };

  const confirmDeleteItem = async () => {
    if (!deleteItem) return;
    // Thử xoá cứng trước; nếu vướng FK (đã có trong order_items) thì soft delete
    const { error } = await supabase.from("menu_items").delete().eq("id", deleteItem.id);
    if (error) {
      // Soft delete fallback
      const { error: e2 } = await supabase
        .from("menu_items")
        .update({ is_deleted: true, is_available: false })
        .eq("id", deleteItem.id);
      if (e2) {
        toast({ title: "Lỗi", description: e2.message, variant: "destructive" });
      } else {
        toast({ title: "🗑️ Đã ẩn món", description: "Món đã có trong hoá đơn cũ nên được ẩn thay vì xoá" });
        fetchData();
      }
    } else {
      toast({ title: "🗑️ Đã xoá món" });
      fetchData();
    }
    setDeleteItem(null);
  };

  return (
    <div className="space-y-4">
      {/* CATEGORIES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" /> Danh mục ({categories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Select value={newCatIcon} onValueChange={setNewCatIcon}>
              <SelectTrigger className="w-20 text-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <div className="grid grid-cols-5 gap-1 p-1">
                  {CATEGORY_ICONS.map((ic) => (
                    <SelectItem key={ic} value={ic} className="text-xl justify-center">
                      {ic}
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>
            <Input
              placeholder="Tên danh mục mới (VD: TRÀ SỮA)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addCategory} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Thêm
            </Button>
          </div>

          {/* Grid thumbnails */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="group relative bg-gradient-to-br from-card to-muted/40 border border-border rounded-xl p-3 hover:shadow-md hover:border-primary/40 transition-all"
              >
                <div className="text-4xl text-center mb-1">{c.icon || "📋"}</div>
                <div className="text-center text-sm font-semibold truncate">{c.name}</div>
                <div className="text-center text-xs text-muted-foreground">
                  {menuItems.filter((m) => m.category_id === c.id).length} món
                </div>
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => setEditCat({ ...c })}
                    className="p-1 rounded bg-background/80 hover:bg-primary hover:text-primary-foreground"
                    aria-label="Sửa danh mục"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setDeleteCat(c)}
                    className="p-1 rounded bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="Xoá danh mục"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* MENU ITEMS */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Menu ({menuItems.length} món)</CardTitle>
          <Button size="sm" onClick={openAddItem}>
            <Plus className="h-4 w-4 mr-1" /> Thêm món
          </Button>
        </CardHeader>
        <CardContent>
          {categories.map((cat) => {
            const catItems = menuItems.filter((m) => m.category_id === cat.id);
            if (catItems.length === 0) return null;
            return (
              <div key={cat.id} className="mb-6">
                <h3 className="font-bold text-sm text-primary mb-3 flex items-center gap-2">
                  <span className="text-lg">{cat.icon || "📋"}</span> {cat.name}
                  <Badge variant="secondary" className="ml-1">{catItems.length}</Badge>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className={`group relative bg-card border rounded-xl p-3 hover:shadow-lg hover:border-primary/40 transition-all ${
                        !item.is_available ? "opacity-60" : ""
                      }`}
                    >
                      <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center text-5xl mb-2">
                        {item.icon || "☕"}
                      </div>
                      <div className="text-sm font-semibold truncate" title={item.name}>
                        {item.name}
                      </div>
                      <div className="text-primary font-bold text-sm">{formatVND(item.price)}</div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        <Switch
                          checked={item.is_available}
                          onCheckedChange={() => toggleAvailability(item.id, item.is_available)}
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditItem(item)}
                            className="p-1.5 rounded hover:bg-muted"
                            aria-label="Sửa món"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteItem(item)}
                            className="p-1.5 rounded text-destructive hover:bg-destructive/10"
                            aria-label="Xoá món"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* DIALOG: Add item */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm món mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Icon</Label>
              <div className="grid grid-cols-10 gap-1 mt-1 max-h-32 overflow-y-auto p-2 border rounded">
                {ITEM_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setItemForm({ ...itemForm, icon: ic })}
                    className={`text-2xl p-1 rounded hover:bg-muted ${
                      itemForm.icon === ic ? "bg-primary/20 ring-2 ring-primary" : ""
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Tên món</Label>
              <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Giá (VND)</Label>
              <Input
                type="number"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
              />
            </div>
            <div>
              <Label>Danh mục</Label>
              <Select
                value={itemForm.category_id}
                onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mô tả (tuỳ chọn)</Label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              />
            </div>
            <Button onClick={addMenuItem} className="w-full">
              Thêm món
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Edit item */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa món</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <div>
                <Label>Icon</Label>
                <div className="grid grid-cols-10 gap-1 mt-1 max-h-32 overflow-y-auto p-2 border rounded">
                  {ITEM_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setEditItem({ ...editItem, icon: ic })}
                      className={`text-2xl p-1 rounded hover:bg-muted ${
                        editItem.icon === ic ? "bg-primary/20 ring-2 ring-primary" : ""
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Tên món</Label>
                <Input value={editItem.name} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} />
              </div>
              <div>
                <Label>Giá (VND)</Label>
                <Input
                  type="number"
                  value={editItem.price}
                  onChange={(e) => setEditItem({ ...editItem, price: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Danh mục</Label>
                <Select
                  value={editItem.category_id}
                  onValueChange={(v) => setEditItem({ ...editItem, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mô tả</Label>
                <Textarea
                  value={editItem.description || ""}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditItem(null)}>Huỷ</Button>
                <Button onClick={saveEditItem}>Lưu thay đổi</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: Edit category */}
      <Dialog open={!!editCat} onOpenChange={(o) => !o && setEditCat(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa danh mục</DialogTitle>
          </DialogHeader>
          {editCat && (
            <div className="space-y-3">
              <div>
                <Label>Icon</Label>
                <div className="grid grid-cols-10 gap-1 mt-1 max-h-32 overflow-y-auto p-2 border rounded">
                  {CATEGORY_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setEditCat({ ...editCat, icon: ic })}
                      className={`text-2xl p-1 rounded hover:bg-muted ${
                        editCat.icon === ic ? "bg-primary/20 ring-2 ring-primary" : ""
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Tên danh mục</Label>
                <Input value={editCat.name} onChange={(e) => setEditCat({ ...editCat, name: e.target.value })} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditCat(null)}>Huỷ</Button>
                <Button onClick={saveEditCategory}>Lưu thay đổi</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRM: Delete category */}
      <AlertDialog open={!!deleteCat} onOpenChange={(o) => !o && setDeleteCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá danh mục "{deleteCat?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCat && menuItems.filter((m) => m.category_id === deleteCat.id).length > 0 ? (
                <>
                  Danh mục này có{" "}
                  <strong>{menuItems.filter((m) => m.category_id === deleteCat.id).length} món</strong>. Khi xoá, các
                  món thuộc danh mục sẽ được <strong>ẩn</strong> (giữ lại trong hoá đơn cũ).
                </>
              ) : (
                "Hành động này không thể hoàn tác."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRM: Delete item */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá món "{deleteItem?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Nếu món đã có trong hoá đơn cũ, hệ thống sẽ tự động <strong>ẩn món</strong> thay vì xoá để giữ lịch sử
              doanh thu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
