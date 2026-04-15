import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Coffee, Bell } from "lucide-react";

export default function AppHeader() {
  const { signOut, profile, role } = useAuth();

  return (
    <header className="sticky top-0 z-50 glass-effect border-b">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Coffee className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">Coffee Ruby</span>
          <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground uppercase">
            {role}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {profile?.full_name || profile?.username}
          </span>
          <Button variant="ghost" size="icon" className="relative" title="Thông báo">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} title="Đăng xuất">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
