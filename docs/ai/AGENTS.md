# BooKBooK

> **Note for AI assistants**: Root `CLAUDE.md` and `AGENTS.md` are symlinks to this file. Always edit `docs/ai/AGENTS.md` directly.

## プロジェクト概要

BooKBooK — 蔵書・貸出履歴などを扱う Web アプリ（npm workspaces モノレポ）。メイン実装は `apps/web`。

詳細な技術選定は [TECH_STACK.md](../TECH_STACK.md) を参照。

## 技術スタック（概要）

| カテゴリ             | 技術                                                         |
| -------------------- | ------------------------------------------------------------ |
| 言語                 | TypeScript                                                   |
| フロント             | React 19、Vite 6、Tailwind CSS 4、SWR                        |
| API / Worker         | Cloudflare Workers、Hono 4                                   |
| パッケージマネージャ | npm（workspaces）                                            |
| Node                 | >= 20                                                        |

## 開発コマンド

ルートから:

```sh
npm run dev       # Vite 開発サーバー（@bookbook/web）
npm run build     # 本番ビルド
npm run preview   # ビルド結果プレビュー
npm run test      # Vitest（現状 worker テスト）
```

型チェック・リント用のルート script は未設定。必要なら `apps/web` に `tsc --noEmit` や ESLint を追加する。

## ディレクトリ構成

```
apps/web/src
  _book — 本に関するドメインモデル
  _components
    model — モデルに依存するコンポーネント
    navigation — タブ等の画面切替
    page — ページ固有コンポーネント
    ui — 横断 UI
  _foundation — 横断的な変数・関数
  _repositories — API 呼び出し
  _states — グローバル状態（Context 等）
  assets — アセット
apps/web/worker — Cloudflare Worker（Hono API）
packages/shared — 共有 TypeScript（現状最小）
```

## デザインルール

デザインシステムの仕様は `DESIGN.md` を参照すること。UIを生成する際は必ずこのファイルのルールに従うこと。

## コーディング規約

- 変更前にリント・型チェックを通すこと
- 小さく意味のある単位でコミットすること
- コミットメッセージは英語 (Conventional Commits 推奨)

## プロジェクト固有ルール

(プロジェクト固有の規約が決まったら記載)

## 参照ドキュメント

- [TECH_STACK.md](/docs/ai/TECH_STACK.md) — 技術選定の詳細
- [CLEAN_CODE](/docs/ai/rules/CLEAN_CODE.md) — 可読性の基準、Bad / Good パターン集

## Agent Skills

- [/CMD_review](skills/CMD_review/SKILL.md) — PR レビュー
