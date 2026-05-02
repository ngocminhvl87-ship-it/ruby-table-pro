import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatVND, formatTableName, formatTableLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Clock, User, ShoppingCart } from "lucide-react";

interface TableOrder {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  profiles?: { username: string; full_name: string | null };
  order_items?: {
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    menu_items?: { name: string };
  }[];
}

export default function AdminTableManager() {
  const [tables, setTables] = useState<any[]>([]);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const { toast } = useToast();

  const fetchTables = useCallback(async () => {
    const { data } = await supabase.from("tables").select("*").order("table_number");
    if (data) setTables(data);
  }, []);

  useEffect(() => {
    fetchTables();

    const channel = supabase
      .channel("admin-tables-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tables" }, (payload) => {
        fetchTables();
        const newRow: any = payload.new;
        const oldRow: any = payload.old;
        if (newRow?.status && oldRow?.status && newRow.status !== oldRow.status) {
          const labelMap: Record<string, string> = { available: "Trống", occupied: "Đang dùng", paid: "Đã TT" };
          toast({
            title: `🔄 ${formatTableLabel(newRow.table_number)}`,
            description: `${labelMap[oldRow.status] || oldRow.status} → ${labelMap[newRow.status] || newRow.status}`,
          });
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        fetchTables();
        const row: any = payload.new;
        toast({ title: "🔔 Order mới", description: `Order vừa được tạo (${(row?.total_amount || 0).toLocaleString("vi-VN")}đ)` });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        fetchTables();
        const newRow: any = payload.new;
        const oldRow: any = payload.old;
        if (newRow?.status === "paid" && oldRow?.status !== "paid") {
          toast({ title: "💰 Thanh toán", description: `Order đã được thanh toán` });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTables, toast]);

  const addTable = async () => {
    const num = parseInt(newTableNumber);
    if (!num) return;
    const { error } = await supabase.from("tables").insert({ table_number: num });
    if (error) toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    else {
      toast({ title: "✅ Đã thêm bàn #" + num });
      setNewTableNumber("");
      fetchTables();
    }
  };

  const handleTableClick = useCallback(async (table: any) => {
    setSelectedTable(table);
    setLoadingOrders(true);
    const { data } = await supabase
      .from("orders")
      .select("*, profiles!orders_staff_id_fkey(username, full_name), order_items(*, menu_items(name))")
      .eq("table_id", table.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setTableOrders(data as any);
    setLoadingOrders(false);
  }, []);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")} ${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { open: "Đang mở", paid: "Đã TT", cancelled: "Đã huỷ", deleted: "Đã xoá" };
    return map[s] || s;
  };
  const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = { open: "default", paid: "secondary", cancelled: "destructive", deleted: "outline" };
    return map[s] || "outline";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Quản lý bàn ({tables.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              placeholder="Số bàn mới"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              type="number"
              className="w-full sm:w-40"
            />
            <Button onClick={addTable} size="sm" className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Thêm bàn</Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {tables.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTableClick(t)}
                className={`rounded-lg p-3 text-center font-bold text-sm cursor-pointer transition-transform hover:scale-105 active:scale-95 min-h-[68px] ${
                  t.status === "available" ? "table-card-available" :
                  t.status === "occupied" ? "table-card-occupied" : "table-card-paid"
                }`}
              >
                #{t.table_number}
                <div className="text-xs opacity-80 font-normal mt-0.5">
                  {t.status === "available" ? "Trống" : t.status === "occupied" ? "Đang dùng" : "Đã TT"}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedTable && (
        <Dialog open onOpenChange={() => setSelectedTable(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Bàn #{selectedTable.table_number}
                <Badge variant={selectedTable.status === "available" ? "secondary" : selectedTable.status === "occupied" ? "destructive" : "outline"}>
                  {selectedTable.status === "available" ? "Trống" : selectedTable.status === "occupied" ? "Đang dùng" : "Đã TT"}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            {loadingOrders ? (
              <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
            ) : tableOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Chưa có order nào cho bàn này</div>
            ) : (
              <div className="space-y-4">
                {tableOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={statusVariant(order.status)}>{statusLabel(order.status)}</Badge>
                      <span className="font-bold text-primary">{formatVND(order.total_amount)}</span>
                    </div>

                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        <span>NV: {order.profiles?.username || order.profiles?.full_name || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(order.created_at)}</span>
                      </div>
                    </div>

                    {order.order_items && order.order_items.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs font-medium">
                            <ShoppingCart className="h-3 w-3" />
                            Chi tiết ({order.order_items.length} món)
                          </div>
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex justify-between text-xs">
                              <span>{item.menu_items?.name} x{item.quantity}</span>
                              <span className="font-medium">{formatVND(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
