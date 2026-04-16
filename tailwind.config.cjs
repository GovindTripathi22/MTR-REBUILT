/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        text: '#111111',
        // Your new warm golden-orange/yellowish button color
        "brand-btn": '#d97706', // Premium Amber/Orange
        "brand-btn-hover": '#b45309', // Slightly darker for the hover effect
      },
      fontFamily: {
        sans: ['"Inter"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        widest: '.2em',
      }
    },
  },
  plugins: [],
};
