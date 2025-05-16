import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
    strictPort: false,
    fs: {
      strict: true,
    },
    // Ensure correct MIME types for all JavaScript files
    middlewares: [
      (req, res, next) => {
        // Handle both .js and .jsx files
        if (req.url?.endsWith('.js') || req.url?.endsWith('.jsx')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
        next();
      },
    ],
  },
  preview: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  appType: 'spa',
  base: '/',
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});