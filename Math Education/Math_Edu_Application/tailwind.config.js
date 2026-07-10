/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette produit : moderne, encourageante, apaisante (cf. CLAUDE.md).
        // A affiner avec les maquettes Claude Design.
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          500: '#4f6ef7',
          600: '#3b57e0',
          700: '#2f45b8',
        },
      },
    },
  },
  plugins: [],
}
