import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Coffee, Bell, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const ADMIN_CRED = { email: "admin@coffeeruby.com", password: "Gialoank8@26" };
const STAFF_CRED = { email: "staff01@coffeeruby.com", password: "Rubystaff1@26" };

export default function AppHeader() {
  const { signOut, profile, role } = useAuth();
  const { toast } = useToast();
  const [switching, setSwitching] = useState(false);

  const handleQuickSwitch = async () => {
    if (switching) return;
    setSwitching(true);
    const target = role === "admin" ? STAFF_CRED : ADMIN_CRED;
    const targetLabel = role === "admin" ? "Nhân viên" : "Admin";
    try {
      // Tear down all realtime channels so they re-subscribe with the new JWT
      await supabase.removeAllChannels();
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword(target);
      if (error) {
        toast({ title: "Chuyển tài khoản thất bại", description: error.message, variant: "destructive" });
      } else {
        // Ensure realtime socket picks up the new auth token
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          supabase.realtime.setAuth(session.access_token);
        }
        toast({ title: "✅ Đã chuyển", description: `Đăng nhập thành ${targetLabel}` });
      }
    } catch (e: any) {
      toast({ title: "Lỗi", description: e?.message || "Không thể chuyển tài khoản", variant: "destructive" });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-effect border-b">
      <div className="container flex h-14 items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary flex-shrink-0">
            <Coffee className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base sm:text-lg truncate">Coffee Ruby</span>
          <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] sm:text-xs font-bold text-secondary-foreground uppercase flex-shrink-0">
            {role}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <span className="text-sm text-muted-foreground hidden md:inline truncate max-w-[140px]">
            {profile?.full_name || profile?.username}
          </span>
          <Button variant="ghost" size="icon" className="relative h-9 w-9" title="Thông báo">
            <Bell className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={handleQuickSwitch}
            disabled={switching}
            title={`Chuyển nhanh sang ${role === "admin" ? "Nhân viên" : "Admin"}`}
            className="h-9 w-9 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Repeat className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} title="Đăng xuất" className="h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
