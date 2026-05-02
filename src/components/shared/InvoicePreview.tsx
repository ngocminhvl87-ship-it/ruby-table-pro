import { formatVND, formatTableName, formatTableLabel } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, X } from "lucide-react";

interface InvoiceItem {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface InvoicePreviewProps {
  open: boolean;
  onClose: () => void;
  tableNumber: number;
  staffName: string;
  createdAt: string;
  items: InvoiceItem[];
  totalAmount: number;
}

export default function InvoicePreview({
  open,
  onClose,
  tableNumber,
  staffName,
  createdAt,
  items,
  totalAmount,
}: InvoicePreviewProps) {
  const now = new Date();
  const createdDate = new Date(createdAt);
  const formatDate = (d: Date) =>
    `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} ${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;

  const handlePrint = () => {
    const printContent = document.getElementById("invoice-print-area");
    if (!printContent) return;
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(`
      <html><head><title>Hoá đơn - ${formatTableLabel(tableNumber)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; padding: 12px; font-size: 13px; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
        .mt-2 { margin-top: 8px; }
        .line { border-top: 1px dashed #999; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 12px; border-bottom: 1px solid #ccc; padding: 2px 0; }
        td { padding: 2px 0; font-size: 12px; }
        .r { text-align: right; }
        .total { font-size: 15px; font-weight: bold; }
        .total-amount { color: #8B1A1A; }
      </style></head><body>
      ${printContent.innerHTML}
      <script>window.onload=function(){window.print();window.close();}</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-center text-base">
            Xem trước hoá đơn
            <div className="text-xs text-muted-foreground font-normal mt-0.5">
              {formatTableLabel(tableNumber)} — {formatDate(createdDate)}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div id="invoice-print-area" className="px-6 py-4 space-y-2 text-sm font-mono">
          <div className="text-center space-y-0.5">
            <div className="text-lg font-bold">☕ Coffee Ruby</div>
            <div>Hoá đơn thanh toán</div>
            <div>Bàn: <span className="font-bold">#{tableNumber}</span></div>
            <div>Nhân viên: {staffName}</div>
            <div>Thời gian: {formatDate(createdDate)}</div>
          </div>

          <Separator className="my-2" />

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 font-bold">Món</th>
                <th className="text-center py-1 font-bold w-8">SL</th>
                <th className="text-right py-1 font-bold">Đơn giá</th>
                <th className="text-right py-1 font-bold">T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="py-0.5">{item.name}</td>
                  <td className="text-center py-0.5">{item.quantity}</td>
                  <td className="text-right py-0.5">{formatVND(item.unit_price)}</td>
                  <td className="text-right py-0.5">{formatVND(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Separator className="my-2" />

          <div className="flex justify-between font-bold text-base">
            <span>TỔNG CỘNG</span>
            <span className="text-primary">{formatVND(totalAmount)}</span>
          </div>

          <div className="text-center text-xs text-muted-foreground mt-3 space-y-0.5">
            <div>Cảm ơn quý khách!</div>
            <div>Hẹn gặp lại ☕</div>
          </div>
        </div>

        <div className="flex gap-2 p-4 pt-2 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Đóng
          </Button>
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> In hoá đơn
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
