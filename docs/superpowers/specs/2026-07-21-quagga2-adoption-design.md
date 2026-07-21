# Quagga2 Adoption Design

## Goal

iPhone 実機で読み取り感度が良かった Quagga2 を、BooKBooK の標準バーコードスキャナーとして採用する。

## Scanner

- 通常 URL `/` で Quagga2 を使用する。
- `scanner` クエリによる実装切り替えを廃止する。
- `html5-qrcode` の adapter、テスト、依存関係を削除する。
- SSR では既存の mock scanner を使用する。

## UI and Behavior

- カメラ表示中は、既存の黄色い DOM ガイド枠を表示する。
- ISBN 正規化、重複防止、書籍検索は変更しない。
- 成功時は既存どおりボトムシートを表示する。
- 不正なバーコード、書籍なし、通信・サーバーエラーは既存どおりエラートーストを表示する。
- Quagga2 のデバッグ用 canvas や検出枠は表示しない。

## Documentation

技術スタックとフロントエンド構成資料にある `html5-qrcode` の記述を Quagga2 に更新する。比較検証の設計書は、採用判断に至った履歴として残す。

## Verification

- factory がブラウザで Quagga2、SSR で mock scanner を返すことを単体テストする。
- カメラ表示中の黄色いガイド枠を統合テストで確認する。
- Web 全体の Vitest、Biome、本番ビルドを実行する。
- 通常 URL `/` をブラウザで開き、Quagga2 と黄色いガイド枠が動作することを確認する。
