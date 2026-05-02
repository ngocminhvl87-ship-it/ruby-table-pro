import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatVND, formatTableName, formatTableLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, ShoppingCart, CreditCard, FileText, ArrowRightLeft, Trash2, Replace } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import InvoicePreview from "@/components/shared/InvoicePreview";

interface Category {
  id: string;
  name: string;
  display_order: number;
  icon?: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category_id: string;
  is_available: boolean;
  icon?: string | null;
}

interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  menu_items?: { name: string; icon?: string | null };
}

interface SwapTable {
  id: string;
  table_number: number;
  status: string;
}

interface OrderModalProps {
  table: { id: string; table_number: number; status: string };
  order?: { id: string; total_amount: number; status: string; created_at?: string };
  onClose: () => void;
  onRefresh: () => void;
}

export default function OrderModal({ table, order, onClose, onRefresh }: OrderModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [availableTables, setAvailableTables] = useState<SwapTable[]>([]);
  const [isLoadingSwapTables, setIsLoadingSwapTables] = useState(false);
  const [pendingSwap, setPendingSwap] = useState<SwapTable | null>(null);
  const [swapItem, setSwapItem] = useState<OrderItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<OrderItem | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchMenu = async () => {
      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase.from("categories").select("*").order("display_order"),
        supabase.from("menu_items").select("*").eq("is_available", true).eq("is_deleted", false),
      ]);
      if (cats) {
        setCategories(cats);
        if (cats.length > 0) setSelectedCategory(cats[0].id);
      }
      if (items) setMenuItems(items);
    };
    fetchMenu();
  }, []);

  const refreshOrderItems = async () => {
    if (!order) return;
    const { data } = await supabase
      .from("order_items")
      .select("*, menu_items(name, icon)")
      .eq("order_id", order.id);
    if (data) setOrderItems(data as any);
  };

  useEffect(() => {
    refreshOrderItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  const fetchAvailableSwapTables = useCallback(async () => {
    setIsLoadingSwapTables(true);
    try {
      const { data, error } = await supabase
        .from("tables")
        .select("id, table_number, status")
        .order("table_number", { ascending: true });

      if (error) throw error;

      // Chỉ lấy bàn "available" (trống thực sự). Dữ liệu đã được chuẩn hoá.
      const emptyTables = ((data || []) as SwapTable[])
        .filter((t) => t.id !== table.id && t.status === "available")
        .sort((a, b) => a.table_number - b.table_number);

      setAvailableTables(emptyTables);
    } catch (error: any) {
      toast({ title: "Lỗi tải bàn trống", description: error.message, variant: "destructive" });
      setAvailableTables([]);
    } finally {
      setIsLoadingSwapTables(false);
    }
  }, [table.id, toast]);

  useEffect(() => {
    if (!showSwapDialog) return;

    const channel = supabase
      .channel(`swap-tables-${table.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tables" }, () => {
        fetchAvailableSwapTables();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tables" }, () => {
        fetchAvailableSwapTables();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAvailableSwapTables, showSwapDialog, table.id]);

  const updateOrderItemQty = async (item: OrderItem, delta: number) => {
    const newQty = item.quantity + delta;
    try {
      if (newQty <= 0) {
        const { error } = await supabase.from("order_items").delete().eq("id", item.id);
        if (error) throw error;
        toast({ title: "🗑️ Đã xoá", description: `${item.menu_items?.name} khỏi order` });
      } else {
        const { error } = await supabase
          .from("order_items")
          .update({ quantity: newQty, subtotal: item.unit_price * newQty })
          .eq("id", item.id);
        if (error) throw error;
      }
      await refreshOrderItems();
      onRefresh();
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  };

  const deleteOrderItem = async (item: OrderItem) => {
    try {
      const { error } = await supabase.from("order_items").delete().eq("id", item.id);
      if (error) throw error;
      toast({ title: "🗑️ Đã xoá", description: `${item.menu_items?.name}` });
      await refreshOrderItems();
      onRefresh();
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  };

  const swapOrderItem = async (item: OrderItem, newMenuItemId: string) => {
    const newMenu = menuItems.find((m) => m.id === newMenuItemId);
    if (!newMenu) return;
    try {
      const { error } = await supabase
        .from("order_items")
        .update({
          menu_item_id: newMenu.id,
          unit_price: newMenu.price,
          subtotal: newMenu.price * item.quantity,
        })
        .eq("id", item.id);
      if (error) throw error;
      toast({ title: "🔁 Đã đổi món", description: `→ ${newMenu.name}` });
      await refreshOrderItems();
      onRefresh();
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  };

  const addToCart = (itemId: string) => {
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) newCart[itemId]--;
      else delete newCart[itemId];
      return newCart;
    });
  };

  const cartTotal = Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = menuItems.find((m) => m.id === itemId);
    return sum + (item?.price || 0) * qty;
  }, 0);

  const cartItems = Object.entries(cart).map(([itemId, qty]) => {
    const item = menuItems.find((m) => m.id === itemId)!;
    return { ...item, quantity: qty, subtotal: item.price * qty };
  }).filter(Boolean);

  const handleSubmitOrder = async () => {
    if (Object.keys(cart).length === 0) return;
    setIsSubmitting(true);

    try {
      let orderId = order?.id;

      if (!orderId) {
        // Create new order — DB trigger sẽ tự set bàn = 'occupied'
        const { data: newOrder, error } = await supabase
          .from("orders")
          .insert({ table_id: table.id, staff_id: user!.id, status: "open", total_amount: 0 })
          .select()
          .single();
        if (error) throw error;
        orderId = newOrder.id;
      }

      // Add order items
      const items = Object.entries(cart).map(([itemId, qty]) => {
        const item = menuItems.find((m) => m.id === itemId)!;
        return {
          order_id: orderId!,
          menu_item_id: itemId,
          quantity: qty,
          unit_price: item.price,
          subtotal: item.price * qty,
        };
      });

      const { error: itemsError } = await supabase.from("order_items").insert(items);
      if (itemsError) throw itemsError;

      setCart({});
      toast({ title: "✅ Thành công", description: "Đã thêm món vào order" });
      onRefresh();
      onClose();
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!order) return;
    setIsSubmitting(true);
    try {
      // DB trigger sẽ tự cập nhật bàn về 'available' khi không còn order 'open'
      const { error } = await supabase.from("orders").update({ status: "paid" }).eq("id", order.id);
      if (error) throw error;
      toast({ title: "💰 Đã thanh toán", description: `${formatTableLabel(table.table_number)} đã trống` });
      onRefresh();
      onClose();
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSwapDialog = async () => {
    setShowSwapDialog(true);
    await fetchAvailableSwapTables();
  };

  const handleSwapTable = async (newTableId: string, newTableNumber: number) => {
    if (!order) return;
    setIsSubmitting(true);
    const oldTableNumber = table.table_number;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")} ${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
    try {
      // DB trigger tự đồng bộ trạng thái cả 2 bàn (cũ → available, mới → occupied)
      const { error: orderErr } = await supabase
        .from("orders")
        .update({ table_id: newTableId })
        .eq("id", order.id);
      if (orderErr) throw orderErr;

      toast({
        title: `✅ Đổi bàn thành công → ${formatTableLabel(newTableNumber)}`,
        description: `Từ ${formatTableLabel(oldTableNumber)} sang ${formatTableLabel(newTableNumber)} lúc ${timeStr}`,
      });
      await fetchAvailableSwapTables();
      setShowSwapDialog(false);
      await onRefresh();
      onClose();
    } catch (error: any) {
      toast({
        title: `❌ Đổi bàn thất bại → ${formatTableLabel(newTableNumber)}`,
        description: `${error.message} (lúc ${timeStr})`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = menuItems.filter((m) => m.category_id === selectedCategory);

  return (
    <>
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl w-[100vw] sm:w-[95vw] h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 gap-0 overflow-hidden rounded-none sm:rounded-lg">
        <DialogHeader className="p-3 sm:p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="text-lg sm:text-xl">{formatTableLabel(table.table_number)}</span>
            <Badge variant={order ? "destructive" : "secondary"}>
              {order ? "Đang dùng" : "Trống"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row overflow-hidden flex-1 min-h-0 h-[calc(100dvh-60px)] sm:h-[calc(90vh-80px)]">
          {/* Menu Section */}
          <div className="flex-1 min-w-0 flex flex-col border-r">
            {/* Category tabs */}
            <div className="flex gap-1 p-2 overflow-x-auto border-b flex-shrink-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span className="text-base leading-none">{cat.icon || "📋"}</span>
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Menu items */}
            <ScrollArea className="flex-1 p-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item.id)}
                    className="flex flex-col items-center p-2 rounded-xl bg-card border hover:border-primary hover:shadow-md active:scale-95 transition text-center group"
                  >
                    <div className="w-full aspect-square bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center text-4xl mb-1.5">
                      {item.icon || "☕"}
                    </div>
                    <div className="font-medium text-xs sm:text-sm truncate w-full" title={item.name}>{item.name}</div>
                    <div className="text-xs text-primary font-bold">{formatVND(item.price)}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Cart Section */}
          <div className="w-full md:w-80 md:min-w-[320px] flex flex-col bg-muted/30 flex-shrink-0 border-t md:border-t-0 max-h-[45vh] md:max-h-none">
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShoppingCart className="h-4 w-4" />
                Đơn hàng
              </div>
            </div>

            <ScrollArea className="flex-1 p-2">
              {/* Existing items - editable */}
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-1 py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0">{item.menu_items?.icon || "☕"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-medium truncate">{item.menu_items?.name}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">{formatVND(item.subtotal)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateOrderItemQty(item, -1)}
                      className="h-8 w-8 rounded bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground active:scale-95 transition"
                      title="Giảm"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs sm:text-sm font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateOrderItemQty(item, 1)}
                      className="h-8 w-8 rounded bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground active:scale-95 transition"
                      title="Tăng"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setSwapItem(item)}
                      className="h-8 w-8 rounded bg-muted flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground active:scale-95 transition ml-0.5"
                      title="Đổi món"
                    >
                      <Replace className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteItem(item)}
                      className="h-8 w-8 rounded bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground active:scale-95 transition"
                      title="Xoá"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {orderItems.length > 0 && cartItems.length > 0 && (
                <Separator className="my-2" />
              )}

              {/* New items in cart */}
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0">{item.icon || "☕"}</span>
                    <div className="text-xs sm:text-sm flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      <span className="text-muted-foreground text-[10px] sm:text-xs">{formatVND(item.price)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => removeFromCart(item.id)} className="h-8 w-8 rounded bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground active:scale-95 transition">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs sm:text-sm font-bold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => addToCart(item.id)} className="h-8 w-8 rounded bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground active:scale-95 transition">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </ScrollArea>

            {/* Sticky bottom totals + actions */}
            <div className="sticky bottom-0 border-t p-3 space-y-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              {order && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hiện tại:</span>
                  <span className="font-bold">{formatVND(order.total_amount)}</span>
                </div>
              )}
              {cartTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Thêm mới:</span>
                  <span className="font-bold text-primary">{formatVND(cartTotal)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Tổng cộng:</span>
                <span>{formatVND((order?.total_amount || 0) + cartTotal)}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                {Object.keys(cart).length > 0 && (
                  <Button onClick={handleSubmitOrder} disabled={isSubmitting} className="w-full font-bold h-11" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    {order ? "Thêm món" : "Tạo order"}
                  </Button>
                )}
                {order && order.status === "open" && (
                  <Button onClick={handleMarkPaid} disabled={isSubmitting} variant="secondary" className="w-full font-bold h-11" size="sm">
                    <CreditCard className="h-4 w-4 mr-1" />
                    Thanh toán
                  </Button>
                )}
                {order && order.status === "open" && (
                  <Button onClick={openSwapDialog} disabled={isSubmitting} variant="outline" className="w-full font-bold h-11" size="sm">
                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                    Đổi bàn
                  </Button>
                )}
                {order && orderItems.length > 0 && (
                  <Button onClick={() => setShowInvoice(true)} variant="outline" className="w-full font-bold h-11" size="sm">
                    <FileText className="h-4 w-4 mr-1" />
                    In hoá đơn
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {showInvoice && order && (
      <InvoicePreview
        open={showInvoice}
        onClose={() => setShowInvoice(false)}
        tableNumber={table.table_number}
        staffName={user?.email || "N/A"}
        createdAt={order.created_at || new Date().toISOString()}
        items={orderItems.map((item) => ({
          name: (item as any).menu_items?.name || "—",
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        }))}
        totalAmount={order.total_amount}
      />
    )}

    {showSwapDialog && (
      <Dialog open onOpenChange={() => setShowSwapDialog(false)}>
        <DialogContent className="top-auto bottom-0 h-[min(78dvh,640px)] w-[100vw] translate-y-0 rounded-t-2xl p-0 gap-0 overflow-hidden sm:top-[50%] sm:bottom-auto sm:h-auto sm:max-h-[80vh] sm:w-[95vw] sm:max-w-lg sm:translate-y-[-50%] sm:rounded-lg">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Đổi bàn từ {formatTableName(table.table_number)}
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col p-4 pt-3">
            <p className="text-sm text-muted-foreground">Chọn bàn trống để chuyển order sang:</p>
            {isLoadingSwapTables ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Đang tải bàn trống mới nhất...</div>
            ) : availableTables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Không có bàn trống nào</div>
            ) : (
              <div className="mt-3 grid flex-1 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2 overflow-y-auto smooth-scroll pr-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
                {availableTables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setPendingSwap(t)}
                    disabled={isSubmitting}
                    className="table-card-available min-h-[72px] rounded-lg p-3 font-bold text-sm hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50 touch-manipulation"
                  >
                    #{t.table_number}
                    <div className="text-xs opacity-80 font-normal">Trống</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )}

    <AlertDialog open={!!pendingSwap} onOpenChange={(o) => !o && setPendingSwap(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Xác nhận đổi bàn</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc muốn chuyển toàn bộ order từ <strong>Bàn #{table.table_number}</strong> sang{" "}
            <strong>Bàn #{pendingSwap?.table_number}</strong>?
            <br />
            Bàn #{table.table_number} sẽ trở thành <strong>Trống</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            onClick={async () => {
              if (pendingSwap) {
                const target = pendingSwap;
                setPendingSwap(null);
                await handleSwapTable(target.id, target.table_number);
              }
            }}
          >
            Đồng ý đổi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {swapItem && (
      <Dialog open onOpenChange={() => setSwapItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Replace className="h-4 w-4" /> Đổi món
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              Đổi <strong>{swapItem.menu_items?.name}</strong> (x{swapItem.quantity}) thành:
            </div>
            <Select
              onValueChange={async (val) => {
                const target = swapItem;
                setSwapItem(null);
                await swapOrderItem(target, val);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Chọn món mới" /></SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectGroup key={cat.id}>
                    <SelectLabel className="text-xs">{cat.icon || "📋"} {cat.name}</SelectLabel>
                    {menuItems
                      .filter((m) => m.category_id === cat.id)
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="mr-1">{m.icon || "☕"}</span>
                          {m.name} — {formatVND(m.price)}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>
    )}

    <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Xoá món khỏi order?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc muốn xoá <strong>{deleteItem?.menu_items?.name}</strong> (x{deleteItem?.quantity}) khỏi order này?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              if (deleteItem) {
                const target = deleteItem;
                setDeleteItem(null);
                await deleteOrderItem(target);
              }
            }}
          >
            Xoá
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
