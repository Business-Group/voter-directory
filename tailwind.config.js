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
          primary: '#0033a0',
          dark: '#001f5b',
          sky: '#0ea5e9',
          skyLight: '#e0f2fe',
          gold: '#d4af37',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        heading: ['"Fira Sans"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}