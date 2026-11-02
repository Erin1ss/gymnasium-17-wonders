import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/gymnasium-17-wonders/',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
