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
  // On GitHub Pages the platform lives at cjmurray1985.github.io/auspex/ and the
  // Draft Academy experience is a folder within it (…/auspex/draft-academy/).
  // Root '/' everywhere else (dev, preview, custom domains).
  base: process.env.GITHUB_PAGES ? '/auspex/draft-academy/' : '/',
  plugins: [react()],
  server: { proxy: seventeenLandsProxy },
  preview: { proxy: seventeenLandsProxy },
})
