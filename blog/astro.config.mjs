// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.mad2moi.store', // main site URL
  output: 'server', // Enable server-side rendering for API endpoints
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [
    tailwind(),
    mdx(),
    sitemap()
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  },
  vite: {
    optimizeDeps: {
      include: ['openai']
    },
    server: {
      host: true
    }
  },
  server: {
    host: true,
    port: process.env.PORT || 3000,
    allowedHosts: [
      'madmoi-1.onrender.com',
      'www.mad2moi.store',
      'mad2moi.store'
    ]
  }
});
