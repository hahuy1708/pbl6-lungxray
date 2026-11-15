// Che số CCCD khi hiển thị trong danh sách: chỉ giữ 4 số cuối.
// Dữ liệu gốc không đổi; hàm này chỉ dùng cho hiển thị.
export const maskCard = (v?: string | null): string => (v ? `•••• ${v.slice(-4)}` : '—');
