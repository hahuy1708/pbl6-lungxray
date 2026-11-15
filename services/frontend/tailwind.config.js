/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        // Vùng xem ảnh: gần đen, không ngả xanh
        ink: {
          950: "#0E1216",
          800: "#222A33",
          700: "#2F3A46",
          400: "#8A96A3",
          300: "#B4BDC7",
          100: "#E6EAEF",
        },
        // Khung giao diện: xám lạnh trung tính
        chrome: {
          50: "#F4F5F7",
          100: "#E9EBEE",
          200: "#D9DDE3",
          600: "#5B6573",
          900: "#1B2330",
        },
        // Màu nhấn duy nhất: teal
        accent: {
          500: "#1F7A8C",
          600: "#196573",
        },
        // Trạng thái: chỉ dùng cho kết quả, không trang trí
        flag: { 50: "#FDECEA", 500: "#B42318" },
        clear: { 50: "#EAF5EE", 500: "#2E7D4F" },
      },
    },
  },
  plugins: [],
};
