# Barcode Scanner Comparison Design

## Goal

iPhone 実機で、現行の `html5-qrcode` 調整版と Quagga2 の EAN-13 読み取り性能を、同じ BooKBooK UI で比較できるようにする。

## Scanner Selection

- `/` は `html5-qrcode` を使う。
- `/?scanner=quagga2` は Quagga2 を使う。
- 不明な `scanner` 値は `html5-qrcode` へフォールバックする。
- 検証用の画面内トグルは追加しない。

## html5-qrcode Variant

- 解析頻度を 8 FPS から 10 FPS へ上げる。
- `qrbox` は映像幅の 90% を上限とする可変幅にする。
- 高さは現行より広げ、EAN-13 の傾きや保持位置のずれを許容する。

## Quagga2 Variant

- `ean_reader` のみを有効化する。
- カメラ映像の中央を広めに解析する。
- 検出値は既存の `BarcodeScannerAdapter.onDetected` に渡す。ISBN 正規化、重複防止、検索、ボトムシート、トーストは変更しない。
- Quagga2 は選択時に動的 import し、通常パスの初期バンドルから外す。
- 停止時はカメラと Quagga2 の処理を解放する。

## UI

カメラ領域、スキャン枠、説明、キャラクター、ボトムナビゲーションは両方で共通とする。Quagga2 のデバッグ用枠線やキャンバスは表示しない。

## Verification

- adapter 選択を単体テストする。
- Quagga2 の EAN-13 検出、エラー、停止処理をテストする。
- Web 全体の Vitest、Biome、本番ビルドを実行する。
- 実機では同じ iPhone、同じ本、同じ照明で、検出時間、失敗回数、誤読回数を比較する。
