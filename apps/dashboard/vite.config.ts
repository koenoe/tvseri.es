import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';

function proxy() {
  const result: Record<string, ProxyOptions> = {};
  const apiUrl = process.env.VITE_API_URL!;

  if (process.env.API_PROXY) {
    result[apiUrl] = {
      changeOrigin: true,
      rewrite: (p: string) => p.replace(apiUrl, ''),
      target: process.env.API_PROXY,
    };
  }

  return result;
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
      routesDirectory: './src/routes',
      target: 'react',
    }),
    viteReact(),
    devtools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: proxy(),
  },
});
