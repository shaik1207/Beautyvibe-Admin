import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), 
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'framer-motion'],
  },
  server: {
    port: 5173,
    // Disables the policy blocking the Firebase popup
    headers: {
      "Cross-Origin-Opener-Policy": "unsafe-none",
      "Cross-Origin-Embedder-Policy": "unsafe-none"
    },
  },
});