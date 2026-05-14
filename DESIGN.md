# bookbook — DESIGN.md

> AI エージェントが一貫した UI を生成するためのデザインシステム定義。
> Google Stitch DESIGN.md 規格に準拠。

---

## 1. Visual Theme & Atmosphere

bookbook は、社内図書の貸し借りを単なる在庫管理ではなく、社員同士のコミュニケーションを生み出す接点として扱う。Vision は「本を身近にして、交流を拡げる」。UI は本との接触を増やすため、操作前に迷わせず、日常業務の中で自然に使えることを最優先にする。

ホーム画面は「まずバーコードを読む」状態を基本にする。読み取った ISBN が登録済みなら貸出または冊数追加へ進み、未登録なら新規追加へ進む。返却は借用中リストからワンタップで完了できるようにし、ユーザーに「借りる / 返す / 登録する」を事前選択させない。

トーンは PANORAMA のコーポレートサイトから受け継いだ、直線的で余白のある、黒・白・線・長方形を中心にした構成にする。装飾的なカードや過剰な丸みは避け、書籍情報、状態、アクションがすぐ読める実用的な画面にする。アクセントには bookbook の既存実装で使われている蛍光イエローを使い、スキャン枠やキャラクター、追加通知など、行動の起点や成功状態を強調する。

Figma 画像では、実画面はスマートフォン幅固定、iOS ステータスバー付き、白 / 薄灰 / 黒の面と水平 divider を中心に構成されている。リストはカードではなく行として扱い、書影、書籍情報、日付、返却ボタンを明確な余白で並べる。キャラクターイラストはホームのスキャン導線、NO IMAGE、ネットワークエラーなど状態説明に限定して使い、通常の情報領域を装飾しすぎない。

利用環境はスマートフォン中心。読みやすいテキストサイズ、ライト / ダークモード、十分なコントラスト、44px 以上のタッチターゲットを基本要件とする。

**Primary references**

