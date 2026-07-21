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

ルートの Makefile に集約している（正は Makefile）:

```sh
make dev        # api（wrangler dev）と web（Vite）を同時起動。Vite が /api をプロキシ
make dev-web    # web のみ
make dev-api    # api のみ
make build      # 本番ビルド（Web）
make deploy-api # API を Wrangler でデプロイ
make test       # Vitest（utils → web → api）
make lint       # Biome チェック（make lint-fix で自動修正）
make db-migrate # ローカル D1 にマイグレーション適用（初回・スキーマ変更時に必須）
```

ローカル D1 の詳細（サンプルデータ投入・リモート適用）は [tech-stack.md](/docs/architecture/tech-stack.md) を参照。

## アーキテクチャ

**正のドキュメントは [docs/architecture/](/docs/architecture/index.md)**。ファイルの配置・移動時は必ず [frontend-structure.md](/docs/architecture/frontend-structure.md) の Decision Flow に従う。

### レイヤー（`apps/web/src`）

```txt
_components     = 画面に置くもの（app / page / feature / ui）。app は composition root（config.ts / repositories.ts のファクトリで具象を生成し、main.tsx から props → Context で注入する）
_models         = ドメイン概念（entity / value object / id）。他レイヤーを知らない
_usecases       = 複数 page / feature で共有する usecase（ports / queries / commands / policies）
_repositories   = API `/api/*` の adapter。_usecases の port を実装する
_foundation     = 画面を成立させる基盤。特定 page / feature / ui を知らない
_libs           = 外部ライブラリの薄い adapter
packages/utils  = 外部依存を持たない純粋 utility
```

### 主要ルール

- ルーティングは React Router（declarative mode）。URL が画面遷移状態の単一の真実（`/` → Home、`/library` → Library、`/history` → CheckoutHistory、`/settings/*` → Settings）。復元が必要なサブ状態は URL に載せる（`/history?tab=past`）。本棚の検索文字列は IME 入力を妨げないよう画面内のローカル状態として持ち、URL には同期しない
- page / usecase は repository の具象実装ではなく `_usecases/**/ports.ts` の port に依存する。具象の生成・注入は `_components/app` に集約する
- `ui` は文脈非依存。ドメイン型を props に持たず、`_repositories` / `_usecases` / `app` / `page` / `feature` を import しない
- 画面固有の処理は `page/<Screen>/`（`hooks/` / `logic/` / `_internal/`）に閉じる。`index.tsx` はシェルのみ（hooks の組み立て・配線、目安 80 行以下）
- 複数 page / feature で共有する処理は `_usecases/<domain>` に置く
- エラーは Result 型 + 早期リターンで表現する
- サーバーデータのキャッシュは SWR に統一し、独自 store を作らない

### テスト

- 重要なユーザー導線は `apps/web` の統合テスト（RTL + Vitest, jsdom）で守る。UI 単体テストは大量に作らない
- 純粋関数・変換・状態遷移（`_models` / `_usecases` / page の `logic/`）は Vitest 単体テスト
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
