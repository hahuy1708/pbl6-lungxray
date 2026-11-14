/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        medical: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
        risk: {
          normal: '#22c55e',      // 1. Phổi khỏe mạnh (Xanh lá)
          common: '#eab308',      // 2. Bệnh lý thông thường (Vàng)
          precancer: '#f97316',   // 3. Bệnh tiền ung thư (Cam)
          cancer: '#ef4444',      // 4. Ung thư phổi (Đỏ)
        }
      }
    },
  },
  plugins: [],
}
