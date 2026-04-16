/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './about.html',
    './categories.html',
    './category.html',
    './contact.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Avory-inspired minimalist palette
        primary: "#111111", // Deep editorial black
        "primary-light": "#2a2a2a",
        surface: "#faf9f6", // Signature Avory off-white/ivory
        "surface-variant": "#f2efe9",
        "surface-dim": "#e8e4dc",
        accent: "#8c6b4a", // Muted luxury taupe/gold
        "on-surface": "#121212",
        "on-surface-variant": "#5a5a5a",
        outline: "#d1cbbd",
        error: "#9e1b1b",
      },
      fontFamily: {
        headline: ["Noto Serif", "Playfair Display", "serif"], 
        body: ["Manrope", "system-ui", "sans-serif"], 
      },
      boxShadow: {
        'avory-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.04)',
        'avory-float': '0 20px 60px -10px rgba(0, 0, 0, 0.08)',
        'avory-nav': '0 4px 20px rgba(0, 0, 0, 0.03)',
      },
      borderRadius: {
        '4xl': '2.5rem',
      }
    },
  },
  plugins: [],
};
