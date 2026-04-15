import { memo } from "react";
import { formatVND } from "@/lib/format";

interface TableCardProps {
  table: { id: string; table_number: number; status: string };
  order?: { id: string; total_amount: number; status: string } | undefined;
  onClick: () => void;
}

function TableCardComponent({ table, order, onClick }: TableCardProps) {
  const status = order ? (table.status === "paid" ? "paid" : "occupied") : "available";

  const statusLabel = {
    available: "Trống",
    occupied: "Đang dùng",
    paid: "Đã thanh toán",
  }[status];

  const cardClass = {
    available: "table-card-available",
    occupied: "table-card-occupied",
    paid: "table-card-paid",
  }[status];

  return (
    <button
      onClick={onClick}
      className={`${cardClass} rounded-xl p-4 text-left transition-all duration-200 hover:scale-105 hover:shadow-card-hover active:scale-95 animate-fade-in`}
    >
      <div className="text-3xl font-bold mb-1">#{table.table_number}</div>
      <div className="text-sm opacity-90 font-medium">{statusLabel}</div>
      {order && (
        <div className="mt-2 text-sm font-bold opacity-95">
          {formatVND(order.total_amount)}
        </div>
      )}
    </button>
  );
}

const TableCard = memo(TableCardComponent);
export default TableCard;
