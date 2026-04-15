import { useState, lazy, Suspense } from "react";
import AppHeader from "@/components/AppHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, UtensilsCrossed, Users, Receipt, BarChart3 } from "lucide-react";

const AdminTableManager = lazy(() => import("@/components/admin/AdminTableManager"));
const AdminMenuManager = lazy(() => import("@/components/admin/AdminMenuManager"));
const AdminUserManager = lazy(() => import("@/components/admin/AdminUserManager"));
const AdminOrderManager = lazy(() => import("@/components/admin/AdminOrderManager"));
const AdminRevenueReport = lazy(() => import("@/components/admin/AdminRevenueReport"));

const TabLoading = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-pulse text-muted-foreground text-sm">Đang tải...</div>
  </div>
);

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("tables");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto mb-4">
            <TabsTrigger value="tables" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" /> Bàn</TabsTrigger>
            <TabsTrigger value="menu" className="gap-1.5"><UtensilsCrossed className="h-3.5 w-3.5" /> Menu</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Nhân viên</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5"><Receipt className="h-3.5 w-3.5" /> Hoá đơn</TabsTrigger>
            <TabsTrigger value="revenue" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Doanh thu</TabsTrigger>
          </TabsList>
          <Suspense fallback={<TabLoading />}>
            <TabsContent value="tables"><AdminTableManager /></TabsContent>
            <TabsContent value="menu"><AdminMenuManager /></TabsContent>
            <TabsContent value="users"><AdminUserManager /></TabsContent>
            <TabsContent value="orders"><AdminOrderManager /></TabsContent>
            <TabsContent value="revenue"><AdminRevenueReport /></TabsContent>
          </Suspense>
        </Tabs>
      </main>
    </div>
  );
}
