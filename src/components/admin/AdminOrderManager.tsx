import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatVND, formatTableName } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2, RotateCcw, Eye } from "lucide-react";
import InvoicePreview from "@/components/shared/InvoicePreview";

export default function AdminOrderManager() {
  const [orders, setOrders] = useState<any[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, tables(table_number), profiles!orders_staff_id_fkey(username)")
      .order("created_at", { ascending: false });
    if (data) setOrders(data);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const softDeleteOrder = useCallback(async (id: string) => {
    await supabase.from("orders").update({ is_deleted: true, status: "deleted" }).eq("id", id);
    toast({ title: "🗑️ Đã xoá (soft delete)" });
    fetchOrders();
  }, [fetchOrders, toast]);

  const restoreOrder = useCallback(async (id: string) => {
    await supabase.from("orders").update({ is_deleted: false, status: "open" }).eq("id", id);
    toast({ title: "✅ Đã khôi phục" });
    fetchOrders();
  }, [fetchOrders, toast]);

  const cancelOrder = useCallback(async (id: string) => {
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
    toast({ title: "❌ Đã huỷ order" });
    fetchOrders();
  }, [fetchOrders, toast]);

  const viewOrderDetails = useCallback(async (order: any) => {
    setSelectedOrder(order);
    const { data } = await supabase
      .from("order_items")
      .select("*, menu_items(name)")
      .eq("order_id", order.id);
    if (data) setOrderItems(data);
  }, []);

  const filteredOrders = useMemo(
    () => showDeleted ? orders : orders.filter((o) => !o.is_deleted),
    [orders, showDeleted]
  );

  const statusBadge = (status: string) => {
    const variants: Record<string, any> = {
      open: "default",
      paid: "secondary",
      cancelled: "destructive",
      deleted: "outline",
    };
    const labels: Record<string, string> = {
      open: "Đang mở",
      paid: "Đã TT",
      cancelled: "Đã huỷ",
      deleted: "Đã xoá",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Quản lý hoá đơn ({filteredOrders.length})</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setShowDeleted(!showDeleted)}>
          {showDeleted ? "Ẩn đã xoá" : "Hiện đã xoá"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bàn</TableHead>
                <TableHead>NV</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Tổng</TableHead>
                <TableHead className="hidden sm:table-cell">Thời gian</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((o) => (
                <TableRow key={o.id} className={o.is_deleted ? "opacity-50" : ""}>
                  <TableCell>#{o.tables?.table_number}</TableCell>
                  <TableCell className="max-w-[100px] truncate">{o.profiles?.username || "-"}</TableCell>
                  <TableCell>{statusBadge(o.status)}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{formatVND(o.total_amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                    {new Date(o.created_at).toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => viewOrderDetails(o)}><Eye className="h-3.5 w-3.5" /></Button>
                    {o.status === "open" && (
                      <Button variant="ghost" size="icon" onClick={() => cancelOrder(o.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    )}
                    {!o.is_deleted && o.status !== "open" && (
                      <Button variant="ghost" size="icon" onClick={() => softDeleteOrder(o.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    )}
                    {o.is_deleted && (
                      <Button variant="ghost" size="icon" onClick={() => restoreOrder(o.id)} className="text-accent"><RotateCcw className="h-3.5 w-3.5" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {selectedOrder && (
        <InvoicePreview
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          tableNumber={selectedOrder.tables?.table_number || 0}
          staffName={selectedOrder.profiles?.username || "N/A"}
          createdAt={selectedOrder.created_at}
          items={orderItems.map((item: any) => ({
            name: item.menu_items?.name || "—",
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
          }))}
          totalAmount={selectedOrder.total_amount}
        />
      )}
    </Card>
  );
}
