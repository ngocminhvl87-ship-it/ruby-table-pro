import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2 } from "lucide-react";

export default function AdminMenuManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", price: "", category_id: "", description: "" });
  const [editingCat, setEditingCat] = useState<any>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    const [{ data: cats }, { data: items }] = await Promise.all([
      supabase.from("categories").select("*").order("display_order"),
      supabase.from("menu_items").select("*, categories(name)").order("name"),
    ]);
    if (cats) setCategories(cats);
    if (items) setMenuItems(items);
  };

  useEffect(() => { fetchData(); }, []);

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: newCatName.toUpperCase(), display_order: categories.length });
    if (error) toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    else { setNewCatName(""); fetchData(); toast({ title: "✅ Đã thêm category" }); }
  };

  const addMenuItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.category_id) return;
    const { error } = await supabase.from("menu_items").insert({
      name: newItem.name,
      price: Math.round(parseFloat(newItem.price)),
      category_id: newItem.category_id,
      description: newItem.description || null,
    });
    if (error) toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    else {
      setNewItem({ name: "", price: "", category_id: "", description: "" });
      setShowAddItem(false);
      fetchData();
      toast({ title: "✅ Đã thêm món" });
    }
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    await supabase.from("menu_items").update({ is_available: !current }).eq("id", id);
    fetchData();
  };

  const deleteMenuItem = async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    else fetchData();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast({ title: "Lỗi", description: "Xoá category thất bại. Có thể còn món trong category.", variant: "destructive" });
    else fetchData();
  };

  return (
    <div className="space-y-4">
      {/* Add category */}
      <Card>
        <CardHeader><CardTitle className="text-base">Categories</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <Input placeholder="Tên category mới (VD: TRÀ SỮA)" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full sm:w-60" />
            <Button onClick={addCategory} size="sm" className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Thêm</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Badge key={c.id} variant="outline" className="gap-1 py-1">
                {c.name}
                <button onClick={() => deleteCategory(c.id)} className="ml-1 text-destructive hover:text-destructive/80">
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add menu item */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Menu ({menuItems.length} món)</CardTitle>
          <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Thêm món</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Thêm món mới</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Tên món</Label><Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} /></div>
                <div><Label>Giá (VND)</Label><Input type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} /></div>
                <div>
                  <Label>Category</Label>
                  <Select value={newItem.category_id} onValueChange={(v) => setNewItem({ ...newItem, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Chọn category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Mô tả (tuỳ chọn)</Label><Input value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} /></div>
                <Button onClick={addMenuItem} className="w-full">Thêm món</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {categories.map((cat) => {
            const catItems = menuItems.filter((m) => m.category_id === cat.id);
            if (catItems.length === 0) return null;
            return (
              <div key={cat.id} className="mb-4">
                <h3 className="font-bold text-sm text-primary mb-2">{cat.name}</h3>
                <div className="space-y-1">
                  {catItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors text-sm">
                      <div className="flex items-center gap-2">
                        <Switch checked={item.is_available} onCheckedChange={() => toggleAvailability(item.id, item.is_available)} />
                        <span className={!item.is_available ? "line-through text-muted-foreground" : ""}>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatVND(item.price)}</span>
                        <button onClick={() => deleteMenuItem(item.id)} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
