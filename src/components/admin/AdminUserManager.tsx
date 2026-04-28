import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Key } from "lucide-react";

export default function AdminUserManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", full_name: "" });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "list-users" },
    });
    if (data?.users) setUsers(data.users);
  };

  useEffect(() => { fetchUsers(); }, []);

  const createStaff = async () => {
    if (!newUser.username || !newUser.password) return;
    setIsLoading(true);
    const email = newUser.email || newUser.username.toLowerCase().replace(/\s/g, "") + "@coffeeruby.com";
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "create-staff", email, password: newUser.password, username: newUser.username, full_name: newUser.full_name },
    });
    if (data?.error) toast({ title: "Lỗi", description: data.error, variant: "destructive" });
    else {
      toast({ title: "✅ Đã tạo nhân viên" });
      setNewUser({ username: "", email: "", password: "", full_name: "" });
      setShowAddUser(false);
      fetchUsers();
    }
    setIsLoading(false);
  };

  const deleteUser = async (userId: string) => {
    const { data } = await supabase.functions.invoke("manage-users", {
      body: { action: "delete-user", user_id: userId },
    });
    if (data?.error) toast({ title: "Lỗi", description: data.error, variant: "destructive" });
    else { toast({ title: "✅ Đã xoá" }); fetchUsers(); }
  };

  const changePassword = async (userId: string) => {
    const newPw = prompt("Nhập mật khẩu mới:");
    if (!newPw) return;
    const { data } = await supabase.functions.invoke("manage-users", {
      body: { action: "update-password", user_id: userId, password: newPw },
    });
    if (data?.error) toast({ title: "Lỗi", description: data.error, variant: "destructive" });
    else toast({ title: "✅ Đã đổi mật khẩu" });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Quản lý nhân viên</CardTitle>
        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Thêm NV</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tạo tài khoản nhân viên</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Tên đăng nhập</Label><Input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} /></div>
              <div><Label>Họ tên</Label><Input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} /></div>
              <div><Label>Email (tuỳ chọn)</Label><Input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></div>
              <div><Label>Mật khẩu</Label><Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /></div>
              <Button onClick={createStaff} disabled={isLoading} className="w-full">Tạo nhân viên</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead className="hidden sm:table-cell">Họ tên</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell className="hidden sm:table-cell">{u.full_name || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role === "admin" ? "Admin" : "Staff"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => changePassword(u.id)} title="Đổi mật khẩu">
                      <Key className="h-3.5 w-3.5" />
                    </Button>
                    {u.role !== "admin" && (
                      <Button variant="ghost" size="icon" onClick={() => deleteUser(u.id)} title="Xoá" className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
