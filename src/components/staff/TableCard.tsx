import { memo } from "react";
import { formatVND, formatTableName } from "@/lib/format";

interface TableCardProps {
  table: { id: string; table_number: number; status: string };
  order?: { id: string; total_amount: number; status: string } | undefined;
  onClick: () => void;
}

function TableCardBase({ table, order, onClick }: TableCardProps) {
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
      className={`${cardClass} rounded-xl p-3 sm:p-4 text-left transition-all duration-200 hover:scale-[1.03] hover:shadow-card-hover active:scale-95 animate-fade-in min-h-[96px] touch-manipulation`}
    >
      <div className="text-2xl sm:text-3xl font-bold mb-1 leading-none">{formatTableName(table.table_number)}</div>
      <div className="text-xs sm:text-sm opacity-90 font-medium">{statusLabel}</div>
      {order && (
        <div className="mt-1 sm:mt-2 text-xs sm:text-sm font-bold opacity-95 truncate">
          {formatVND(order.total_amount)}
        </div>
      )}
    </button>
  );
}

export default memo(TableCardBase, (prev, next) =>
  prev.table.id === next.table.id &&
  prev.table.status === next.table.status &&
  prev.table.table_number === next.table.table_number &&
  prev.order?.id === next.order?.id &&
  prev.order?.total_amount === next.order?.total_amount &&
  prev.order?.status === next.order?.status
);
