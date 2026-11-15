import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5180, strictPort: true },
  // The Firebase sign-in chunk (~180 KB gzipped) is large but loads only when someone signs in.
  build: { chunkSizeWarningLimit: 800 },
})
