# BooKBooK

## プロジェクト概要

BooKBooK — 蔵書・貸出履歴などを扱う Web アプリ（npm workspaces モノレポ）。フロントは `apps/web`、API（`/api/*`）は `apps/api`。

## 技術スタック（概要）

| カテゴリ             | 技術                                     |
| -------------------- | ---------------------------------------- |
| 言語                 | TypeScript                               |
| フロント             | React 19、Vite 6、Tailwind CSS 4、SWR    |
| API / Worker         | Cloudflare Workers、Hono 4（`apps/api`） |
| パッケージマネージャ | npm（workspaces）                        |
| Node                 | >= 20                                    |

詳細は [tech-stack.md](/docs/architecture/tech-stack.md) を参照。

## 開発コマンド

ルートから:

```sh
npm run dev        # Vite（@bookbook/web）
npm run dev:api    # wrangler dev（@bookbook/api、ローカル /api）
npm run build      # 本番ビルド（Web）
npm run deploy:api # API を Wrangler でデプロイ
npm run preview    # Web のビルド結果プレビュー
npm run test       # Vitest（web の後に api）
```

ローカルで HTTP API を使うときは **`dev:api` と `dev` を併用**する（Vite が `/api` を Wrangler にプロキシ）。

初回はローカル D1 にマイグレーションを適用する（データは wrangler のローカル SQLite に保存される）:

```sh
npx wrangler d1 migrations apply bookbook-db --local   # apps/api で実行
npx wrangler d1 execute bookbook-db --local --command "INSERT INTO books (isbn, location, title) VALUES ('9784873115658', 'daikanyama', 'サンプル本')"  # 任意: 動作確認用データ
```

## アーキテクチャ

**正のドキュメントは [docs/architecture/](/docs/architecture/index.md)**。ファイルの配置・移動時は必ず [frontend-structure.md](/docs/architecture/frontend-structure.md) の Decision Flow に従う。

### レイヤー（`apps/web/src`）

```txt
_components     = 画面に置くもの（app / page / feature / ui）。app は composition root（Context と repositories.ts を持ち、具象を注入する）
_models         = ドメイン概念（entity / value object / id）。他レイヤーを知らない
_usecases       = 複数 page / feature で共有する usecase（ports / queries / commands / policies）
_repositories   = API `/api/*` の adapter。_usecases の port を実装する
_foundation     = 画面を成立させる基盤。特定 page / feature / ui を知らない
_libs           = 外部ライブラリの薄い adapter
packages/utils  = 外部依存を持たない純粋 utility
```

### 主要ルール

- ルーティングは React Router ではなく、タブ状態を `_components/app` の Context に持つシングルページ構成
- page / usecase は repository の具象実装ではなく `_usecases/**/ports.ts` の port に依存する。具象の生成・注入は `_components/app` に集約する
- `ui` は文脈非依存。ドメイン型を props に持たず、`_repositories` / `_usecases` / `app` / `page` / `feature` を import しない
- 画面固有の処理は `page/<Screen>/`（reader / usecase / mapper / `_internal/`）に閉じる。`index.tsx` はシェルのみ（目安 80 行以下）
- 複数 page / feature で共有する処理は `_usecases/<domain>` に置く
- エラーは Result 型 + 早期リターンで表現する
- サーバーデータのキャッシュは SWR に統一し、独自 store を作らない

### テスト

- 重要なユーザー導線は `apps/web` の統合テスト（RTL + Vitest, jsdom）で守る。UI 単体テストは大量に作らない
- 純粋関数・変換・状態遷移（`_models` / `_usecases` / mapper）は Vitest 単体テスト
- API モックは MSW ではなく `fetch` スタブ（`apps/web/src/test/stubAuthFetch.ts`）

## デザインルール

デザインシステムの仕様は `DESIGN.md` を参照すること。UI を生成する際は必ずこのファイルのルールに従うこと。

## コーディング規約

- 変更前にリント・型チェックを通すこと
- 小さく意味のある単位でコミットすること
- コミットメッセージは英語（Conventional Commits 推奨）

## 参照ドキュメント

- [docs/architecture/index.md](/docs/architecture/index.md) — アーキテクチャガイド（正）
- [docs/architecture/frontend-structure.md](/docs/architecture/frontend-structure.md) — 配置判断の Decision Flow（正）
- [docs/architecture/tech-stack.md](/docs/architecture/tech-stack.md) — 技術選定の詳細

## Agent Skills
