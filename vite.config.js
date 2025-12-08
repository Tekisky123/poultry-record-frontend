import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: "autoUpdate",
    includeAssets: ["favicon.ico", "logo192.png", "logo512.png"],
    manifest: {
      name: "RCC AND TRADING COMPANY",
      short_name: "RCC",
      theme_color: "#000000",
      background_color: "#000000",
      display: "standalone",
      start_url: "/",
      icons: [
        { src: "logo192.png", sizes: "192x192", type: "image/png" },
        { src: "logo512.png", sizes: "512x512", type: "image/png" }
      ],
    },
    workbox: {
      maximumFileSizeToCacheInBytes: 10 * 1024 * 1024  // <= FIX (10MB)
    }
  })],
  css: {
    postcss: './postcss.config.js'
  }
})
