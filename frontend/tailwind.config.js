/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'al-jazeera': ['Al-Jazeera-Arabic', 'Cairo', 'sans-serif'],
        'primary': ['Al-Jazeera-Arabic', 'Cairo', 'sans-serif'],
      },
      colors: {
        sham: {
          bg:          '#082E24',
          primary:     '#0D4A3A',
          secondary:   '#1A6B55',
          surface:     '#0F3D31',
          surfaceLight:'#164D3E',
          card:        '#112E23',
          accent:      '#C8E235',
          accentDark:  '#A8C220',
          text:        '#E8F5E9',
          muted:       '#9DC4AC',
          border:      'rgba(200,226,53,0.15)',
        },
        primary:   '#0D4A3A',
        secondary: '#1A6B55',
        accent:    '#C8E235',
        dark:      '#082E24',
      },
      boxShadow: {
        sham:     '0 4px 24px rgba(0,0,0,0.35)',
        'sham-lg':'0 8px 40px rgba(0,0,0,0.45)',
        accent:   '0 4px 20px rgba(200,226,53,0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-in':   'slideIn 0.3s ease forwards',
        'float':      'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};