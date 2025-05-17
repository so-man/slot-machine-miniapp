import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // ✅ important for correct asset resolution on Vercel
  plugins: [react()],
});
