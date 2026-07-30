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
        short_name: 'Tonaliz Lite',
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
          const normalizedId = id.replaceAll('\\', '/')

          if (
            normalizedId.includes('/react/jsx-runtime')
            || normalizedId.includes('/react/jsx-dev-runtime')
            || normalizedId.includes('/react/cjs/react-jsx-runtime')
          ) {
            return 'react-vendor'
          }

          if (!id.includes('node_modules')) {
            return undefined
          }

          if (normalizedId.includes('/node_modules/react-dom/') || normalizedId.includes('/node_modules/react/')) {
            return 'react-vendor'
          }

          if (normalizedId.includes('/node_modules/react-router-dom/') || normalizedId.includes('/node_modules/@remix-run/')) {
            return 'router-vendor'
          }

          if (normalizedId.includes('/node_modules/@dnd-kit/')) {
            return 'dnd-vendor'
          }

          if (normalizedId.includes('/node_modules/lucide-react/')) {
            return 'icons-vendor'
          }

          if (normalizedId.includes('/node_modules/@radix-ui/')) {
            return 'radix-vendor'
          }

          if (
            normalizedId.includes('/node_modules/motion/')
            || normalizedId.includes('/node_modules/framer-motion/')
            || normalizedId.includes('/node_modules/motion-dom/')
            || normalizedId.includes('/node_modules/motion-utils/')
          ) {
            return undefined
          }

          return 'vendor'
        },
      },
    },
  },
})
