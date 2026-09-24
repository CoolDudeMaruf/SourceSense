/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eef9f4",
          100: "#d5f1e4",
          200: "#aee3cb",
          300: "#7acdb0",
          400: "#4ab090",
          500: "#2e9474",
          600: "#22775d",
          700: "#1d604b",
          800: "#1a4d3d",
          900: "#173f33",
        },
        aqi: {
          good:        "#00B050",
          satisfactory:"#92D050",
          moderate:    "#FFFF00",
          poor:        "#FF7C00",
          verypoor:    "#FF0000",
          severe:      "#7030A0",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":    "fadeIn 0.4s ease-out",
        "slide-up":   "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        slideUp: { "0%": { opacity: 0, transform: "translateY(12px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
}
