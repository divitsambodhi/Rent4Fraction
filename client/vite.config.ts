import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) {
              return 'vendor-charts'
            }
            if (
              id.includes('react-dom') ||
              id.includes('react-router-dom') ||
              id.includes('/react/') ||
              id.includes('\\react\\')
            ) {
              return 'vendor-react'
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-radix'
            }
            if (id.includes('@tabler/icons-react')) {
              return 'vendor-icons'
            }
            if (id.includes('zod')) {
              return 'vendor-zod'
            }
          }
        },
      },
    },
  },
})
