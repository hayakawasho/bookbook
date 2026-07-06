import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const migrations = await readD1Migrations('./migrations')

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          AUTH_COOKIE_SECRET: '0123456789abcdef0123456789abcdef',
          ALLOWED_EMAIL_DOMAINS: '',
          SLACK_WEBHOOK_URL: '',
          GOOGLE_CLIENT_ID: '',
          GOOGLE_CLIENT_SECRET: '',
          GOOGLE_REDIRECT_URI: '',
          // setupFiles 内で D1 マイグレーションを適用するため JSON で渡す
          TEST_D1_MIGRATIONS: JSON.stringify(migrations),
        },
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/applyMigrations.ts'],
  },
})
