import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { visualizer } from 'rollup-plugin-visualizer'

// __dirname is not defined in ESM; compute it from import.meta.url
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Optional bundle visualizer: enable by setting ANALYZE=true when running the build
    ...(process.env.ANALYZE === 'true' ? [visualizer({ filename: 'dist/bundle-stats.html', open: false })] : [])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    proxy: {
      // Readiness probe (used by frontend to detect DB availability)
      '/ready': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      },
      // Proxy /admin requests to backend to make relative calls work during development
      '/admin': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      },
      // Proxy /api requests to backend for REST API calls
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    rollupOptions: {
      external: ['@azure/cosmos'],
      output: {
        manualChunks(id) {
          // Put large vendor libraries into a vendor chunk
          if (id.includes('node_modules')) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('node_modules/recharts')) {
              return 'vendor-recharts'
            }
            if (id.includes('node_modules/phosphor-icons') || id.includes('node_modules/lucide-react')) {
              return 'vendor-icons'
            }
            if (id.includes('node_modules/sonner') || id.includes('node_modules/@radix-ui')) {
              return 'vendor-ui'
            }
            if (id.includes('node_modules/@azure')) {
              return 'vendor-azure'
            }
            if (id.includes('node_modules/file-saver')) {
              return 'vendor-filesaver'
            }
            if (id.includes('node_modules/clsx')) {
              return 'vendor-helpers'
            }
            return 'vendor-others'
          }

          // Group admin/diagnostic/analytics UI into a separate chunk
          if (id.includes(path.join('src', 'components')) && /Admin|Dashboard|Moderation|Cosmos|LogViewer|Analytics|Leaderboard|Trending|Personalized/i.test(id)) {
            return 'admin'
          }
        }
      }
    }
  }
})
