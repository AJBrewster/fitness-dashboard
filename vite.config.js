import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // e2e/ holds Playwright specs (npm run test:e2e), which use a
    // different test()/expect() API than Vitest — without this,
    // Vitest's default *.spec.js glob picks them up and fails.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
})
