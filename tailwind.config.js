/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F4F4EE",
        surface: "#FAFAF6",
        "surface-raised": "#FFFFFF",
        ink: "#171A17",
        "ink-secondary": "#525852",
        line: "rgba(23, 26, 23, 0.12)",
        protect: "#1F6B4F",
        "protect-soft": "#DDEBE4",
        measure: "#F4C95D",
        "measure-strong": "#E5B63F",
        danger: "#C84D42",
        "danger-soft": "#F6DFDC",
        "camera-chrome": "rgba(12, 14, 13, 0.84)",
        "camera-text": "#F7F8F4",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
