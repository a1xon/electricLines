/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app.vue",
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral deep darks
        brand: {
          black: '#09090b', // Zinc 950
          card: '#18181b',  // Zinc 900
          border: '#27272a', // Zinc 800
          hover: '#3f3f46',  // Zinc 700
          accent: '#3b82f6', // More neutral blue
        },
        voltage: {
          '3.3': '#f1c40f',
          '5': '#3498db',
          '12': '#2ecc71',
          '24': '#9b59b6',
        },
      },
    },
  },
  plugins: [],
}
