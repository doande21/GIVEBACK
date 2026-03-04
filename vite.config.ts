
<<<<<<< HEAD
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.VERCEL_AI_GATEWAY_URL': JSON.stringify(process.env.VERCEL_AI_GATEWAY_URL),
    'process.env.VERCEL_AI_GATEWAY_TOKEN': JSON.stringify(process.env.VERCEL_AI_GATEWAY_TOKEN),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: true
  }
=======
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
    'process.env.VERCEL_AI_GATEWAY_TOKEN': JSON.stringify(env.VITE_VERCEL_AI_GATEWAY_TOKEN),
},
    server: {
      port: 3000,
      open: true
    }
  };
>>>>>>> 80f8758a99c2b38f1b4a8af22ba14dc416cb3960
});
