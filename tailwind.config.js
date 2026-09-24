/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Kanit', 'sans-serif'],
      },
      colors: {
        ink: '#0C0C0C',
        mist: '#D7E2EA',
      },
    },
  },
  plugins: [],
}
