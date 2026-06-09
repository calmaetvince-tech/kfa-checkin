import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // KFA / Kallistis Fight Academy — gold on black
        brand: {
          DEFAULT: "#d4a017", // gold
          dark: "#a37610",    // darker gold for hover
          ink: "#0a0a0a",     // near-black background
        },
      },
    },
  },
  plugins: [],
};

export default config;
