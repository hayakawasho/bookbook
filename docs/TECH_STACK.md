# BooKBooK 技術選定

このドキュメントは、リポジトリ内の依存関係・構成から読み取れる **現在の技術選定** を整理したものです。

## プロジェクト形態

| 項目           | 選定                                        |
| -------------- | ------------------------------------------- |
| アプリの役割   | 蔵書検索・貸出・返却・履歴などを `/api` と UI で提供 |
| リポジトリ構成 | npm workspaces によるモノレポ             |
| Node.js        | `>= 20`（ルート `package.json` の engines） |
| 公開アプリ     | Web（`apps/web`）がメイン成果物             |
| BFF / API      | `apps/bff`（Cloudflare Workers + Hono）     |
| 共有コード     | `packages/utils`（DOM / React 非依存の TypeScript のみ） |

ワークスペース定義はルート `package.json` の `workspaces: ["apps/web", "apps/bff", "packages/*"]` に準拠します。

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

ルーティングは React Router ではなく、**タブ状態を Context で保持するシングルページ構成**（`App.tsx` + `_states/AppContext` + `BottomTabs`）。

フロントから API へのパスは **`/api` 固定**（例: `API_BASE = '/api'`）。Cookie 認証のため **本番でも同一オリジンで `/api/*` が BFF に届く**ようにインフラを組む前提です。

### ローカル開発時の `/api`

Vite の開発サーバーが **`/api` を `wrangler dev`（既定 `http://127.0.0.1:8787`）へプロキシ**します。別ターミナルで BFF を起動してください。

```sh
npm run dev:bff   # @bookbook/bff（wrangler dev）
npm run dev       # @bookbook/web（Vite）
```

デザイン・トーンのルールはリポジトリ直下の [DESIGN.md](../DESIGN.md) に従います。

フロントエンドのディレクトリ境界と依存ルールは [FRONTEND_STRUCTURE.md](./FRONTEND_STRUCTURE.md) を参照します。

## BFF（`apps/bff`）

| 項目           | 選定 |
| -------------- | ---- |
| 実行環境       | Cloudflare Workers（Wrangler で開発・デプロイ） |
| HTTP フレームワーク | Hono 4 |
| 認証           | Google OAuth 2.0 + HTTP-only Cookie セッション（`src/auth.ts`） |
| CMS            | microCMS（複数拠点用に API キー・ベース URL を環境変数で切替） |
| 外部メタデータ | ISBN に対し OpenBD / Google Books API / NDL OpenSearch 等を Worker から取得・マージ |
| XML パース     | fast-xml-parser（NDL 応答など） |
| 通知           | Slack Incoming Webhook（任意） |

API は `apps/bff/src/index.ts` に集約され、`/api/*` プレフィックスで提供されます。

## テスト

| 項目     | 選定 |
| -------- | ---- |
| ランナー | Vitest 3（ルート `devDependencies` でワークスペース共通） |
| Web      | `apps/web/vitest.config.ts` — `environment: 'jsdom'`、`src/**/*.test.{ts,tsx}`、セットアップで `@testing-library/jest-dom` と `cleanup` |
| BFF      | `apps/bff/vitest.config.ts` — `src/**/*.test.tsx`、`environment: 'node'` |

フロントエンドのテスト方針・統合テストの対象と API モックは [FRONTEND_STRUCTURE.md](/docs/FRONTEND_STRUCTURE.md) の「テスト戦略との関係」を参照します。

## 開発コマンド（ルートから）

ルート `package.json` のショートカット:

```sh
npm run dev        # @bookbook/web の dev（Vite）
npm run dev:bff    # @bookbook/bff の wrangler dev（/api 用）
npm run build      # @bookbook/web の production build
npm run deploy:bff # @bookbook/bff を wrangler deploy
npm run preview    # @bookbook/web の preview
npm run storybook  # @bookbook/web の Storybook（開発）
npm run build-storybook # @bookbook/web の Storybook 静的ビルド（storybook-static）
npm run test       # @bookbook/web → @bookbook/bff の順で vitest run
```

各 `apps/*` 直下でも同名 script が定義されています。

## 関連ファイル

| 内容           | パス例 |
| -------------- | ------ |
| Web 依存関係   | `apps/web/package.json` |
| Vite 設定      | `apps/web/vite.config.ts` |
| BFF エントリ   | `apps/bff/src/index.ts` |
| Wrangler       | `apps/bff/wrangler.jsonc` |
| ローカルシークレット（任意） | `apps/bff/.dev.vars`（gitignore、`wrangler dev` が読む） |
| Vitest（Web）  | `apps/web/vitest.config.ts` |
| Vitest（BFF）  | `apps/bff/vitest.config.ts` |
| 共有パッケージ | `packages/utils/package.json` |

---

選定の変更時は、このファイルと `docs/ai/AGENTS.md` の概要表をあわせて更新してください。
