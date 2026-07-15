# Frontend Directory Structure

`apps/web/src` 配下の配置判断を定義する。現状の構成ではなく、目指す配置を定義する。

## 原則

```txt
_components     = 何を画面に置くか。page は画面単位の reader / usecase / mapper / types を持てる
_models         = アプリケーション内で扱うドメイン概念（entity / value object / id）
_usecases       = 複数 page / feature で共有する application usecase とその部品
_repositories   = サーバー API（`/api/*`）の adapter
_foundation     = 画面を成立させる仕組み
_libs           = 外部ライブラリの入口・薄い adapter
packages/utils  = 外部依存を持たない純粋な utility
```

- 特定 component 専用の補助関数は近くの `_internal` に閉じる
- `_foundation` は特定 page / feature / ui を知らない
- `_repositories` は `_components` を知らない。必要な抽象は `_usecases/**/ports.ts` に置く
- page 固有のユースケースは `_components/page/<Screen>/` に置いてよい。ただし外部 API の詳細や repository 実装には依存しない
- 複数 page / feature で共有する取得・検証・command・policy・DTO 変換は `_usecases/<domain>` に置く
- `utils`, `common`, `core` のような曖昧な置き場は作らない

## 依存方向

```txt
_components/app/** (composition root)
  → _components/page/** (画面シェル)
  → _repositories/** (具象 repository の生成は _components/app/repositories.ts の createRepositories で行い、main.tsx から注入する)

_components/page/** (page reader / usecase)
  → _usecases/**/ports.ts | queries.ts | commands.ts | policies.ts | mapper.ts | schema.ts
  → _models/**
  → _components/feature/** | ui/**

_repositories/**
  → _usecases/**/ports.ts
  → _models/**
  → _libs/** | _foundation/**
```

- ルーティングは React Router（declarative mode）。URL がタブ状態の単一の真実で、app root（`_components/app/App.tsx`）の `<Routes>` が URL に応じて `page/<Screen>` を切り替える
- composition root は `_components/app`。具象 repository / gateway の生成・注入はここに集約する
- page reader は repository port に依存し、repository 実装には依存しない
- repository 実装は application 側の port を実装する adapter として扱う
- `_usecases` は domain 単位（例: `book`）で切る。flow 名での分割は、既存 domain に収めると責務が曖昧になる場合だけ検討する
- `_models` は `_usecases`, `_repositories`, `_components`, `_foundation` を知らない

## Decision Flow

### component

```txt
アプリ起動・router・manifest・context？
  → _components/app

タブ（URL 相当）に対応する画面？
  → _components/page

特定ドメインの文脈や状態に依存する複合 UI？
  → _components/feature

文脈非依存で表示を持つ再利用 UI？
  → _components/ui

画面に置くものではなく、画面を成立させる仕組み？
  → _foundation
```

### helper / application logic

```txt
特定 component 専用？
  → その component の _internal

ページ固有の取得・合成・表示条件？
  → _components/page/<Screen>/reader.ts

ページ固有の更新・実行系ユースケース？
  → _components/page/<Screen>/usecase.ts

ページ固有の UI props 変換？
  → _components/page/<Screen>/mapper.ts

画面 hook の組み立て？
  → _components/page/<Screen>/useXxxScreen.ts（肥大化したら hooks/ に分割）

ドメイン概念（entity / value object / id）？
  → _models/<domain>

application が必要とする repository / gateway の抽象？
  → _usecases/<domain>/ports.ts

複数 page / feature で共有する読み取り処理？
  → _usecases/<domain>/queries.ts

複数 page / feature で共有する更新処理？（例: checkoutBook / returnBook）
  → _usecases/<domain>/commands.ts

認可・可視性・状態遷移などの共有判断ルール？
  → _usecases/<domain>/policies.ts

サーバー API adapter？
  → _repositories/<resource>

外部依存なしの純粋関数？
  → packages/utils

browser API / storage / Service Worker？
  → _foundation

外部ライブラリの薄い adapter？（例: html5-qrcode）
  → _libs
```

## `_components`

### `app`

アプリ起点の runtime。app root・Context・manifest・router・アプリ全体に関わるレイアウト系（`BottomTabs` など、app root だけが使うもの）を置く。page から使う文脈非依存のレイアウト部品（`Header` など）は `ui` に置き、page → app の依存を作らない。composition root として具象 repository / gateway の生成・注入もここで行う。

Context は関心ごとに分ける。

- `AppStateContext` — UI 状態（タブ・拠点・音量・テーマ）と `useAppState()`
- `AuthContext` — 認証状態と `useAuth()`（HTTP / mock の別は `AuthProvider` の props で受ける）
- `config.ts` — 環境（`VITE_APP_PROFILE`）から `AppConfig` を解決する純関数 `resolveAppConfig`。プロファイルは `production` / `mock` の名前付きで、常に整合した完全な構成を表す（repo 単位の部分差し替えはしない）。不明値は throw、未設定は dev のみ mock にフォールバック
- `repositories.ts` — `createRepositories(config)` ファクトリ。具象 Repository / Gateway と `HttpClient`（`_foundation/http/client.ts`）を生成する。モジュール副作用でシングルトンを作らない
- `AppProviders` — 上記 Provider の合成。`config` / `repositories` は `main.tsx` で組み立てて props で受け取る

### `page`

タブ / 画面に対応する page module。`_components/app` が routing と依存注入を、`page/<Screen>` が画面内容の組み立てを担当する。

```txt
page/<Screen>/            # PascalCase（Home / Library / CheckoutHistory / Settings / Login）
  index.tsx               # 画面シェル（配線・組み立てのみ、目安 80 行以下）
  useXxxScreen.ts         # 画面 hook の組み立て
  reader.ts               # ページ固有の取得・合成・表示条件
  usecase.ts              # ページ固有の更新・実行系ユースケース
  mapper.ts               # usecase output → UI props 変換
  types.ts                # 画面 UI props / ViewModel の型
  _internal/              # その画面だけの見た目（画面外から import しない）
```

page reader / usecase のルール:

- repository の具象実装ではなく `_usecases/**/ports.ts` の port に依存する
- 複数 domain の port / query / command / policy を合成してよい
- 外部 API の endpoint, query string, response 型などの詳細を持たない
- UI class / JSX / CSS 都合の整形は `mapper.ts` に寄せる
- 複数 page / feature で共有される取得・検証・更新・判断は `_usecases/**` へ切り出す

`index.tsx` の責務:

- hook の呼び出し、子コンポーネントの組み立て、モーダル系（`Dialog` / `BottomSheet` / `Toast`）の表示制御
- 画面固有の JSX を直書きせず、`_internal/` に委譲する

画面固有のインフラ（例: `Home/barcode/`）:

- その画面だけが使う adapter・外部ライブラリのラッパは `page/<Screen>/` 直下にコロケーションする（`_internal` は UI 向け）
- `html5-qrcode` など重い依存は adapter ファイルに閉じ、`_components/app` や `_foundation` へ載せない

### `feature`

特定ドメインの文脈や状態に依存する複合 UI。ドメイン型を props に受け、画面内の意味ある機能単位を構成する（例: `feature/book` の `BookItem` / `BookCover`）。複数の `ui` を組み合わせてよい。

application usecase / 業務フローは置かない。画面に閉じる処理は `_components/page/<Screen>`、複数 page / feature で共有する処理は `_usecases/<domain>` に置く。

### `ui`

文脈非依存で表示を持つ再利用 UI。以下をすべて満たす。

- 2 画面以上で使う、または使う見込みが明確
- アプリの枠ではなく、コンテンツ内の部品（`Dialog` / `ListPlaceholder` / `Toast` など）
- props に `Book` / `History` などドメイン型を含めない（文字列・`ReactNode`・汎用コールバックのみ）
- `_repositories` / `_usecases` / `app` / `page` / `feature` を import しない

`ui` に置かないもの:

- ページ固有の見た目・文言
- app runtime / provider
- 取得データの store

## `_models`

アプリケーション内で扱うドメイン概念を置く（例: `book` / `history`）。

- entity / value object / branded id など、外部 API や UI に依存しない型と生成関数
- 外部 API の response 型、UI props は置かない
- repository port は、API の endpoint 都合で横断的になり得るため原則 `_usecases/**/ports.ts` に置く

## `_usecases`

複数 page / feature で共有する application usecase とその部品を置く。

ユースケース実体の置き場はスコープで決める。画面に閉じる取得・合成・判断・更新は `_components/page/<Screen>` に置く。複数 page / feature で共有する取得・検証・command・policy・DTO 変換は `_usecases/<domain>` に置く。

分ける場合の標準:

- `ports.ts`: application が必要とする repository / gateway の抽象。実装は `_repositories` に置く
- `queries.ts`: 共有される読み取り処理。repository port を受け取り、取得条件や policy を適用する
- `commands.ts`: 共有される作成・更新・削除などの更新処理（例: `checkoutBook` / `returnBook` / `restockBook`）
- `policies.ts`: 認可・可視性・状態遷移などの判断ルール
- `schema.ts`: usecase / query / command の入出力 DTO
- `mapper.ts`: model から DTO への変換

注意:

- usecase / query / command は repository 実装を `new` しない（生成は `_components/app/repositories.ts` の `createRepositories`、注入は `main.tsx` → props → Context で行う）
- `_usecases` の hooks は `_components/app` を import せず、`_usecases/deps.ts` の Context（`useUsecaseDeps`）経由で repository / gateway / location を受け取る。Provider への具象注入は `_components/app/AppProviders.tsx` が行う
- 外部サービス名ではなく、application が必要とする能力で port を切る

## `_repositories`

サーバー API（`/api/*`）の adapter を置く。

- `_usecases/**/ports.ts` の port を実装する
- endpoint, query string, response schema を閉じ込める
- 外部 response から `_models` への変換は repository 配下の `mappers.ts` に置く
- `_components` には依存しない

## `_foundation`

UI やページ文脈を持たない、画面表現を成立させる基盤。

代表例:

- `browser`: storage（`appPreferencesStorage`）、Service Worker 登録など browser API のラッパ
- `resources`: API base URL などの定数、fetch / cache の基盤

## `_libs`

外部ライブラリの入口・薄い adapter。re-export やオプション固定など、プロジェクトへの接続口に限定する。外部ライブラリを使ったプロジェクト基盤は `_foundation` に置く。**現状ディレクトリは未作成**（該当する adapter がまだない）。最初の adapter を置くタイミングで作成する。

代表例:

- `html5-qrcode` の adapter（現状は `page/Home/barcode/` にコロケーション。他画面で使うようになったら `_libs` へ昇格する）

## `packages/utils`

外部依存を持たない純粋 utility のみ置く。DOM / React / `apps/web` 固有設定に依存しない。`Result` 型もここに置く（`result.ts`）。

## Store

ドメインデータの store は `_foundation` / `_components/app` に置かない。

- 特定 feature だけ → `_components/feature/**/_internal` or `store.ts`
- 特定 page だけ → `page/<Screen>/store.ts`
- 複数 page / feature 共有 → 既存の model / usecase / repository 層を確認し、なければ設計相談
- グローバル UI 状態・認証 → `_components/app`

サーバーデータのキャッシュは SWR に寄せ、独自 store を作らない。

## テスト戦略との関係

低コスト高効果を優先し、重要なユーザー導線を `apps/web` の統合テスト（React Testing Library + Vitest、`environment: 'jsdom'`）中心で守る。UI 単体テストは大量に作らない。

- 純粋関数・変換・状態遷移（`_models` / `_usecases` / mapper）→ Vitest 単体テスト
- 見た目の状態差分 → 必要に応じて Storybook（`_components/ui` から追加）
- 実ブラウザ依存の確認 → 少数の E2E に絞る

API モックは MSW を当面採用せず、`fetch` を Vitest でスタブする（`apps/web/src/test/stubAuthFetch.ts`）。統合テストは `apps/web/src/test/testDeps.ts` の `createTestDeps(profile)` で `config` / `repositories` を組み立てて `<App {...deps} />` に props 注入する（既定は `mock` プロファイル。認証フロー検証は `createTestDeps('production')` + fetch スタブ）。Vitest の `test.env` は `VITE_APP_PROFILE=mock` を既定にする。
