import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  build: {
    rollupOptions: {
      output: {
        // Separar librerías pesadas del bundle de la app: se cachean aparte
        // y solo se descargan cuando la ruta que las usa se carga (lazy).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('recharts')) return 'vendor-charts'
          if (id.includes('jspdf')) return 'vendor-pdf'
          if (id.includes('xlsx')) return 'vendor-xlsx'
          if (id.includes('pdfjs-dist') || id.includes('react-pdf')) return 'vendor-pdfjs'
          if (id.includes('html2canvas')) return 'vendor-html2canvas'
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) return 'vendor-react'
          return undefined
        },
      },
    },
  },
})
