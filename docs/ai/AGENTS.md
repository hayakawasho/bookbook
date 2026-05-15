# bookbook

> **Note for AI assistants**: Root `CLAUDE.md` and `AGENTS.md` are symlinks to this file. Always edit `docs/ai/AGENTS.md` directly.

## プロジェクト概要

bookbook — Web フロントエンドアプリケーション

## 技術スタック

| カテゴリ             | 技術   |
| -------------------- | ------ |
| 言語                 | (未定) |
| フレームワーク       | (未定) |
| スタイリング         | (未定) |
| パッケージマネージャ | (未定) |
| ビルドツール         | (未定) |

## 開発コマンド

```sh
# 開発サーバー起動
# (コマンド未定)

# ビルド
# (コマンド未定)

# テスト
# (コマンド未定)

# 型チェック
# (コマンド未定)

# リント / フォーマット
# (コマンド未定)
```

## ディレクトリ構成

```
(プロジェクト構成が決まったら記載)

- src
  - _book　本に関するドメインモデル
  - _components
    - model モデルに依存するコンポーネント
    - navigation ルーティング関連
    - page　ページ固有コンポーネント
    - ui　横断的に利用するコンポーネント
  - _foundation　横断的に利用できる変数や関数など
  - _repositories　API接続するリポジトリ層
  - _states　グローバルステート
  - assets アセットファイル
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

- [CLEAN_CODE](/docs/ai/rules/CLEAN_CODE.md) — 可読性の基準、Bad / Good パターン集

## Agent Skills

- [/CMD_review](skills/CMD_review/SKILL.md) — PR レビュー
