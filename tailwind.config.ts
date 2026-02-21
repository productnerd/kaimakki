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
        accent: "#ff4824",
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
    },
  },
  plugins: [],
};
export default config;
