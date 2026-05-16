# BooKBooK 技術選定

このドキュメントは、リポジトリ内の依存関係・構成から読み取れる **現在の技術選定** を整理したものです。

## プロジェクト形態

| 項目           | 選定                                        |
| -------------- | ------------------------------------------- |
| アプリの役割   | 蔵書検索・貸出・返却・履歴などを `/api` と UI で提供 |
| リポジトリ構成 | npm workspaces によるモノレポ             |
| Node.js        | `>= 20`（ルート `package.json` の engines） |
| 公開アプリ     | Web（`apps/web`）がメイン成果物             |
| 共有コード     | `packages/shared`（TypeScript のみ・軽量）  |

ワークスペース定義はルート `package.json` の `workspaces: ["apps/web", "packages/*"]` に準拠します。

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

ルーティングは React Router ではなく、**タブ状態を Context で保持するシングルページ構成**（`App.tsx` + `_states/AppContext` + `BottomTabs`）。

デザイン・トーンのルールはリポジトリ直下の [DESIGN.md](../DESIGN.md) に従います。

## バックエンド（同一リポジトリ内）

| 項目           | 選定 |
| -------------- | ---- |
| 実行環境       | Cloudflare Workers（`@cloudflare/vite-plugin` / Wrangler で開発・デプロイ想定） |
| HTTP フレームワーク | Hono 4 |
| 認証           | Google OAuth 2.0 + HTTP-only Cookie セッション（`worker/auth.ts`） |
| CMS            | microCMS（複数拠点用に API キー・ベース URL を環境変数で切替） |
| 外部メタデータ | ISBN に対し OpenBD / Google Books API / NDL OpenSearch 等を Worker から取得・マージ |
| XML パース     | fast-xml-parser（NDL 応答など） |
| 通知           | Slack Incoming Webhook（任意） |

API は `apps/web/worker/index.ts` に集約され、`/api/*` プレフィックスで提供されます。

## テスト

| 項目     | 選定 |
| -------- | ---- |
| ランナー | Vitest 3 |
| 対象     | 現状は `worker/**/*.test.ts` のみ（`vitest.config.ts` で `environment: 'node'`） |

フロントエンドのコンポーネントテストは、現時点ではワークスペースの scripts に含まれていません。

## 開発コマンド（ルートから）

ルート `package.json` のショートカット:

```sh
npm run dev      # @bookbook/web の dev（Vite）
npm run build    # @bookbook/web の production build
npm run preview  # @bookbook/web の preview
npm run test     # @bookbook/web の vitest run
```

`apps/web` 直下でも同様に `npm run dev` / `build` / `preview` / `test` が定義されています。

## 関連ファイル

| 内容           | パス例 |
| -------------- | ------ |
| Web 依存関係   | `apps/web/package.json` |
| Vite 設定      | `apps/web/vite.config.ts` |
| Worker エントリ | `apps/web/worker/index.ts` |
| Vitest 設定    | `apps/web/vitest.config.ts` |
| 共有パッケージ | `packages/shared/package.json` |

---

選定の変更時は、このファイルと `docs/ai/AGENTS.md` の概要表をあわせて更新してください。
