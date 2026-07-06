# D1 環境構築 残作業

方針: **現在の Cloudflare アカウント（個人）= テスト環境**。動作確認後、**別の Cloudflare アカウントに本番**を作る。データは同じ seed を両方に投入する。

完了済み（テスト環境）:
- `wrangler login`（個人アカウント）
- `wrangler d1 create bookbook-db`（APAC、id は wrangler.jsonc 設定済み）
- リモートへマイグレーション適用（`make db-migrate-remote` ✅）

## テスト環境の残り

### 1. microCMS からデータ移行（seed.sql 生成は 1 回、投入はテスト/本番で使い回す）

microCMS 管理画面から各拠点の API キーとエンドポイントを控えて実行:

```sh
export MICROCMS_DAIKANYAMA_API_KEY=xxx
export MICROCMS_DAIKANYAMA_BASE_URL=https://xxx.microcms.io/api/v1
export MICROCMS_OKINAWA_API_KEY=yyy
export MICROCMS_OKINAWA_BASE_URL=https://yyy.microcms.io/api/v1

node scripts/migrate-microcms-to-d1.mjs > seed.sql
cd apps/api && npx wrangler d1 execute bookbook-db --remote --file=../../seed.sql
```

- スクリプトは冪等（冒頭で全削除して入れ直す）。失敗したら再実行してよい
- 件数サマリ（stderr）を microCMS 管理画面の件数と突き合わせる
- **seed.sql は借り手メールを含むためコミットしない**。本番投入が終わるまで手元に保管し、その後削除する

### 2. テスト環境へデプロイ

既存 Worker（bookbook-worker）のシークレット（SLACK_WEBHOOK_URL / GOOGLE_* / AUTH_COOKIE_SECRET / ALLOWED_EMAIL_DOMAINS）はそのまま引き継がれる。

```sh
make deploy-api
```

### 3. テスト環境で動作確認

1. ログイン → 本棚に移行済みの蔵書が表示される
2. 貸出 → Slack 通知（借り手名入り）+ 履歴反映
3. 返却 → 在庫復帰 + Slack 通知
4. （任意）在庫 1 に連続貸出 → 2 回目が弾かれる

## 本番環境（別の Cloudflare アカウント）

wrangler.jsonc に `env.production` を用意済み（`database_id` はプレースホルダ）。

1. 本番アカウントに切り替え: `npx wrangler logout && npx wrangler login`（または本番アカウントの `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` を export）
2. `cd apps/api && npx wrangler d1 create bookbook-db` → 発行された id を wrangler.jsonc の `env.production` の `TBD-prod-database-id` に設定
3. `make db-migrate-prod`
4. データ投入（テストと同じ seed.sql）:
   `cd apps/api && npx wrangler d1 execute bookbook-db --remote --env production --file=../../seed.sql`
5. シークレットを本番 env に登録（env ごとに別管理）:
   `npx wrangler secret put SLACK_WEBHOOK_URL --env production`（GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI / AUTH_COOKIE_SECRET / ALLOWED_EMAIL_DOMAINS も同様）
   - GOOGLE_REDIRECT_URI は本番 Worker の URL に合わせ、Google Cloud Console 側にもリダイレクト URI を追加する
6. `make deploy-api-prod`
7. テスト環境と同じ動作確認

## 後片付け

- [ ] 旧 MICROCMS_* secret を削除: `npx wrangler secret delete MICROCMS_DAIKANYAMA_API_KEY` など 4 つ（テスト側 Worker）
- [ ] seed.sql を削除（本番投入完了後）
- [ ] microCMS の解約判断
- [ ] この MIGRATION_TODO.md を削除
