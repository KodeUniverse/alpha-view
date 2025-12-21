import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: process.env.FRONTEND_LOCAL_PORT,
    hmr: {
      host: 
        'localhost',
         port: process.env.FRONTEND_LOCAL_PORT
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})

