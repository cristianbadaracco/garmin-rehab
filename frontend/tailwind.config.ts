/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0B0E14",
          card: "#12161F",
          hover: "#181D29",
        },
        border: {
          subtle: "#1E2433",
          light: "#2A3147",
        },
        accent: {
          DEFAULT: "#3ECF8E",
          dim: "#3ECF8E22",
        },
        warn: {
          DEFAULT: "#F5A524",
          dim: "#F5A52422",
        },
        danger: {
          DEFAULT: "#EF4444",
          dim: "#EF444422",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
