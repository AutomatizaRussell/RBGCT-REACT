/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Esta combinación prioriza fuentes limpias como Inter o Roboto
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
        'rb-md': '0 8px 20px -6px rgba(0, 24, 113, 0.12)',
      },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}