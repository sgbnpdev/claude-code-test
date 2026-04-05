import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/claude-code-test/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Habits — Atomic Tracker',
        short_name: 'Habits',
        description: 'Private habit tracking based on Atomic Habits',
        theme_color: '#111111',
        background_color: '#f7f7f5',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/claude-code-test/',
        scope: '/claude-code-test/',
        icons: [
          { src: '/claude-code-test/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/claude-code-test/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
})
