# bookbook — DESIGN.md

> AI エージェントが一貫した UI を生成するためのデザインシステム定義。
> Google Stitch DESIGN.md 規格に準拠。

---

## 1. Visual Theme & Atmosphere

<!-- デザインの方向性・ブランドの雰囲気・設計哲学を記述 -->

---

## 2. Color Palette & Roles

<!-- カラートークン: セマンティック名・HEX 値・使用用途を定義 -->

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | | |
| `--color-secondary` | | |
| `--color-background` | | |
| `--color-surface` | | |
| `--color-text` | | |
| `--color-text-muted` | | |
| `--color-border` | | |
| `--color-error` | | |
| `--color-success` | | |

---

## 3. Typography Rules

<!-- フォントファミリー・サイズスケール・ウェイト・行間 -->

| Role | Font Family | Size | Weight | Line Height |
|---|---|---|---|---|
| Display | | | | |
| Heading 1 | | | | |
| Heading 2 | | | | |
| Heading 3 | | | | |
| Body | | | | |
| Small | | | | |
| Code | | | | |

---

## 4. Component Stylings

<!-- 主要コンポーネントのスタイル定義 -->

### Buttons

### Inputs

### Cards

### Navigation

---

## 5. Layout Principles

<!-- スペーシングスケール・グリッド・余白の原則 -->

**Spacing Scale**

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |

**Grid**

<!-- Max width / Columns / Gutter / Margins -->

---

## 6. Depth & Elevation

<!-- シャドウスケール・z-index レベル -->

| Level | Shadow | z-index |
|---|---|---|
| Base | | |
| Raised | | |
| Overlay | | |
| Modal | | |

---

## 7. Do's and Don'ts

### Do

-

### Don't

-

---

## 8. Responsive Behavior

<!-- ブレークポイント・タッチターゲット・レイアウト変化 -->

| Breakpoint | Min Width | Description |
|---|---|---|
| `sm` | 640px | |
| `md` | 768px | |
| `lg` | 1024px | |
| `xl` | 1280px | |

---

## 9. Agent Prompt Guide

<!-- AI エージェント向けクイックリファレンス -->

**Quick Reference**

- Primary color:
- Background:
- Primary font:
- Border radius:
- Base spacing unit:

**Usage Notes**

- このファイルを参照してコンポーネントを生成する際は、必ず上記のトークンを使うこと
- トークンが未定義のセクションは実装時に補完してよい
