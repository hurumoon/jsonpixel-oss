import type { DotArtJson, PaletteEntry } from "../state/types";

export function gridToJson(grid: string[][], palette: PaletteEntry[]): DotArtJson {
  const usedKeys = new Set<string>();
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== ".") usedKeys.add(cell);
    }
  }
  const paletteMap: Record<string, string> = {};
  for (const entry of palette) {
    if (usedKeys.has(entry.key)) {
      paletteMap[entry.key] = entry.color;
    }
  }
  return {
    palette: paletteMap,
    rows: grid.map((row) => row.join("")),
  };
}

export function validateDotArtJson(json: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!json || typeof json !== "object") {
    return { valid: false, errors: ["JSONオブジェクトではありません"] };
  }
  const obj = json as Record<string, unknown>;
  if (!obj.palette || typeof obj.palette !== "object" || Array.isArray(obj.palette)) {
    errors.push("paletteが不正です");
    return { valid: false, errors };
  }
  if (!Array.isArray(obj.rows) || obj.rows.length === 0) {
    errors.push("rowsが不正です");
    return { valid: false, errors };
  }
  const rows = obj.rows as string[];
  const width = rows[0].length;
  if (width !== rows.length) {
    errors.push(`正方形ではありません (${width}x${rows.length})`);
  }
  const palette = obj.palette as Record<string, string>;
  if ("." in palette) {
    errors.push("paletteに'.'は使用できません");
  }
  for (const [key, color] of Object.entries(palette)) {
    if (key.length !== 1) errors.push(`パレットキー '${key}' は1文字である必要があります`);
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) errors.push(`不正なカラー: ${color}`);
  }
  for (let i = 0; i < rows.length; i++) {
    if (typeof rows[i] !== "string") {
      errors.push(`row[${i}]が文字列ではありません`);
      continue;
    }
    if (rows[i].length !== width) {
      errors.push(`row[${i}]の長さが不一致 (${rows[i].length} != ${width})`);
    }
    for (const ch of rows[i]) {
      if (ch !== "." && !(ch in palette)) {
        errors.push(`未定義のキー '${ch}' がrow[${i}]にあります`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function jsonToGrid(json: DotArtJson): {
  grid: string[][];
  palette: PaletteEntry[];
  size: number;
} {
  const size = json.rows.length;
  const grid = json.rows.map((row) => {
    const chars = row.split("");
    while (chars.length < size) chars.push(".");
    return chars.slice(0, size);
  });
  const palette = Object.entries(json.palette).map(([key, color]) => ({ key, color }));
  return { grid, palette, size };
}
