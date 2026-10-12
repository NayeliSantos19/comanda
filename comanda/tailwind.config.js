/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "Inter", "sans-serif"],
        hero: ["'Plus Jakarta Sans'", "Inter", "sans-serif"],
      },
      colors: {
        ink: "#1E1D24",
        paper: "#F7F4EE",
        muted: "#7C7A86",
        line: "#E7E1D6",
        accent: "#24564A",
        accentLight: "#E1EEE9",
        coral: "#D9603F",
        coralLight: "#FBE8E1",
        mint: "#2F7D5B",
        mintLight: "#E2F1EA",
        sun: "#C98A1C",
        sunLight: "#FBF0DA",
        forest: "#173D32",
        terra: "#C4542C",
        peach: "#FCE7DA",
        rose: "#D2484F",
        roseLight: "#FBE3E3",
        night: "#14141A",
        nightCard: "#1F1F28",
      },
    },
  },
  plugins: [],
};
