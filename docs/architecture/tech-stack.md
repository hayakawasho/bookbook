# BooKBooK 技術選定

リポジトリ内の依存関係・構成から読み取れる **現在の技術選定** を整理する。

## プロジェクト形態

| 項目           | 選定                                        |
| -------------- | ------------------------------------------- |
| アプリの役割   | 蔵書検索・貸出・返却・履歴などを `/api` と UI で提供 |
| リポジトリ構成 | npm workspaces によるモノレポ             |
| Node.js        | `>= 20`（ルート `package.json` の engines） |
| 公開アプリ     | Web（`apps/web`）がメイン成果物             |
| API サーバー   | `apps/api`（Cloudflare Workers + Hono + D1） |
| 共有コード     | `packages/utils`（DOM / React 非依存の TypeScript のみ） |

ワークスペース定義はルート `package.json` の `workspaces: ["apps/web", "apps/api", "packages/*"]` に準拠する。

## Web フロントエンド（`apps/web`）

| カテゴリ           | 技術・バージョン（代表） | 役割・備考 |
| ------------------ | ------------------------ | ---------- |
| 言語               | TypeScript ~5.8          | strict、`moduleResolution: bundler` |
| UI ライブラリ      | React 19                 | `StrictMode` でマウント |
| ビルド・開発サーバ | Vite 6                   | ESM、`vite.config.ts` でプラグイン構成 |
| React 統合         | `@vitejs/plugin-react`   | Fast Refresh 等 |
| スタイリング       | Tailwind CSS 4           | `@tailwindcss/vite` で Vite 統合 |
| データ取得         | SWR 2                    | `main.tsx` で `SWRConfig`（再検証ポリシーをアプリ全体で統一） |
| QR / バーコード    | html5-qrcode             | 書籍 ISBN スキャン用途 |
| PWA                | Service Worker           | `registerServiceWorker.ts` と `public/sw.js` |
| 単体・統合テスト   | Vitest 3 + jsdom、React Testing Library、`@testing-library/jest-dom` | `apps/web/vitest.config.ts`、`src/test/setup.ts` |
| UI カタログ（任意） | Storybook 10（Vite builder） | `apps/web` に配置、`npm run storybook -w @bookbook/web` |

ルーティングは **React Router（declarative mode, `react-router`）**。URL を画面遷移状態の単一の真実とし、`_components/app` の `App.tsx` が `<Routes>` で `page/<Screen>` を出し分け（`/settings/*` は page 内ネスト Routes）、`BottomTabs` は `NavLink` で遷移する。復元が必要なサブ状態は search param で持つ（`/history?tab=past`）。本棚の検索文字列は IME 入力を妨げないよう画面内のローカル状態として持ち、URL には同期しない。SPA fallback は Vite dev（標準）と本番 Worker（`wrangler.jsonc` の `not_found_handling: "single-page-application"`）の両方で有効。

フロントから API へのパスは **`/api` 固定**（例: `API_BASE = '/api'`）。Cookie 認証のため **本番でも同一オリジンで `/api/*` が API に届く**ようにインフラを組む前提とする。

### ローカル開発時の `/api`

Vite の開発サーバーが **`/api` を `wrangler dev`（既定 `http://127.0.0.1:8787`）へプロキシ**する。`make dev` で api / web が同時に起動する。

ローカル D1（wrangler のローカル SQLite）は初回とスキーマ変更時に `make db-migrate` でマイグレーションを適用する。スキーマ変更は `apps/api/migrations/` に連番 SQL を追加する（リモートへは `make db-migrate-remote`）。動作確認用データは任意で投入する:

```sh
cd apps/api && npx wrangler d1 execute bookbook-db --local \
  --command "INSERT INTO books (isbn, location, title) VALUES ('9784873115658', 'daikanyama', 'サンプル本')"
```

デザイン・トーンのルールはリポジトリ直下の [DESIGN.md](../../DESIGN.md) に従う。

フロントエンドのディレクトリ境界と依存ルールは [frontend-structure.md](./frontend-structure.md) を参照する。

## API（`apps/api`）

| 項目           | 選定 |
| -------------- | ---- |
| 実行環境       | Cloudflare Workers（Wrangler で開発・デプロイ） |
| HTTP フレームワーク | Hono 4 |
| 認証           | Google OAuth 2.0 + HTTP-only Cookie セッション（`src/auth.ts`） |
| データベース   | Cloudflare D1（`bookbook-db`。拠点は `location` カラムで表現、マイグレーションは `migrations/`） |
| 画像ストレージ | Cloudflare R2（`bookbook-thumbnails`、binding `THUMBNAILS`）。書影を isbn 単位（キー `covers/{isbn}`）で保存し `/api/thumbnails/:isbn` で配信。`cover_src` には自前 URL を保存する。ローカルは `wrangler dev` が自動シミュレーション、リモートは初回のみ `wrangler r2 bucket create bookbook-thumbnails` |
| 外部メタデータ | ISBN に対し OpenBD / Google Books API / NDL OpenSearch 等を Worker から取得・マージ。表紙画像は登録時に R2 へ取り込み（失敗時は外部 URL のままフォールバック） |
| XML パース     | fast-xml-parser（NDL 応答など） |
| 通知           | Slack Incoming Webhook（任意。貸出・返却・新規登録時にサーバー側から送信） |

`/api/*` プレフィックスで提供する。構成はトランザクションスクリプト: `routes/`（HTTP の関心）、`db.ts`（唯一 SQL を知る層）、`domain/`（純粋ルール）、`external/`（外部 I/O）。貸出・返却は `db.batch` + `changes()` ガードで原子的に実行する。

## テスト

| 項目     | 選定 |
| -------- | ---- |
| ランナー | Vitest 3（ルート `devDependencies` でワークスペース共通） |
| Web      | `apps/web/vitest.config.ts` — `environment: 'jsdom'`、`src/**/*.test.{ts,tsx}`、セットアップで `@testing-library/jest-dom` と `cleanup` |
| API      | `apps/api/vitest.config.ts` — `@cloudflare/vitest-pool-workers`（miniflare 上の実 D1 でテスト、setup でマイグレーション適用） |

フロントエンドのテスト方針・統合テストの対象と API モックは [frontend-structure.md](./frontend-structure.md) の「テスト戦略との関係」を参照する。

## 開発コマンド

ルートの Makefile に集約している。一覧は Makefile 本体とルート [`AGENTS.md`](/AGENTS.md) の「開発コマンド」を参照（重複記載しない）。npm workspaces の script（`npm run <cmd> -w @bookbook/<pkg>`）も各パッケージ直下に残っている。

## 関連ファイル

| 内容           | パス例 |
| -------------- | ------ |
| Web 依存関係   | `apps/web/package.json` |
| Vite 設定      | `apps/web/vite.config.ts` |
| API エントリ   | `apps/api/src/index.ts` |
| Wrangler       | `apps/api/wrangler.jsonc` |
| ローカルシークレット（任意） | `apps/api/.dev.vars`（gitignore、`wrangler dev` が読む） |
| Vitest（Web）  | `apps/web/vitest.config.ts` |
| Vitest（API）  | `apps/api/vitest.config.ts` |
| 共有パッケージ | `packages/utils/package.json` |

---
