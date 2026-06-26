# JsonPixel

JsonPixel は、ブラウザ上でドット絵を作成し、コンパクトな JSON として扱える React 製のドット絵エディタです。レイヤー、カスタムパレット、グリッド表示、PNG/SVG/JSON エクスポートに対応しています。

公開 URL: https://pixelpassion.jp/JsonPixel/

## 主な機能

- ペン、消しゴム、塗りつぶし、スポイトによるドット編集
- レイヤーの追加、削除、表示切り替え、並び替え、下レイヤーへの結合
- パレット色の追加、削除、編集
- キャンバスサイズ変更
- グリッド表示、太線グリッド表示
- ズーム、パン、タッチ操作でのピンチズーム
- Undo / Redo
- JSON のインポート、エクスポート、コピー、ファイル読み込み
- PNG / SVG のダウンロード
- 編集状態の localStorage 自動保存

## セットアップ

```bash
npm install
npm run dev
```

開発サーバー起動後、Vite が表示するローカル URL をブラウザで開いてください。

## 利用できる npm scripts

```bash
npm run dev           # 開発サーバーを起動
npm run build         # TypeScript チェック後に本番ビルド
npm run preview       # ビルド済みアプリをローカル確認
npm run lint          # ESLint を実行
npm run format        # src 配下の TS/TSX/CSS を Prettier で整形
npm run format:check  # フォーマット差分を確認
npm run test          # Vitest を一回実行
npm run test:watch    # Vitest を watch モードで実行
```

## 操作

| 操作 | 内容 |
| --- | --- |
| `B` | ペン |
| `E` | 消しゴム |
| `G` | 塗りつぶし |
| `I` | スポイト |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Y` / `Cmd+Y` | Redo |
| マウスホイール | ズーム |
| 中ボタン / 右ボタンドラッグ | パン |
| 2 本指タッチ | ピンチズーム / パン |

## JSON フォーマット

JsonPixel の基本フォーマットは `palette` と `rows` で構成されます。`.` は透明ピクセルを表し、パレットには登録しません。

```json
{
  "palette": {
    "R": "#FF0000",
    "W": "#FFFFFF"
  },
  "rows": [
    ".RR..RR.",
    "RRRRRRRR",
    "RRRRRRRR",
    ".RRRRRR.",
    "..RRRR..",
    "...RR...",
    "........",
    "........"
  ]
}
```

### バリデーションルール

- `palette` は 1 文字のキーと `#RRGGBB` 形式の色で構成します。
- `.` は透明ピクセル専用のため、`palette` のキーには使えません。
- `rows` は文字列配列です。
- すべての行は同じ長さである必要があります。
- キャンバスは正方形です。
- `rows` 内で使う文字は、`.` または `palette` に定義済みのキーである必要があります。

## レイヤー付き JSON

複数レイヤーがある場合は `layers` 形式でエクスポートされます。各レイヤーは `name`、`visible`、`rows` を持ちます。

```json
{
  "palette": {
    "K": "#000000",
    "Y": "#FFFF00"
  },
  "layers": [
    {
      "name": "Line",
      "visible": true,
      "rows": [
        "........",
        "..KKKK..",
        ".K....K.",
        ".K....K.",
        ".K....K.",
        "..KKKK..",
        "........",
        "........"
      ]
    },
    {
      "name": "Fill",
      "visible": true,
      "rows": [
        "........",
        "...YY...",
        "..YYYY..",
        "..YYYY..",
        "..YYYY..",
        "...YY...",
        "........",
        "........"
      ]
    }
  ]
}
```

## 制限値

| 項目 | 値 |
| --- | --- |
| サイズ変更 UI | 10 から 1000 |
| Undo 履歴 | 最大 50 件 |
| パレット | 最大 62 色 |
| レイヤー名 | 最大 50 文字 |
| PNG 書き出し | 長辺 512px 目標 |

## プロジェクト構成

```text
src/
  components/       UI コンポーネント
  hooks/            キャンバス描画・入力処理
  state/            エディタ状態と reducer
  utils/            JSON 変換、塗りつぶし、PNG/SVG 書き出し
  __tests__/        ユーティリティと reducer のテスト
```

## 技術スタック

- React
- TypeScript
- Vite
- Vitest
- Testing Library
- ESLint
- Prettier

## 関連ファイル

- `SKILL.md`: ドット絵 JSON を生成・解釈するための Claude Skill 定義
- `ハート.json`: サンプル JSON
