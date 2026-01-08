import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no modo (development/production)
  const env = loadEnv(mode, '.', '');

  return {
    // ESSENCIAL PARA MOBILE: Garante que os caminhos do index.html (JS/CSS)
    // sejam relativos (./assets) e não absolutos (/assets).
    base: './',

    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    plugins: [react()],

    // No seu vite.config.ts, altere o bloco 'define':
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
    },

    resolve: {
      alias: {
        // Atalho para importar arquivos usando @/components/...
        '@': path.resolve(__dirname, '.'),
      }
    },

    // Otimização para o build final do Android
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-icons': ['lucide-react'],
            'vendor-charts': ['recharts'],
            'vendor-utils': ['axios', '@google/generative-ai']
          }
        }
      }
    }
  };
});