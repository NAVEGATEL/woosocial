import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/client'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  },
  define: {
    'process.env.REACT_APP_STRIPE_PUBLIC_KEY': JSON.stringify('pk_test_51RYOX72fABgPqjgkcJlJyrXmJZvNlRh2JeBzEdoTP7Paob9ByFmmvsfnxqz34khNqmt1tryT0hB2Z3Do0UGFERjj00W2P4SVNB')
  }
})

