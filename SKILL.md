---
name: dotart-json
description: Generate or interpret dot art (pixel art) in the compact palette+rows JSON format. Use this skill whenever the user asks to create pixel art as JSON, convert a description into dot art JSON, draw something in dot art format, generate a sprite or icon as JSON, or asks Claude to "write" / "make" / "describe" pixel art. Also trigger when the user wants to visualize or validate an existing dot art JSON, or asks what a dot art JSON looks like.
---

# ドット絵JSON生成スキル

このスキルはドット絵をトークン効率の高いJSONフォーマットで生成・解釈する。

---

## フォーマット仕様

### 基本構造

```json
{
  "palette": {
    "R": "#FF0000",
    "G": "#00FF00",
    "B": "#0000FF"
  },
  "rows": [
    "..RR.RR...",
    ".RRRRRRR..",
    "RRRRRRRRRR"
  ]
}
```

### ルール

| 項目 | 仕様 |
|------|------|
| `palette` | 1文字キー → HEXカラー文字列 のマップ |
| `rows` | 各行を文字列で表現した配列 |
| 透明セル | `.`（ドット）で表現。パレットに定義不要 |
| サイズ推定 | `width = rows[0].length`, `height = rows.length` |
| バリデーション | 全行の長さが一致しなければエラー |
| キャンバス | 正方形を基本とする（width == height） |

### パレットキーの命名規則

- 1文字推奨（トークン節約のため）
- 色を連想しやすいアルファベット大文字を使う
  - `R` = 赤, `G` = 緑, `B` = 青, `W` = 白, `K` = 黒, `Y` = 黄, `P` = 紫, `O` = オレンジ
- `.` はパレットキーとして使用禁止（透明予約済み）

---

## 生成手順

1. **題材を決める**（指定がなければシンプルな図形・アイコン）
2. **パレットを決める**（必要な色だけ定義）
3. **rowsを描く**（行文字列として1行ずつ構成）
4. **バリデーション**：全行の長さが揃っているか確認する
5. **出力**：JSONとして整形して返す

---

## トークン効率について

8×8ピクセルで比較した場合の参考値：

| フォーマット | トークン数 |
|-------------|-----------|
| フラット配列 `[{x,y,color}]` | ~787 |
| 座標キー `{"x,y": color}` | ~449 |
| 2D配列（生色） | ~205 |
| パレット + 2D配列 | ~156 |
| **パレット + 行文字列（本フォーマット）** | **~62** |

行文字列方式は配列括弧・カンマのオーバーヘッドがなく、透明セルが多い場合も少ない場合も一貫して最も効率が高い。

---

## 生成例

### ハート（10×10）

```json
{
  "palette": {"R": "#FF0000"},
  "rows": [
    "..RR.RR...",
    ".RRRRRRR..",
    ".RRRRRRR..",
    "RRRRRRRRRR",
    "RRRRRRRRRR",
    ".RRRRRRRRR",
    "..RRRRRRRR",
    "...RRRRRR.",
    "....RRRR..",
    ".....RR..."
  ]
}
```

### スマイリー（8×8）

```json
{
  "palette": {"Y": "#FFFF00", "K": "#000000"},
  "rows": [
    ".YYYYYY.",
    "YYKYYKYY",
    "YYYYYYYY",
    "YKYYYY KY",
    "YYKKKKYYY",
    "YYYYYYYY",
    ".YYYYYY.",
    "..YYYY.."
  ]
}
```

---

## バリデーションチェックリスト

生成後に必ず確認：

- [ ] 全行の文字数が同じ
- [ ] パレットに`.`が含まれていない
- [ ] rowsに使われている文字がすべてパレットに定義されている（`.`以外）
- [ ] HEXカラーが正しい形式（`#RRGGBB`）
