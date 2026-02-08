/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Power colors
        england: '#F9A8D4',
        france: '#60A5FA',
        germany: '#374151',
        italy: '#22C55E',
        austria: '#EF4444',
        russia: '#A855F7',
        turkey: '#F59E0B',
        // Map colors
        land: '#E8DCC4',
        sea: '#B8D4E8',
        neutral: '#D4C4A8',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
      },
    },
  },
  plugins: [],
};
