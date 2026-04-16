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
        text: '#121212',
        muted: '#757575',
        border: '#e5e5e5',
        // The requested slight color change for buttons (a deep burnt orange/taupe)
        "brand-btn": '#b45f06', 
        "brand-btn-hover": '#924c05',
      },
      fontFamily: {
        // Avory-style classic grotesque sans and elegant serif
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['"Playfair Display"', 'Times', 'serif'],
      }
    },
  },
  plugins: [],
};
