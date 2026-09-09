import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react()],

  // تجريد ضجيج console من حزمة الإنتاج.
  //
  // كان في الكود 414 نداءً، منها عشرات في useAuth وapi.ts تطبع بيانات
  // المستخدم ورموز الجلسة في وحدة تحكّم كل زائر — تسريب ووزن معاً.
  // نتركها في التطوير حيث تفيد، ونُبقي console.error في الإنتاج لأن إخفاء
  // الأخطاء الحقيقية أسوأ من ضجيجها.
  esbuild:
    mode === 'production'
      ? {
          pure: ['console.log', 'console.info', 'console.debug', 'console.warn', 'console.table'],
          drop: ['debugger']
        }
      : {},
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

          // مسارٌ موحّد الفواصل: ويندوز يعطي شرطاتٍ خلفية فتفشل مطابقة `/react/`
          const path = id.split('\\').join('/')

          /**
           * React أوّلاً — **وتركُه بلا إسناد كان يكلّف كل زائر ١٤٧ ك.ب.**
           *
           * حين لا تُسنَد وحدةٌ إلى حزمة، يضعها رولب حيث شاء. فوقع
           * `react-dom` داخل `vendor-charts` و`react` داخل `vendor-query` —
           * فصار كل زائرٍ يحمّل recharts وd3 ملتحمَين بـ react-dom في ملفٍّ
           * واحد، حتى في صفحة متجرٍ لا رسم بيانيّ فيها.
           *
           * والدائرية التي حُذِّر منها تأتي من **تفريق** react عن react-dom
           * عن scheduler، لا من فصلها. وهذه الثلاثة مجموعةٌ مغلقة: تُوضع معاً
           * فلا يستورد أحدها من خارج حزمته.
           */
          if (/\/node_modules\/(react|react-dom|scheduler|react-is|use-sync-external-store|object-assign)\//.test(path))
            return 'vendor-react'

          // victory-vendor هو ما يحزم d3 لصالح recharts — وبدونه يبقى في الرئيسية
          if (path.includes('/recharts') || path.includes('/victory-vendor') || /\/node_modules\/d3-/.test(path))
            return 'vendor-charts'
          if (path.includes('firebase')) return 'vendor-firebase'
          if (path.includes('framer-motion')) return 'vendor-motion'
          if (path.includes('socket.io') || path.includes('engine.io')) return 'vendor-socket'
          if (path.includes('@hello-pangea/dnd')) return 'vendor-dnd'
          if (path.includes('qrcode')) return 'vendor-qrcode'
          if (path.includes('@tanstack/react-query')) return 'vendor-query'
          // البقية (router، axios، الأيقونات...) تبقى في الحزمة الرئيسية
        }
      }
    }
  }
}))
