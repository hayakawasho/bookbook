# フロントエンド構成方針

このドキュメントは `apps/web` のディレクトリ境界と依存ルールを定義します。

## 基本方針

現時点の成果物は `apps/web` が中心のため、UI コンポーネントは当面 `apps/web/src/_components` 配下で管理します。`packages/ui` は作らず、将来複数アプリで UI を共有する必要が出た時点で切り出します。

コンポーネントは `_components` 配下で `usecase` / `page` / `ui` / `layout` の関心に分けます。ドメイン処理は `model` / `usecase` / `repository` の責務を分けます。

## `_components` の分類

- `apps/web/src/_components/ui`: アプリ状態・API・Repository に依存しない横断 UI。将来 `packages/ui` に移せるよう props と表示ロジックに留める。
- `apps/web/src/_components/usecase`: 単一のリソースやタスクの表現に特化した複合コンポーネント。ドメインモデルや usecase の結果を受け、画面内の意味ある機能単位を構成する。
- `apps/web/src/_components/page`: 画面単位のコンポーネント。状態接続・ユースケース呼び出し・`layout` / `usecase` の組み合わせを担う。
- `apps/web/src/_components/layout`: ページ間を横断する共通レイアウトや画面構造。タブ、ヘッダー、ナビゲーションなどを含む。

## ドメインと API の境界

`_book` は本リソースに関する `model` / `usecase` を持つドメイン領域です。API 通信は `_repositories` に閉じ込め、ページや UI コンポーネントから直接 fetch しない方針です。

画面側は usecase / repository から得た結果を props として表示コンポーネントへ渡します。

## 依存ルール

`ui` から以下を import しないこと。

- `_states`
- `_repositories`
- `_book/usecase`
- `page`
- `usecase`
- `layout`

アプリ状態や API 結果が必要な場合は `page` / `usecase` 側で接続し、`ui` には props で渡します。

## Storybook

Storybook を導入する場合は、UI の所有場所に合わせて `apps/web` 側に置く方針です。`packages/ui` として独立させるのは、複数アプリからの再利用やデザインシステムとしての独立運用が必要になってからとします。

## テスト戦略との関係

フロントエンドは低コスト高効果を優先し、`apps/web` の重要なユーザー導線を統合テスト中心で守ります。純粋関数・変換・状態遷移は Vitest の単体テスト、見た目の状態差分は必要に応じて Storybook、実ブラウザ依存の確認は少数の E2E に絞ります。

### 統合テストの初期対象（3〜5 本）

以下を React Testing Library + Vitest（`environment: 'jsdom'`）でカバーします。

1. **モックセッション（HTTP API オフ）**: ホームの初期表示、本棚タブ・貸出履歴タブへの切り替え。
2. **HTTP API + Cookie 認証**: `VITE_USE_HTTP_API=true` 時に、`/api/auth/me` が未認証ならログイン画面、認証済みならホームが表示されること。

テスト実行時は `.env.local` の影響を避けるため、Vitest の `test.env` で `VITE_USE_HTTP_API` を既定では無効化しています。認証フローの検証が必要なファイルだけ `vi.stubEnv` で上書きします。

### API モック方針

**MSW は当面採用せず**、`fetch` を Vitest でスタブして `/api/auth/me` など必要最小限の応答を返します（`apps/web/src/test/stubAuthFetch.ts`）。統合テストが増えてハンドラ共有や実ネットワーク遮断が必要になった段階で MSW 導入を再検討します。

### Storybook 出力

主要な `_components/ui`（例: `Dialog`）からストーリーを追加し、状態差分の確認に使います。ビルド出力は `apps/web/storybook-static`（リポジトリにコミットしない）。
