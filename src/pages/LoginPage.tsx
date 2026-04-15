import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Coffee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Map username-style logins to emails
    let loginEmail = email;
    if (!email.includes("@")) {
      if (email.toLowerCase() === "admincoffeeruby") loginEmail = "admin@coffeeruby.com";
      else if (email.toLowerCase() === "nhanvien01") loginEmail = "staff01@coffeeruby.com";
      else loginEmail = email + "@coffeeruby.com";
    }

    const { error } = await signIn(loginEmail, password);
    if (error) {
      toast({ title: "Đăng nhập thất bại", description: error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md shadow-card animate-scale-in border-0">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Coffee className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl tracking-tight">Coffee Ruby</CardTitle>
          <p className="text-muted-foreground text-sm">Hệ thống quản lý bán hàng</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Tên đăng nhập</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Admincoffeeruby"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(c) => setRemember(!!c)}
              />
              <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                Duy trì đăng nhập
              </Label>
            </div>
            <Button type="submit" className="w-full h-11 text-base font-bold" disabled={isLoading}>
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
