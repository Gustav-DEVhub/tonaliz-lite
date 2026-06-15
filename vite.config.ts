import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-screenshot-wide.png',
        'pwa-screenshot-mobile.png',
        'icons.svg',
      ],
      manifest: {
        id: '/',
        name: 'Tonaliz Lite',
        short_name: 'Tonaliz',
        description:
          'Independent music discovery PWA with mood-aware visuals, favorites, and a responsive player.',
        theme_color: '#08070A',
        background_color: '#08070A',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
        screenshots: [
          {
            src: '/pwa-screenshot-wide.png',
            sizes: '1440x1024',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Tonaliz Lite desktop discovery view',
          },
          {
            src: '/pwa-screenshot-mobile.png',
            sizes: '390x844',
            type: 'image/png',
            label: 'Tonaliz Lite mobile discovery view',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('react-dom') || id.includes('react/')) {
            return 'react-vendor'
          }

          if (id.includes('react-router-dom') || id.includes('@remix-run')) {
            return 'router-vendor'
          }

          if (id.includes('motion') || id.includes('framer-motion')) {
            return 'motion-vendor'
          }

          if (id.includes('@dnd-kit')) {
            return 'dnd-vendor'
          }

          if (id.includes('lucide-react')) {
            return 'icons-vendor'
          }

          if (id.includes('@radix-ui')) {
            return 'radix-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
})
