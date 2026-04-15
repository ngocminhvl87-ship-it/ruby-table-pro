import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import TableCard from "@/components/staff/TableCard";
import OrderModal from "@/components/staff/OrderModal";
import { useToast } from "@/hooks/use-toast";

interface Table {
  id: string;
  table_number: number;
  status: string;
}

interface Order {
  id: string;
  table_id: string;
  status: string;
  total_amount: number;
  created_at: string;
}

export default function StaffPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const [{ data: tablesData }, { data: ordersData }] = await Promise.all([
      supabase.from("tables").select("*").order("table_number"),
      supabase.from("orders").select("*").eq("status", "open"),
    ]);
    if (tablesData) setTables(tablesData);
    if (ordersData) setOrders(ordersData);
  }, []);

  useEffect(() => {
    fetchData();

    // Realtime subscriptions
    const tablesChannel = supabase.channel("tables-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () => fetchData())
      .subscribe();

    const ordersChannel = supabase.channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        fetchData();
        if (payload.eventType === "INSERT") {
          toast({ title: "🔔 Order mới", description: `Order mới được tạo!` });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tablesChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [fetchData, toast]);

  const getTableOrder = (tableId: string) => orders.find((o) => o.table_id === tableId);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-4">
        <h1 className="text-2xl font-bold mb-4">Quản lý bàn</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              order={getTableOrder(table.id)}
              onClick={() => setSelectedTable(table)}
            />
          ))}
        </div>
      </main>
      {selectedTable && (
        <OrderModal
          table={selectedTable}
          order={getTableOrder(selectedTable.id)}
          onClose={() => setSelectedTable(null)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
