import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'

import viteAppConfig from './vite.config'

export default mergeConfig(
  viteAppConfig,
  defineConfig({
    test: {
      /** `.env.local` の `VITE_USE_HTTP_API=true` より優先し、既定はモックセッションで統合テストする */
      env: {
        VITE_USE_HTTP_API: '',
      },
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      passWithNoTests: true,
    },
  }),
)
