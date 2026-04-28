import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatVND } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, ShoppingCart, CreditCard, RotateCcw, FileText, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import InvoicePreview from "@/components/shared/InvoicePreview";

interface Category {
  id: string;
  name: string;
  display_order: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category_id: string;
  is_available: boolean;
}

interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  menu_items?: { name: string };
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
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchMenu = async () => {
      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase.from("categories").select("*").order("display_order"),
        supabase.from("menu_items").select("*").eq("is_available", true),
      ]);
      if (cats) {
        setCategories(cats);
        if (cats.length > 0) setSelectedCategory(cats[0].id);
      }
      if (items) setMenuItems(items);
    };
    fetchMenu();
  }, []);

  useEffect(() => {
    if (order) {
      const fetchOrderItems = async () => {
        const { data } = await supabase
          .from("order_items")
          .select("*, menu_items(name)")
          .eq("order_id", order.id);
        if (data) setOrderItems(data as any);
      };
      fetchOrderItems();
    }
  }, [order]);

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
        // Create new order
        const { data: newOrder, error } = await supabase
          .from("orders")
          .insert({ table_id: table.id, staff_id: user!.id, status: "open", total_amount: 0 })
          .select()
          .single();
        if (error) throw error;
        orderId = newOrder.id;

        // Update table status
        await supabase.from("tables").update({ status: "occupied" }).eq("id", table.id);
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
      await supabase.from("orders").update({ status: "paid" }).eq("id", order.id);
      await supabase.from("tables").update({ status: "paid" }).eq("id", table.id);
      toast({ title: "💰 Đã thanh toán", description: `Bàn #${table.table_number}` });
      onRefresh();
      onClose();
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetTable = async () => {
    setIsSubmitting(true);
    try {
      await supabase.from("tables").update({ status: "available" }).eq("id", table.id);
      toast({ title: "🔄 Reset", description: `Bàn #${table.table_number} đã trống` });
      onRefresh();
      onClose();
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = menuItems.filter((m) => m.category_id === selectedCategory);

  return (
    <>
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">Bàn #{table.table_number}</span>
            <Badge variant={order ? "destructive" : "secondary"}>
              {order ? "Đang dùng" : "Trống"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row overflow-hidden" style={{ height: "calc(90vh - 80px)" }}>
          {/* Menu Section */}
          <div className="flex-1 min-w-0 flex flex-col border-r">
            {/* Category tabs */}
            <div className="flex gap-1 p-2 overflow-x-auto border-b flex-shrink-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Menu items */}
            <ScrollArea className="flex-1 p-2">
              <div className="grid grid-cols-1 gap-1.5">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item.id)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group"
                  >
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{formatVND(item.price)}</div>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Cart Section */}
          <div className="w-full md:w-80 md:min-w-[320px] flex flex-col bg-muted/30 flex-shrink-0">
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShoppingCart className="h-4 w-4" />
                Đơn hàng
              </div>
            </div>

            <ScrollArea className="flex-1 p-2">
              {/* Existing items */}
              {orderItems.map((item) => (
                <div key={item.id} className="flex justify-between py-1.5 text-xs">
                  <span>{(item as any).menu_items?.name} x{item.quantity}</span>
                  <span className="font-medium">{formatVND(item.subtotal)}</span>
                </div>
              ))}
              
              {orderItems.length > 0 && cartItems.length > 0 && (
                <Separator className="my-2" />
              )}

              {/* New items in cart */}
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1.5">
                  <div className="text-xs flex-1">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground ml-1">{formatVND(item.price)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => removeFromCart(item.id)} className="h-5 w-5 rounded bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                    <button onClick={() => addToCart(item.id)} className="h-5 w-5 rounded bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </ScrollArea>

            {/* Totals and actions */}
            <div className="border-t p-3 space-y-2">
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
                  <Button onClick={handleSubmitOrder} disabled={isSubmitting} className="w-full font-bold" size="sm">
                    <Plus className="h-3 w-3 mr-1" />
                    {order ? "Thêm món" : "Tạo order"}
                  </Button>
                )}
                {order && order.status === "open" && (
                  <Button onClick={handleMarkPaid} disabled={isSubmitting} variant="secondary" className="w-full font-bold" size="sm">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Thanh toán
                  </Button>
                )}
                {order && orderItems.length > 0 && (
                  <Button onClick={() => setShowInvoice(true)} variant="outline" className="w-full font-bold" size="sm">
                    <FileText className="h-3 w-3 mr-1" />
                    In hoá đơn
                  </Button>
                )}
                {table.status === "paid" && (
                  <Button onClick={handleResetTable} disabled={isSubmitting} variant="outline" className="w-full font-bold" size="sm">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset bàn
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
    </>
  );
}
