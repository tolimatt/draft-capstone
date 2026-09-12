/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F7FA",
        blue: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#0B75E7",
          700: "#045FC3",
          800: "#0753A6",
          900: "#10467F",
          950: "#0B2B50",
        },
        slate: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#64748B",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#020617",
        },
      },
      fontWeight: { black: "800" },
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
