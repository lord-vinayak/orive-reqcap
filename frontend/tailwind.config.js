/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Strict brand palette: white, black, mustard
        mustard: {
          DEFAULT: '#D4A017',
          50:  '#FBF5E2',
          100: '#F6EAC0',
          200: '#EDD583',
          300: '#E4C046',
          400: '#D4A017',
          500: '#B68813',
          600: '#88660E',
          700: '#5B4309',
          800: '#2D2105',
        },
      },
      fontFamily: {
        // Aptos primary, with system fallbacks
        sans: ['Aptos', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
}
