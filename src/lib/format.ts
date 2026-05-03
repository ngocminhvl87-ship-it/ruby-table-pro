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

// Bàn mang đi (TO GO) - hiện được lưu ở số 22, luôn nằm cuối danh sách.
export const TAKEAWAY_TABLE_NUMBER = 22;
export const TAKEAWAY_LABEL = "MANG ĐI";

export function isTakeawayTable(tableNumber: number): boolean {
  return tableNumber === TAKEAWAY_TABLE_NUMBER;
}

export function formatTableName(tableNumber: number): string {
  if (isTakeawayTable(tableNumber)) return TAKEAWAY_LABEL;
  return `#${tableNumber}`;
}

export function formatTableLabel(tableNumber: number): string {
  if (isTakeawayTable(tableNumber)) return TAKEAWAY_LABEL;
  return `Bàn #${tableNumber}`;
}
