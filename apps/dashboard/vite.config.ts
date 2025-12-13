import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';

import {
  generateMockCountries,
  generateMockRoutes,
  generateMockSummary,
} from './mock-data';

function proxy() {
  const result: Record<string, ProxyOptions> = {};
  const apiUrl = process.env.VITE_API_URL!;

  if (process.env.API_USE_MOCK_DATA === '1') {
    result[`${apiUrl}/metrics/web-vitals/summary`] = {
      bypass: (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const device = url.searchParams.get('device') || 'desktop';
        res!.setHeader('Content-Type', 'application/json');
        res!.end(JSON.stringify(generateMockSummary(7, device)));
        return false;
      },
    };
    result[`${apiUrl}/metrics/web-vitals/routes`] = {
      bypass: (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const device = url.searchParams.get('device') || 'desktop';
        res!.setHeader('Content-Type', 'application/json');
        res!.end(JSON.stringify(generateMockRoutes(device)));
        return false;
      },
    };
    result[`${apiUrl}/metrics/web-vitals/countries`] = {
      bypass: (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const device = url.searchParams.get('device') || 'desktop';
        res!.setHeader('Content-Type', 'application/json');
        res!.end(JSON.stringify(generateMockCountries(device)));
        return false;
      },
    };
  } else if (process.env.API_PROXY) {
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
