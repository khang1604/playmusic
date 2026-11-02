/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        stage: {
          bg: "#0d0e12",
          surface: "#161822",
          card: "#1e2130",
          border: "#2b2f44",
          accent: "#3b82f6"
        }
      }
    }
  },
  plugins: []
};
