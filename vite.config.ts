import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 17lands' card_ratings endpoint sends CORS headers but color_ratings does
// not, so all 17lands traffic goes through this dev-server proxy.
const seventeenLandsProxy = {
  '/17lands': {
    target: 'https://www.17lands.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/17lands/, ''),
  },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy: seventeenLandsProxy },
  preview: { proxy: seventeenLandsProxy },
})
