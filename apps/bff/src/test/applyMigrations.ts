import { applyD1Migrations, env } from 'cloudflare:test'

// wrangler.jsonc の migrations_dir を Miniflare のテスト DB へ都度適用する
// (readD1Migrations は Node 側 API のため vitest.config.ts で読み込み JSON で渡す)
const migrations = JSON.parse((env as unknown as { TEST_D1_MIGRATIONS: string }).TEST_D1_MIGRATIONS)
await applyD1Migrations(env.DB, migrations)
