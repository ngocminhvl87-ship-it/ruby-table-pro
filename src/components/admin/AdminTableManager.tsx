import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

export default function AdminTableManager() {
  const [tables, setTables] = useState<any[]>([]);
  const [newTableNumber, setNewTableNumber] = useState("");
  const { toast } = useToast();

  const fetchTables = async () => {
    const { data } = await supabase.from("tables").select("*").order("table_number");
    if (data) setTables(data);
  };

  useEffect(() => { fetchTables(); }, []);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quản lý bàn ({tables.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Số bàn mới"
            value={newTableNumber}
            onChange={(e) => setNewTableNumber(e.target.value)}
            type="number"
            className="w-40"
          />
          <Button onClick={addTable} size="sm"><Plus className="h-4 w-4 mr-1" /> Thêm bàn</Button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {tables.map((t) => (
            <div key={t.id} className={`rounded-lg p-3 text-center font-bold text-sm ${
              t.status === "available" ? "table-card-available" :
              t.status === "occupied" ? "table-card-occupied" : "table-card-paid"
            }`}>
              #{t.table_number}
              <div className="text-xs opacity-80 font-normal mt-0.5">
                {t.status === "available" ? "Trống" : t.status === "occupied" ? "Đang dùng" : "Đã TT"}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
