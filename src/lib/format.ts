export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + "đ";
}

export function formatVNDShort(amount: number): string {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1) + "M";
  }
  if (amount >= 1000) {
    return Math.round(amount / 1000) + "K";
  }
  return Math.round(amount).toString();
}

// Tên hiển thị của bàn. Bàn #21 hiển thị là "TO GO".
export function formatTableName(tableNumber: number): string {
  if (tableNumber === 21) return "TO GO";
  return `#${tableNumber}`;
}

export function formatTableLabel(tableNumber: number): string {
  if (tableNumber === 21) return "TO GO";
  return `Bàn #${tableNumber}`;
}
