/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'board-bg': '#0f1419',
        'tile-bg': '#f5f0e1',
        'surface': '#1e2536',
        'surface-light': '#2a3347',
        'accent': '#f59e0b',
        'accent-hover': '#d97706',
      },
      fontFamily: {
        'display': ['Outfit', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
      },
      animation: {
        'dice-shake': 'diceShake 0.15s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'spin-slow': 'spin 3s linear infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        diceShake: {
          '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
          '25%': { transform: 'rotate(-8deg) scale(1.05)' },
          '75%': { transform: 'rotate(8deg) scale(1.05)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(245, 158, 11, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-100% 0' },
          '100%': { backgroundPosition: '100% 0' },
        },
      },
    },
  },
  plugins: [],
};
