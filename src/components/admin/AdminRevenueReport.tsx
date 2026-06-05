import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatVND } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from "date-fns";

export default function AdminRevenueReport() {
  const [orders, setOrders] = useState<any[]>([]);
  const [period, setPeriod] = useState("day");

  useEffect(() => {
    const fetchOrders = async () => {
      const now = new Date();
      // Lấy khoảng thời gian rộng để bao trùm cả kỳ hiện tại và kỳ trước
      let fromDate: Date;
      if (period === "day") fromDate = startOfDay(subDays(now, 2));
      else if (period === "month") fromDate = startOfMonth(subMonths(now, 1));
      else fromDate = startOfYear(subYears(now, 1));

      // Phân trang để tránh giới hạn 1000 dòng mặc định của PostgREST
      const pageSize = 1000;
      let allRows: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("orders")
          .select("*, order_items(quantity, unit_price, subtotal, menu_item_id, menu_items(name))")
          .eq("status", "paid")
          .eq("is_deleted", false)
          .gte("updated_at", fromDate.toISOString())
          .order("updated_at", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error || !data) break;
        allRows = allRows.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      setOrders(allRows);
    };
    fetchOrders();
  }, [period]);

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
    // Dùng thời điểm thanh toán (updated_at) cho đơn 'paid' để doanh thu khớp ngày thực tế thu tiền
    const getOrderDate = (o: any) => new Date(o.updated_at || o.created_at);
    const currentOrders = orders.filter((o) => {
      const d = getOrderDate(o);
      return d >= range.current.start && d <= range.current.end;
    });
    const prevOrders = orders.filter((o) => {
      const d = getOrderDate(o);
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
    const getOrderDate = (o: any) => new Date(o.updated_at || o.created_at);
    if (period === "day") {
      const hours = Array.from({ length: 24 }, (_, i) => i);
      return hours.map((h) => {
        const hourOrders = orders.filter((o) => {
          const d = getOrderDate(o);
          return d >= startOfDay(now) && d <= endOfDay(now) && d.getHours() === h;
        });
        return { name: `${h}h`, revenue: hourOrders.reduce((s, o) => s + o.total_amount, 0), orders: hourOrders.length };
      });
    }
    if (period === "month") {
      const days = Array.from({ length: 31 }, (_, i) => i + 1);
      return days.map((d) => {
        const dayOrders = orders.filter((o) => {
          const date = getOrderDate(o);
          return date >= startOfMonth(now) && date <= endOfMonth(now) && date.getDate() === d;
        });
        return { name: `${d}`, revenue: dayOrders.reduce((s, o) => s + o.total_amount, 0), orders: dayOrders.length };
      });
    }
    const months = Array.from({ length: 12 }, (_, i) => i);
    return months.map((m) => {
      const monthOrders = orders.filter((o) => {
        const date = getOrderDate(o);
        return date >= startOfYear(now) && date <= endOfYear(now) && date.getMonth() === m;
      });
      return { name: `T${m + 1}`, revenue: monthOrders.reduce((s, o) => s + o.total_amount, 0), orders: monthOrders.length };
    });
  }, [orders, period]);

  const itemsBreakdown = useMemo(() => {
    const getOrderDate = (o: any) => new Date(o.updated_at || o.created_at);
    const inRange = orders.filter((o) => {
      const d = getOrderDate(o);
      return d >= stats.current.start && d <= stats.current.end;
    });
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    inRange.forEach((o) => {
      (o.order_items || []).forEach((it: any) => {
        const key = it.menu_item_id;
        const name = it.menu_items?.name || "Không rõ";
        const cur = map.get(key) || { name, quantity: 0, revenue: 0 };
        cur.quantity += it.quantity || 0;
        cur.revenue += it.subtotal || 0;
        map.set(key, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [orders, stats]);

  // Doanh thu chi tiết theo từng tháng (cho tab "Theo năm")
  const monthlyBreakdown = useMemo(() => {
    const now = new Date();
    const getOrderDate = (o: any) => new Date(o.updated_at || o.created_at);
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);
    const months = Array.from({ length: 12 }, (_, i) => i);
    return months.map((m) => {
      const monthOrders = orders.filter((o) => {
        const d = getOrderDate(o);
        return d >= yearStart && d <= yearEnd && d.getMonth() === m;
      });
      const revenue = monthOrders.reduce((s, o) => s + o.total_amount, 0);
      const itemsMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      monthOrders.forEach((o) => {
        (o.order_items || []).forEach((it: any) => {
          const key = it.menu_item_id;
          const name = it.menu_items?.name || "Không rõ";
          const cur = itemsMap.get(key) || { name, quantity: 0, revenue: 0 };
          cur.quantity += it.quantity || 0;
          cur.revenue += it.subtotal || 0;
          itemsMap.set(key, cur);
        });
      });
      const items = Array.from(itemsMap.values()).sort((a, b) => b.quantity - a.quantity);
      return {
        month: m + 1,
        label: `Tháng ${m + 1}/${now.getFullYear()}`,
        revenue,
        count: monthOrders.length,
        items,
      };
    });
  }, [orders]);

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
            <div className="text-xl font-bold">{stats.currentCount} <span className="text-xs text-muted-foreground font-normal block sm:inline">({stats.prevCount} trước)</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Biểu đồ doanh thu</CardTitle></CardHeader>
        <CardContent className="px-2 sm:px-6">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={10} />
              <YAxis fontSize={10} tickFormatter={(v) => `${Math.round(v / 1000)}K`} width={40} />
              <Tooltip formatter={(value: number) => formatVND(value)} />
              <Bar dataKey="revenue" fill="hsl(345, 80%, 25%)" radius={[4, 4, 0, 0]} name="Doanh thu" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Danh sách thức uống đã order */}
      {period !== "year" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Thức uống đã order ({stats.label.toLowerCase()})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {itemsBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Chưa có đơn nào trong kỳ này.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-2">Tên món</th>
                      <th className="py-2 px-2 text-right">SL</th>
                      <th className="py-2 pl-2 text-right">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsBreakdown.map((it, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-2 font-medium">{it.name}</td>
                        <td className="py-2 px-2 text-right">{it.quantity}</td>
                        <td className="py-2 pl-2 text-right">{formatVND(it.revenue)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td className="py-2 pr-2">Tổng</td>
                      <td className="py-2 px-2 text-right">
                        {itemsBreakdown.reduce((s, i) => s + i.quantity, 0)}
                      </td>
                      <td className="py-2 pl-2 text-right">
                        {formatVND(itemsBreakdown.reduce((s, i) => s + i.revenue, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Doanh thu chi tiết theo từng tháng (chỉ hiện ở tab "Theo năm") */}
      {period === "year" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doanh thu chi tiết theo từng tháng</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <Accordion type="multiple" className="w-full">
              {monthlyBreakdown.map((mb) => (
                <AccordionItem key={mb.month} value={`m-${mb.month}`}>
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="flex flex-1 items-center justify-between pr-2 gap-2">
                      <span className="font-medium text-left">{mb.label}</span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{mb.count} đơn</span>
                        <span className="font-semibold">{formatVND(mb.revenue)}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {mb.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Chưa có đơn nào trong tháng này.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-muted-foreground">
                              <th className="py-2 pr-2">Tên món</th>
                              <th className="py-2 px-2 text-right">SL</th>
                              <th className="py-2 pl-2 text-right">Doanh thu</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mb.items.map((it, i) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-2 pr-2 font-medium">{it.name}</td>
                                <td className="py-2 px-2 text-right">{it.quantity}</td>
                                <td className="py-2 pl-2 text-right">{formatVND(it.revenue)}</td>
                              </tr>
                            ))}
                            <tr className="font-semibold">
                              <td className="py-2 pr-2">Tổng</td>
                              <td className="py-2 px-2 text-right">
                                {mb.items.reduce((s, i) => s + i.quantity, 0)}
                              </td>
                              <td className="py-2 pl-2 text-right">{formatVND(mb.revenue)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
