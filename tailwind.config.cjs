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
        text: '#1e293b',
        // The exact orange and pink hover from the source code
        "brand-btn": '#f87c47', 
        "brand-btn-hover": '#DA138E',
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
