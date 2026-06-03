import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 54017,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:54018',
        changeOrigin: true,
      },
    },
  },
})
