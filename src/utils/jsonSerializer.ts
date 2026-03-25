import type { DotArtJson, LayeredDotArtJson, PaletteEntry, Layer } from "../state/types";

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

export function layersToJson(layers: Layer[], palette: PaletteEntry[]): LayeredDotArtJson {
  const usedKeys = new Set<string>();
  for (const layer of layers) {
    for (const row of layer.grid) {
      for (const cell of row) {
        if (cell !== ".") usedKeys.add(cell);
      }
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
    layers: layers.map((l) => ({
      name: l.name,
      visible: l.visible,
      rows: l.grid.map((row) => row.join("")),
    })),
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

  // Detect layered format
  if ("layers" in obj && Array.isArray(obj.layers)) {
    return validateLayeredDotArtJson(json);
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

export function validateLayeredDotArtJson(json: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!json || typeof json !== "object") {
    return { valid: false, errors: ["JSONオブジェクトではありません"] };
  }
  const obj = json as Record<string, unknown>;
  if (!obj.palette || typeof obj.palette !== "object" || Array.isArray(obj.palette)) {
    errors.push("paletteが不正です");
    return { valid: false, errors };
  }
  if (!Array.isArray(obj.layers) || obj.layers.length === 0) {
    errors.push("layersが不正です");
    return { valid: false, errors };
  }

  const palette = obj.palette as Record<string, string>;
  if ("." in palette) {
    errors.push("paletteに'.'は使用できません");
  }
  for (const [key, color] of Object.entries(palette)) {
    if (key.length !== 1) errors.push(`パレットキー '${key}' は1文字である必要があります`);
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) errors.push(`不正なカラー: ${color}`);
  }

  const layersArr = obj.layers as Record<string, unknown>[];
  // Use first layer to determine size
  const firstLayer = layersArr[0];
  if (!firstLayer || !Array.isArray(firstLayer.rows) || (firstLayer.rows as string[]).length === 0) {
    errors.push("layers[0]のrowsが不正です");
    return { valid: false, errors };
  }
  const firstRows = firstLayer.rows as string[];
  const width = firstRows[0].length;
  const expectedSize = firstRows.length;

  if (width !== expectedSize) {
    errors.push(`正方形ではありません (${width}x${expectedSize})`);
  }

  for (let li = 0; li < layersArr.length; li++) {
    const layer = layersArr[li];
    if (!layer || typeof layer !== "object") {
      errors.push(`layers[${li}]が不正です`);
      continue;
    }
    if (typeof layer.name !== "string") {
      errors.push(`layers[${li}].nameが不正です`);
    }
    if (typeof layer.visible !== "boolean") {
      errors.push(`layers[${li}].visibleが不正です`);
    }
    if (!Array.isArray(layer.rows)) {
      errors.push(`layers[${li}].rowsが不正です`);
      continue;
    }
    const rows = layer.rows as string[];
    if (rows.length !== expectedSize) {
      errors.push(`layers[${li}]のサイズが不一致 (${rows.length} != ${expectedSize})`);
    }
    for (let i = 0; i < rows.length; i++) {
      if (typeof rows[i] !== "string") {
        errors.push(`layers[${li}].rows[${i}]が文字列ではありません`);
        continue;
      }
      if (rows[i].length !== width) {
        errors.push(`layers[${li}].rows[${i}]の長さが不一致 (${rows[i].length} != ${width})`);
      }
      for (const ch of rows[i]) {
        if (ch !== "." && !(ch in palette)) {
          errors.push(`未定義のキー '${ch}' がlayers[${li}].rows[${i}]にあります`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function isLayeredJson(json: unknown): json is LayeredDotArtJson {
  if (!json || typeof json !== "object") return false;
  return "layers" in (json as Record<string, unknown>);
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
