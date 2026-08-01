/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0b0f19',
          card: 'rgba(17, 24, 39, 0.7)',
          border: 'rgba(255, 255, 255, 0.1)',
          input: 'rgba(31, 41, 55, 0.6)'
        },
        cyber: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
          pink: '#ec4899',
          cyan: '#06b6d4',
          neon: '#6366f1'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-blue': '0 0 25px rgba(59, 130, 246, 0.35)',
        'glow-purple': '0 0 25px rgba(139, 92, 246, 0.35)',
        'glow-pink': '0 0 25px rgba(236, 72, 153, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.25), transparent 70%), radial-gradient(ellipse at bottom, rgba(236, 72, 153, 0.15), transparent 70%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'cyan-purple': 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)'
      }
    },
  },
  plugins: [],
}
