/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#c8aa6e',
          dark: '#785a28'
        },
        navy: {
          DEFAULT: '#091428',
          deep: '#010a13'
        }
      },
      fontFamily: {
        display: ["'Playfair Display'", 'serif'],
        sans: ["'Inter'", 'sans-serif']
      }
    }
  },
  plugins: []
}
