/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // RedSnare Design System
        rs: {
          black:        '#0A0A0A',
          'black-mid':  '#111111',
          'black-light':'#1A1A1A',
          'black-border':'#2A2A2A',
          red:          '#E8281E',
          'red-dark':   '#B01E16',
          white:        '#FFFFFF',
        },
        // Legacy brand (kept for backward compatibility)
        brand: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#E8281E',
          600: '#B01E16',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#450a0a',
          950: '#1a0000',
        },
        surface: {
          light:        '#ffffff',
          dark:         '#0A0A0A',
          'dark-card':  '#1A1A1A',
          'dark-hover': '#2A2A2A',
        },
      },
      fontFamily: {
        sans:  ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'ui-monospace', 'monospace'],
        logo:  ['Orbitron', 'sans-serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out',
        'fade-up':    'fadeUp 0.4s ease-out',
        'slide-in':   'slideIn 0.25s ease',
        'pulse-dot':  'pulseDot 2s ease-in-out infinite',
        'shimmer':    'shimmer 1.5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          'from': { opacity: '0', transform: 'translateX(-8px)' },
          'to':   { opacity: '1', transform: 'translateX(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1',   transform: 'scale(1)' },
          '50%':      { opacity: '0.5', transform: 'scale(0.8)' },
        },
        shimmer: {
          'from': { backgroundPosition: '-200% 0' },
          'to':   { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'rs-hero':         'linear-gradient(135deg, #E8281E, #FF6B6B)',
      },
      borderRadius: {
        'rs': '12px',
      },
    },
  },
  plugins: [],
};
