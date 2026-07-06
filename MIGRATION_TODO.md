# D1 リモート反映 残作業

microCMS → D1 移行の実装・ローカル検証は完了済み。残りは本番反映のみ。
完了済み: `wrangler login`、`wrangler d1 create bookbook-db`（region APAC）、`wrangler.jsonc` への `database_id` 設定。

## 1. リモート D1 へマイグレーション適用

```sh
make db-migrate-remote
```

## 2. microCMS からデータ移行（一回限り）

microCMS 管理画面から各拠点の API キーとエンドポイントを控え、環境変数で渡してシード SQL を生成 → リモートに投入する。

```sh
export MICROCMS_DAIKANYAMA_API_KEY=xxx
export MICROCMS_DAIKANYAMA_BASE_URL=https://xxx.microcms.io/api/v1
export MICROCMS_OKINAWA_API_KEY=yyy
export MICROCMS_OKINAWA_BASE_URL=https://yyy.microcms.io/api/v1

node scripts/migrate-microcms-to-d1.mjs > seed.sql
cd apps/api && npx wrangler d1 execute bookbook-db --remote --file=../../seed.sql
```

- スクリプトは冪等（冒頭で全削除して入れ直す）。失敗したら再実行してよい
- 片方の拠点だけ環境変数を設定すればその拠点のみ移行される
- 件数サマリが stderr に出るので microCMS 管理画面の件数と突き合わせる
- `seed.sql` は個人情報（借り手メール）を含むためコミットしない。投入後に削除する

## 3. デプロイ

Worker のシークレット（SLACK_WEBHOOK_URL / GOOGLE_* / AUTH_COOKIE_SECRET / ALLOWED_EMAIL_DOMAINS）は既存のものがそのまま使われる。MICROCMS_* の secret は不要になった（後で削除: `npx wrangler secret delete <KEY>`）。

```sh
make deploy-api
```

## 4. 本番動作確認

1. 本番 URL でログイン → 本棚タブに移行済みの蔵書が表示されること
2. 1 冊貸出 → Slack 通知（借り手名入り）と貸出履歴タブを確認
3. 返却 → 在庫が戻ること、Slack 返却通知
4. （任意）在庫 1 の本に連続貸出 → 2 回目が「在庫なし」で弾かれること

## 5. 後片付け

- [ ] `npx wrangler secret delete MICROCMS_DAIKANYAMA_API_KEY`（他 3 つも同様）
- [ ] `seed.sql` を削除
- [ ] microCMS の解約判断
- [ ] この MIGRATION_TODO.md を削除
