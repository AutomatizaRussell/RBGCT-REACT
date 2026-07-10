/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ],
      },
      colors: {
        brand: {
          navy: '#001871',
          lightBlue: '#00a9ce',
          purple: '#981d97',
          teal: '#00bfb3',
          orange: '#ed8b00',
          card: '#f8fafc',
          text: '#1e293b',
          border: '#dce3e8',
        },
      },
      boxShadow: {
        'rb-sm': '0 1px 3px rgba(0, 24, 113, 0.06), 0 4px 12px -4px rgba(0, 24, 113, 0.04)',
        'rb-md': '0 8px 20px -6px rgba(0, 24, 113, 0.12)',
        'rb-lg': '0 12px 32px -8px rgba(0, 24, 113, 0.15)',
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '24px',
      },
      transitionDuration: {
        '200': '200ms',
      },
      animation: {
        'skeleton': 'rb-skeleton-shimmer 1.5s ease-in-out infinite',
        'pulse-indicator': 'rb-pulse-indicator 2s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}
