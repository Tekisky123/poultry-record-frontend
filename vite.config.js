import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA(
      {
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "maskable.png", "logo192.png", "logo256.png", "logo384.png", "logo512.png"],
        manifest: {

          name: "RCC AND TRADING COMPANY",
          theme_color: "#000000",
          background_color: "#000000",
          display: "standalone",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "maskable.png",
              size: "196x196",
              type: "image/png",
              purpose: "any maskable"
            },
            {
              src: "logo192.png",
              size: "192x192",
              type: "image/png"
            },
            {
              src: "logo256.png",
              size: "256x256",
              type: "image/png"
            },
            {
              src: "logo384.png",
              size: "384x384",
              type: "image/png"
            },
            {
              src: "logo512.png",
              size: "512x512",
              type: "image/png"
            }
          ]

        },
        workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024  // <= FIX (10MB)
        },
      }
    )],
  css: {
    postcss: './postcss.config.js'
  }
})
