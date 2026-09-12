import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * `base` has to be baked in at build time, and it differs by where the site is
 * served from:
 *
 *   - a project page, https://<user>.github.io/chemystery/  ->  '/chemystery/'
 *   - a custom domain, https://chemystery.example.com/      ->  '/'
 *
 * The deploy workflow sets VITE_BASE from whether public/CNAME exists, so
 * adding a custom domain later means adding that one file and nothing else.
 */
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
