import daisyui from "daisyui";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Enable class-based dark mode for manual toggling or system preference
  darkMode: 'class', 
  theme: {
    extend: {
      fontFamily: {
        // Now you can use font-heading or font-space
        heading: ['"Space Grotesk"', 'sans-serif'],
        // Now you can use font-body or font-dm
        body: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          primary: "#2563eb", // blue-600
          secondary: "#0f172a", // slate-900
          accent: "#38bdf8", // blue-400
        },
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          primary: "#3b82f6", // blue-500
          "base-100": "#020617", // your obsidian background
          "base-200": "#0f172a", // slate-900
        },
      },
    ],
  },
};