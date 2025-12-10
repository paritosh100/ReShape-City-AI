import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Fallback for process.env.API_KEY if needed, though import.meta.env is preferred in Vite
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});