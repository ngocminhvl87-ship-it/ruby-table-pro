import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatVND } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from "date-fns";

export default function AdminRevenueReport() {
  const [orders, setOrders] = useState<any[]>([]);
  const [period, setPeriod] = useState("day");

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "paid")
        .order("created_at", { ascending: true });
      if (data) setOrders(data);
    };
    fetchOrders();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();

    const getRange = (p: string) => {
      switch (p) {
        case "day":
          return {
            current: { start: startOfDay(now), end: endOfDay(now) },
            prev: { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) },
            label: "Hôm nay",
            prevLabel: "Hôm qua",
          };
        case "month":
          return {
            current: { start: startOfMonth(now), end: endOfMonth(now) },
            prev: { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) },
            label: "Tháng này",
            prevLabel: "Tháng trước",
          };
        case "year":
          return {
            current: { start: startOfYear(now), end: endOfYear(now) },
            prev: { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) },
            label: "Năm nay",
            prevLabel: "Năm trước",
          };
        default:
          return {
            current: { start: startOfDay(now), end: endOfDay(now) },
            prev: { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) },
            label: "Hôm nay",
            prevLabel: "Hôm qua",
          };
      }
    };

    const range = getRange(period);
    const currentOrders = orders.filter((o) => {
      const d = new Date(o.created_at);
      return d >= range.current.start && d <= range.current.end;
    });
    const prevOrders = orders.filter((o) => {
      const d = new Date(o.created_at);
      return d >= range.prev.start && d <= range.prev.end;
    });

    const currentRevenue = currentOrders.reduce((s, o) => s + o.total_amount, 0);
    const prevRevenue = prevOrders.reduce((s, o) => s + o.total_amount, 0);
    const change = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return {
      currentRevenue,
      prevRevenue,
      currentCount: currentOrders.length,
      prevCount: prevOrders.length,
      change,
      ...range,
    };
  }, [orders, period]);

  const chartData = useMemo(() => {
    const now = new Date();
    if (period === "day") {
      const hours = Array.from({ length: 24 }, (_, i) => i);
      return hours.map((h) => {
        const hourOrders = orders.filter((o) => {
          const d = new Date(o.created_at);
          return d >= startOfDay(now) && d <= endOfDay(now) && d.getHours() === h;
        });
        return { name: `${h}h`, revenue: hourOrders.reduce((s, o) => s + o.total_amount, 0), orders: hourOrders.length };
      });
    }
    if (period === "month") {
      const days = Array.from({ length: 31 }, (_, i) => i + 1);
      return days.map((d) => {
        const dayOrders = orders.filter((o) => {
          const date = new Date(o.created_at);
          return date >= startOfMonth(now) && date <= endOfMonth(now) && date.getDate() === d;
        });
        return { name: `${d}`, revenue: dayOrders.reduce((s, o) => s + o.total_amount, 0), orders: dayOrders.length };
      });
    }
    const months = Array.from({ length: 12 }, (_, i) => i);
    return months.map((m) => {
      const monthOrders = orders.filter((o) => {
        const date = new Date(o.created_at);
        return date >= startOfYear(now) && date <= endOfYear(now) && date.getMonth() === m;
      });
      return { name: `T${m + 1}`, revenue: monthOrders.reduce((s, o) => s + o.total_amount, 0), orders: monthOrders.length };
    });
  }, [orders, period]);

  return (
    <div className="space-y-4">
      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList>
          <TabsTrigger value="day">Theo ngày</TabsTrigger>
          <TabsTrigger value="month">Theo tháng</TabsTrigger>
          <TabsTrigger value="year">Theo năm</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" /> {stats.label}
            </div>
            <div className="text-xl font-bold">{formatVND(stats.currentRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" /> {stats.prevLabel}
            </div>
            <div className="text-xl font-bold">{formatVND(stats.prevRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              {stats.change >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              So sánh
            </div>
            <div className={`text-xl font-bold ${stats.change >= 0 ? "text-green-600" : "text-destructive"}`}>
              {stats.change >= 0 ? "+" : ""}{stats.change.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ShoppingCart className="h-4 w-4" /> Đơn hàng
            </div>
            <div className="text-xl font-bold">{stats.currentCount} <span className="text-sm text-muted-foreground font-normal">({stats.prevCount} trước)</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Biểu đồ doanh thu</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
              <Tooltip formatter={(value: number) => formatVND(value)} />
              <Bar dataKey="revenue" fill="hsl(345, 80%, 25%)" radius={[4, 4, 0, 0]} name="Doanh thu" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
