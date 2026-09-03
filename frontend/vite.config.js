import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  css: {
    postcss: './postcss.config.js'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // الحزمة الرئيسية بعد فصل المكتبات لم تعد قريبة من الحد
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // فصل المكتبات الكبيرة عن كود التطبيق: زائر رمز QR لا يحتاج
        // recharts ولا firebase، وهذه الحزم تُخزَّن في المتصفح ولا تتغير
        // مع كل إصدار للتطبيق.
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'
          if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('socket.io') || id.includes('engine.io')) return 'vendor-socket'
          if (id.includes('@hello-pangea/dnd')) return 'vendor-dnd'
          if (id.includes('qrcode')) return 'vendor-qrcode'
          if (id.includes('@tanstack/react-query')) return 'vendor-query'
          // البقية (react، router، axios...) تبقى في الحزمة الرئيسية:
          // فصلها ينتج اعتماداً دائرياً بين الحزم.
        }
      }
    }
  }
})
