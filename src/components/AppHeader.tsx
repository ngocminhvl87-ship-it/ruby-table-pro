import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Coffee, Bell } from "lucide-react";

export default function AppHeader() {
  const { signOut, profile, role } = useAuth();

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
          <Button variant="ghost" size="icon" onClick={signOut} title="Đăng xuất" className="h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