- [社内に「あったらいいな」と思うサービスを自分たちで制作した話〈1/2〉サービス概要編](https://note.com/panorama_inc/n/nc007d39e259d)
- [社内に「あったらいいな」と思うサービスを自分たちで制作した話〈2/2〉設計とデザイン編](https://note.com/panorama_inc/n/n7b80489938ca)
- `apps/mobile/src/_foundation/const.ts`
- Figma exported screenshots, captured at 50% scale on 2026-05-14. Pixel values inferred from these images are approximate.

---

## 2. Color Palette & Roles

現行 mobile 実装の `COLOR` / `THEME_MODE` を Web 版の初期トークンとして採用する。

| Token | Value | Usage |
|---|---:|---|
| `--color-primary` | `#1C1F22` | ライトモードの主要テキスト、主要ボタン背景、アイコン |
| `--color-primary-contrast` | `#FFFFFF` | ダーク背景上の主要テキスト、ライトモード主要ボタン上の文字 |
| `--color-accent` | `#DEFF00` | スキャン枠、新規追加、成功の強調、bookbook らしさのアクセント |
| `--color-background` | `#F2F2F2` | ライトモードのページ背景 |
| `--color-surface` | `#FFFFFF` | ライトモードのナビゲーション、モーダル、ボトムシート |
| `--color-text` | `#1C1F22` | **デフォルト**の本文・見出し・リストで読むラベル（著者・日付・設定値など含む）。ライトモードの標準テキスト色 |
| `--color-text-muted` | `#6E6E6E` | **セカンダリー**。アクセントとして視線優先度を一段下げたサブテキスト（キャプション・ヒント・任意で弱化する短い説明）にのみ使う。読むべき情報の既定色として滥用しない |
| `--color-border` | `#DFDFDF` | 区切り線、リスト境界、入力下線 |
| `--color-middle` | `#AAAAAA` | 非アクティブアイコン、プレースホルダー、無効状態 |
| `--color-error` | `#F2546C` | エラー、削除的な警告、失敗トースト |
| `--color-success` | `#1873E6` | 完了、選択済みチェック、成功補助表示 |

**Dark mode tokens**

| Token | Value | Usage |
|---|---:|---|
| `--color-background-dark` | `#1C1F22` | ダークモードのページ背景 |
| `--color-surface-dark` | `#000000` | ダークモードのナビゲーション、モーダル、ボトムシート |
| `--color-text-dark` | `#FFFFFF` | **デフォルト**の本文・リストで読むラベル（ダークモード） |
| `--color-text-muted-dark` | `#868686` | **セカンダリー**（ダーク）。用途はライトの `--color-text-muted` と同じく、アクセントのサブテキストに限定 |
| `--color-border-dark` | `#363636` | ダークモードの区切り線 |
| `--color-disabled` | `#AAAAAA` | 無効ボタン背景、無効スライダー、押せない追加ボタン |

**Color use rules**

- ライト / ダークとも、本文と背景のコントラストを優先する。
- **テキスト色はデフォルトとセカンダリーの二段**と捉える。**デフォルト**は `--color-text`（ライト）／`--color-text-dark`（ダーク）。**セカンダリー**は `--color-text-muted`／`--color-text-muted-dark` で、**アクセントのサブテキスト**（キャプション・ヒント・任意で視線を本体からずらしたい短文）にのみ使う。著者・出版社・貸出日・総冊数ラベルなど、ユーザーが通常読む情報をセカンダリー色で一律にしない。
- 蛍光イエローは全面背景にしない。スキャン枠、キャラクター、重要な状態変化、追加アクションなど限定的に使う。
- 非アクティブタブ、非アクティブアイコン、プレースホルダー、無効状態は `--color-middle` を使い、透明度だけに依存しない。
- エラー通知バーは `--color-error` に近い赤い面を画面上部に出し、背景のリスト画面は維持する。
- ダークモードのボトムシートは `--color-background-dark` に近い黒い面、主要ボタンは白背景 / 黒文字に反転する。
- エラーと成功は色だけで伝えず、テキストまたはアイコンを併用する。

---

## 3. Typography Rules

現行 mobile 実装は Helvetica Neue / sans-serif を前提にしている。Web 版では OS 標準のサンセリフを使い、日本語でも読みやすいシステムフォントスタックにする。

| Role | Font Family | Size | Weight | Line Height |
|---|---|---:|---:|---:|
| Scanner Title | `system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif` | 30px | 700 | 38px |
| Display | same | 24px | 700 | 32px |
| Heading 1 | same | 20px | 700 | 28px |
| Heading 2 | same | 18px | 700 | 26px |
| Heading 3 | same | 16px | 600 | 24px |
| Body | same | 14px | 400 | 22px |
| Body Strong | same | 14px | 600 | 22px |
| Small | same | 12px | 400 | 17px |
| Tab Label | same | 12px | 300 / 600 | 18px |
| Code | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | 13px | 400 | 20px |

**Typography use rules**

- ホームの `Scan Barcode` は Scanner Title を使い、短い説明文を Small で直下に置く。
- 書籍タイトルは 14px / 600 / 22px を基本にし、2-3行まで読みやすく表示する。
- 著者、出版社、冊数、日付などの補助情報は 12px / 17px を基本にする。**色はデフォルト（`--color-text`）を標準とし**、セカンダリー色はあくまでサブテキストとして弱化したいときだけ使う。
- 設定リスト項目は 16px 前後の本文サイズで、画面タイトルは 14px / 600 を中央配置する。
- ネットワークエラーの `Error` は Display 相当で強く見せ、説明文は Small から Body の範囲で短く置く。
- ナビゲーションタイトルは 14px / 600 を基本に中央配置する。
- ブラウザや OS の文字サイズ設定を尊重する。固定高の中で文字が切れる設計にしない。
- 文字間隔は原則 `0`。既存 mobile の 0.05em 相当の見た目が必要な小ラベルに限り、微量の letter-spacing を許可する。

---

## 4. Component Stylings

### Buttons

- 主要ボタンは長方形、角丸なし、最小高さ 44px。
- 主要ボタンの背景は現在のテーマの本文色、文字色は現在のテーマの背景色にする。
- ライトモードの enabled 主要ボタンは黒背景 / 白文字、disabled は中間グレー背景 / 薄い文字にする。
- ダークモードの enabled 主要ボタンは白背景 / 黒文字、disabled はグレー背景 / 暗め文字にする。
- 行内の「返却」ボタンは右側カラム幅いっぱいに近い黒い長方形で、角丸を付けない。
- ボトムシート内の「追加 +」は小さな長方形ボタンとして扱い、disabled 時は白または黒い面に馴染ませてコントラストを下げる。
- アイコンボタンは 44px 四方を最小タップ領域にし、見た目のアイコンは 20-24px を基本にする。
- 無効状態は `--color-middle` 背景と明示的な `disabled` 属性を使う。
- 破壊的または取り消し不能に見える操作には確認ダイアログを挟む。

### Inputs

- 検索入力は下線のみのミニマルな形式を基本にする。
- プレースホルダーは `--color-middle`。
- フォーカス時は `--color-success` の下線またはアウトラインを使う。
- 入力欄の高さは 44px 以上を確保する。
- 本棚画面は貸出履歴系リストとほぼ同じ行レイアウトを使い、検索窓だけを主要な差分として画面上部に追加する。

### Book Items

- 書籍行は表紙 103px 幅、右側にタイトルと著者を置く構成を基本にする。
- 行の左右余白は 22px、上下余白は 32px。
- 表紙画像がない場合は `NO IMAGE` のフォールバックカバーを使う。登録途中やテスト表示では蛍光イエローの単色カバーも許容する。
- 行末や区切りには 1px の divider を使い、カード化しない。
- 本棚、借りている本、これまで借りた本は同じリスト密度と divider を使う。本棚だけ検索窓を追加し、貸出履歴系は上部タブで履歴状態を切り替える。
- 借用中リストでは行内に「返却」ボタンを表示する。返却失敗時もリストの文脈を保ち、上部にエラー通知バーを重ねる。

### Dialogs & Bottom Sheets

- スキャン後の書籍詳細は画面下からのボトムシートとして表示する。
- ボトムシートはページ背景と同じテーマ色を使い、上端のみ 20px の角丸を許可する。
- ボトムシート上端中央には短いドラッグハンドルを置く。
- ボトムシート内は、書影、書籍タイトル、出版社/著者、貸出可否、総冊数、追加ボタン、画面下部の主要ボタンの順を基本にする。
- enabled / disabled と light / dark の4状態を用意する。状態差分は色、ボタン可否、貸出可否表示で表し、配置は変えない。
- 確認ダイアログは中央配置、幅 265-287px を目安にし、短い文言と 2 アクションに限定する。

### Navigation

- スマホでは下部タブを固定する。高さは 70px + safe area。
- タブは `ホーム`, `本棚`, `貸出履歴` の 3 つ。
- アクティブタブはテーマの本文色、非アクティブタブは `--color-middle`。
- `貸出履歴` 画面内は上部タブで `借りている本`, `これまで借りた本` を切り替える。アクティブタブは黒い下線、非アクティブタブは薄いグレー文字にする。
- ヘッダーは中央タイトル、右側に検索または設定アイコンを置く。

### Scanner

- ホームの主領域はカメラプレビューを優先する。
- スキャン枠は `--color-accent`、太さ 10px、横長長方形を基本にする。
- ホームは上部のカメラプレビュー、下部の説明パネル、最下部のタブナビゲーションで構成する。Figma画像ではカメラ領域と説明パネルの境界が画面中央付近にあり、注記の 223px は50%キャプチャ由来の参考値として扱う。
- 説明パネルには `Scan Barcode`、短い説明文、蛍光イエローのキャラクターイラストを置く。
- BarcodeDetector 非対応、カメラ拒否、HTTPS でない環境では ISBN 手入力を同じ画面内に表示する。

### Settings

- 設定画面は戻るアイコン、中央タイトル、水平 divider、設定行で構成する。
- 設定行は左に項目名、右にシェブロンまたはトグルを置く。行高は 56-64px を目安にする。
- ダークモード切り替えは iOS 風の pill toggle を使い、オンは黒いトラックと白いノブで表す。

### Volume

- 音量設定は戻るアイコン、中央タイトル、`効果音` ラベル、左右の音量アイコン、スライダー、説明文で構成する。
- スライダーのトラックは水平線、現在値は青いノブで示す。説明文は Small でセカンダリー色を使ってよいが、音量説明のように任意でヒント扱いにするときに限定する。

### Iconography

- アイコンは設定、戻る、シェブロン、トグル、音量、ホーム、本棚、貸出履歴、追加を基本セットにする。
- active アイコンは `--color-text`、inactive アイコンは `--color-middle` を使う。見た目のアイコンサイズは 20-24px、タップ領域は 44px 以上を維持する。
- アイコンは単純な塗りまたは線の形状を使い、ラベルなしでも用途が分かる慣用的な形を優先する。

### Error States

- ネットワークエラーなど画面全体を止めるエラーは、中央に大きなグレーのキャラクターイラスト、`Error` 見出し、短い説明文を置く。
- 返却失敗など画面文脈を維持できるエラーは、上部に `--color-error` の通知バーを表示し、リストと下部タブはそのまま残す。
- エラーは色だけでなく、`返却に失敗しました。` や `接続を確認してもう一度お試しください。` のような短い文言を併用する。

---

## 5. Layout Principles

スマートフォンファーストで設計する。デスクトップでは画面中央にスマホ幅のアプリフレームを置き、情報密度や導線を変えすぎない。

**Spacing Scale**

| Token | Value |
|---|---:|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

**Grid**

| Context | Rule |
|---|---|
| Mobile app width | `100vw`, max `430px` on desktop preview |
| Page padding | 22px horizontal |
| List row padding | 22px horizontal, 32px vertical |
| Header height | 44-56px plus safe area |
| Bottom tab height | 70px plus safe area |
| Tap target | Minimum 44px by 44px |
| Book cover width | 103px |
| Book info gap | 29px between cover and text |
| Bottom sheet corner radius | 20px top corners only |
| Scanner frame stroke | 10px, approximate from Figma screenshots |
| Inline return button width | Fill the text column where possible |

**Layout rules**

- 本棚と貸出履歴は同じリスト構造を使う。本棚は上部に検索窓を持ち、貸出履歴は上部に `借りている本` / `これまで借りた本` のセグメントを持つ。
- リスト行は表紙左、情報右の2カラムを維持する。返却ボタンは情報カラム内の下部に置き、表紙の高さと行内余白に合わせる。
- ボトムシートは画面下端に固定し、カメラプレビューの上に重なる。内容が増えた場合はシート内部をスクロールさせる。
- デスクトッププレビューでも主要UI幅は広げず、スマートフォン実機に近い検証面として扱う。

---

## 6. Depth & Elevation

bookbook は線と面で構成し、影を多用しない。奥行きはナビゲーション、ボトムシート、ダイアログなど操作レイヤーの区別に限定する。

| Level | Shadow | z-index |
|---|---|---:|
| Base | none | 0 |
| Sticky Navigation | none, 1px divider | 10 |
| Bottom Sheet | `0 -12px 32px rgba(0, 0, 0, 0.20)` | 30 |
| Overlay | `rgba(0, 0, 0, 0.48)` backdrop | 40 |
| Modal | `0 16px 40px rgba(0, 0, 0, 0.24)` | 50 |
| Toast | `0 8px 24px rgba(0, 0, 0, 0.18)` | 60 |

---

## 7. Do's and Don'ts

### Do

- まずバーコードを読む導線をホームの中心に置く。
- 登録済み / 未登録の状態判定後に必要なアクションだけを出す。
- 返却は借用中リストからワンタップで完了できるようにする。
- 本棚、貸出履歴、設定のような一覧画面は水平 divider と余白で整理する。
- キャラクターイラストはホーム、NO IMAGE、エラーなど意味のある状態表現に使う。
- Slack 通知を前提に、アプリ内の成功表示は短く明確にする。
- ライト / ダークの両方で本文、セカンダリーサブテキスト（必要な箇所のみ）、divider のコントラストを確認する。
- スマートフォンの文字サイズ設定と safe area を考慮する。

### Don't

- 最初に「借りる / 返す / 登録する」を選ばせるタスク指向UIに戻さない。
- 装飾的なカードを重ねたり、丸みの強いコンポーネントを多用しない。
- 蛍光イエローを広い背景や長文領域に使わない。
- 本棚だけを管理画面的な別レイアウトにしない。貸出履歴と同じリスト規則を使い、検索窓だけを主要差分にする。
- 色だけで状態を伝えない。
- Web 版で API キーや Slack webhook をクライアントに露出しない。
- React Native / Expo 固有の UI 前提を Web に持ち込まない。

---

## 8. Responsive Behavior

| Breakpoint | Min Width | Description |
|---|---:|---|
| `xs` | 0px | スマートフォン標準。全機能はこの幅で完結すること。 |
| `sm` | 640px | 中央に max 430px のアプリ幅を維持し、背景余白を出す。 |
| `md` | 768px | デスクトッププレビュー。スマホ導線を維持し、横並びレイアウトにしない。 |
| `lg` | 1024px | 管理画面化しない。スマホ実機に近い操作確認用として扱う。 |
| `xl` | 1280px | 同上。余白背景以外の主要UI幅は広げない。 |

**Responsive rules**

- iPhone SE 相当の幅でも、タブ、主要ボタン、検索入力の文字が切れないこと。
- カメラプレビューは画面幅を基準にし、下部タブと説明領域を圧迫しすぎない。
- ボトムシートはビューポート高さに収め、内容が多い場合は内部スクロールにする。
- ボトムタブは `ホーム`, `本棚`, `貸出履歴` の3項目が収まる幅を確保し、ラベルが折り返さないようにする。
- デスクトップでカメラが使えない場合も ISBN 手入力で同じ操作を検証できること。

---

## 9. Agent Prompt Guide

**Quick Reference**

- Primary color: `#1C1F22`
- Accent color: `#DEFF00`
- Light background: `#F2F2F2`
- Light surface: `#FFFFFF`
- Dark background: `#1C1F22`
- Dark surface: `#000000`
- Body text default: `--color-text` / `--color-text-dark`; `--color-text-muted`: accent subtext only (captions/hints), not for routine list metadata
- Primary font: `system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif`
- Border radius: `0px` for buttons/cards, `20px` only for bottom sheet top corners
- Base spacing unit: `4px`
- Mobile app max width: `430px`
- Bottom tabs: `ホーム`, `本棚`, `貸出履歴`
- Bottom tab height: `70px + safe area`
- Book list pattern: cover left, metadata and action right, separated by 1px divider
- Figma screenshot values are approximate when not backed by code tokens

**Usage Notes**

- このファイルを参照してコンポーネントを生成する際は、必ず上記のトークンを使うこと。
- Web 実装ではスマートフォン幅の操作性を最優先し、デスクトップ専用の情報設計へ変えないこと。
- bookbook の中核体験は「バーコードを読む」「必要な行動だけが出る」「Slackを通じて交流が広がる」こと。UI追加時はこの流れを妨げないこと。
- 本棚は貸出履歴と同じリスト視覚言語を使い、検索窓を主な差分にすること。
- 不明な値は現行 mobile 実装を優先し、推測で新しいブランド色や強い装飾を追加しないこと。
- **セカンダリー文字色は滥用しない**。リストの著者・日付・状態など読む情報はデフォルト色を標準とする。
