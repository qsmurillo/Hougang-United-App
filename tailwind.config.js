/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: { club: { orange: '#FF6B00', navy: '#1E3A8A', ink: '#172033' } },
      boxShadow: { card: '0 8px 30px rgba(30, 58, 138, .06)' },
    },
  },
  plugins: [],
}
