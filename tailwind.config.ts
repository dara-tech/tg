import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tg: {
          blue:             'rgb(var(--tg-blue-rgb) / <alpha-value>)',
          'blue-dark':      'rgb(var(--tg-blue-dark-rgb) / <alpha-value>)',
          bg:               'rgb(var(--tg-bg-rgb) / <alpha-value>)',
          'bg-secondary':   'rgb(var(--tg-bg-secondary-rgb) / <alpha-value>)',
          'bg-tertiary':    'rgb(var(--tg-bg-tertiary-rgb) / <alpha-value>)',
          surface:          'rgb(var(--tg-surface-rgb) / <alpha-value>)',
          text:             'rgb(var(--tg-text-rgb) / <alpha-value>)',
          'text-secondary': 'rgb(var(--tg-text-secondary-rgb) / <alpha-value>)',
          'text-hint':      'rgb(var(--tg-text-hint-rgb) / <alpha-value>)',
          border:           'rgb(var(--tg-border-rgb) / <alpha-value>)',
          green:            '#40C057',
          red:              '#E03131',
          bubble:           'rgb(var(--tg-bubble-rgb) / <alpha-value>)',
          'bubble-out':     'rgb(var(--tg-bubble-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          '"ActiveKhmerFont"',
          '"Google Sans"',
          '"Google Sans Text"',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          '"Krasar"',
          '"Kantumruy Pro"',
          'sans-serif',
        ],
        khmer: ['"ActiveKhmerFont"', '"Krasar"', '"Kantumruy Pro"', '"BattambangKhmer"', 'sans-serif'],
        modern: ['"Google Sans"', '"Google Sans Text"', 'sans-serif'],
      },
      animation: {
        'slide-up':   'slideUp 0.22s ease-out',
        'slide-down': 'slideDown 0.22s ease-out',
        'fade-in':    'fadeIn 0.18s ease-out',
        'bounce-dot': 'bounceDot 1.2s infinite',
      },
      keyframes: {
        slideUp:   { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        slideDown: { from: { transform: 'translateY(0)' }, to: { transform: 'translateY(100%)' } },
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        bounceDot: { '0%,80%,100%': { transform: 'scale(0)' }, '40%': { transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};

export default config;
