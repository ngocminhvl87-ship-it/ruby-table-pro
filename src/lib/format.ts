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
