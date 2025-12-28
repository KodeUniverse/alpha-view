import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {

    const env = loadEnv(mode, path.join(process.cwd(), ".."), "");

    return {
      server: {
        host: '0.0.0.0',
        port: 5379,
        hmr: {
          clientPort: env.HOST_PORT,
          port: 5379
        }
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
          '@components': path.resolve(__dirname, 'src', 'components'),
          '@routes': path.resolve(__dirname, 'src', 'routes'),
          '@services': path.resolve(__dirname, 'src', 'services'),
          '@assets': path.resolve(__dirname, 'src', 'assets'),
          '@utils': path.resolve(__dirname, 'src', 'utils')
        }
      },
      define: {
          'import.meta.env.API_URL': JSON.stringify(`http://localhost:${env.HOST_API_PORT}`)
      }
    }
})

