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
          dark: '#0f172a',
          blue: '#1e3a8a',
          light: '#3b82f6',
          red: '#ef4444',
          green: '#22c55e',
          amber: '#f59e0b',
        }
      }
    },
  },
  plugins: [],
}
