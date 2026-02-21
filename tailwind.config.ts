import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#121212",
        cream: {
          DEFAULT: "#fff8e6",
          78: "rgba(255,248,230,0.78)",
          61: "rgba(255,248,230,0.61)",
          31: "rgba(255,248,230,0.31)",
          20: "rgba(255,248,230,0.20)",
        },
        accent: "#eda4e8",
        lime: "#ddf073",
        brown: "#211305",
        pink: "#eda4e8",
        surface: "#1a1a1a",
        border: "#2a2a2a",
      },
      fontFamily: {
        display: ["var(--font-montserrat)", "system-ui", "sans-serif"],
        body: ["var(--font-satoshi)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        brand: "24px",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 8px 0 rgba(237,164,232,0.3)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(237,164,232,0.5)" },
        },
        "pulse-glow-lime": {
          "0%, 100%": { boxShadow: "0 0 8px 0 rgba(221,240,115,0.3)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(221,240,115,0.5)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "breathe": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.05)", opacity: "0.9" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "pulse-glow-lime": "pulse-glow-lime 2s ease-in-out infinite",
        "shimmer": "shimmer 3s ease-in-out infinite",
        "breathe": "breathe 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
