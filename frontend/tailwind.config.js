/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ledger: {
          black: "#0f0f0f",
          dark: "#1a1a2e",
          accent: "#ff6b35",
          mint: "#00d4aa",
          gray: "#2d2d3d",
          "gray-light": "#3d3d4d",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};