import type { DotArtJson, LayeredDotArtJson, PaletteEntry, Layer } from "../state/types";
import { STRINGS } from "../strings";

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
    return { valid: false, errors: [STRINGS.ERR_NOT_OBJECT] };
  }
  const obj = json as Record<string, unknown>;
  if (!obj.palette || typeof obj.palette !== "object" || Array.isArray(obj.palette)) {
    errors.push(STRINGS.ERR_INVALID_PALETTE);
    return { valid: false, errors };
  }

  // Detect layered format
  if ("layers" in obj && Array.isArray(obj.layers)) {
    return validateLayeredDotArtJson(json);
  }

  if (!Array.isArray(obj.rows) || obj.rows.length === 0) {
    errors.push(STRINGS.ERR_INVALID_ROWS);
    return { valid: false, errors };
  }
  const rows = obj.rows as string[];
  const width = rows[0].length;
  if (width !== rows.length) {
    errors.push(STRINGS.ERR_NOT_SQUARE(width, rows.length));
  }
  const palette = obj.palette as Record<string, string>;
  if ("." in palette) {
    errors.push(STRINGS.ERR_DOT_IN_PALETTE);
  }
  for (const [key, color] of Object.entries(palette)) {
    if (key.length !== 1) errors.push(STRINGS.ERR_KEY_NOT_SINGLE_CHAR(key));
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) errors.push(STRINGS.ERR_INVALID_COLOR(color));
  }
  for (let i = 0; i < rows.length; i++) {
    if (typeof rows[i] !== "string") {
      errors.push(STRINGS.ERR_ROW_NOT_STRING(i));
      continue;
    }
    if (rows[i].length !== width) {
      errors.push(STRINGS.ERR_ROW_LENGTH_MISMATCH(i, rows[i].length, width));
    }
    for (const ch of rows[i]) {
      if (ch !== "." && !(ch in palette)) {
        errors.push(STRINGS.ERR_UNDEFINED_KEY_IN_ROW(ch, i));
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateLayeredDotArtJson(json: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!json || typeof json !== "object") {
    return { valid: false, errors: [STRINGS.ERR_NOT_OBJECT] };
  }
  const obj = json as Record<string, unknown>;
  if (!obj.palette || typeof obj.palette !== "object" || Array.isArray(obj.palette)) {
    errors.push(STRINGS.ERR_INVALID_PALETTE);
    return { valid: false, errors };
  }
  if (!Array.isArray(obj.layers) || obj.layers.length === 0) {
    errors.push(STRINGS.ERR_INVALID_LAYERS);
    return { valid: false, errors };
  }

  const palette = obj.palette as Record<string, string>;
  if ("." in palette) {
    errors.push(STRINGS.ERR_DOT_IN_PALETTE);
  }
  for (const [key, color] of Object.entries(palette)) {
    if (key.length !== 1) errors.push(STRINGS.ERR_KEY_NOT_SINGLE_CHAR(key));
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) errors.push(STRINGS.ERR_INVALID_COLOR(color));
  }

  const layersArr = obj.layers as Record<string, unknown>[];
  // Use first layer to determine size
  const firstLayer = layersArr[0];
  if (!firstLayer || !Array.isArray(firstLayer.rows) || (firstLayer.rows as string[]).length === 0) {
    errors.push(STRINGS.ERR_INVALID_FIRST_LAYER_ROWS);
    return { valid: false, errors };
  }
  const firstRows = firstLayer.rows as string[];
  const width = firstRows[0].length;
  const expectedSize = firstRows.length;

  if (width !== expectedSize) {
    errors.push(STRINGS.ERR_NOT_SQUARE(width, expectedSize));
  }

  for (let li = 0; li < layersArr.length; li++) {
    const layer = layersArr[li];
    if (!layer || typeof layer !== "object") {
      errors.push(STRINGS.ERR_INVALID_LAYER(li));
      continue;
    }
    if (typeof layer.name !== "string") {
      errors.push(STRINGS.ERR_INVALID_LAYER_NAME(li));
    }
    if (typeof layer.visible !== "boolean") {
      errors.push(STRINGS.ERR_INVALID_LAYER_VISIBLE(li));
    }
    if (!Array.isArray(layer.rows)) {
      errors.push(STRINGS.ERR_INVALID_LAYER_ROWS(li));
      continue;
    }
    const rows = layer.rows as string[];
    if (rows.length !== expectedSize) {
      errors.push(STRINGS.ERR_LAYER_SIZE_MISMATCH(li, rows.length, expectedSize));
    }
    for (let i = 0; i < rows.length; i++) {
      if (typeof rows[i] !== "string") {
        errors.push(STRINGS.ERR_LAYER_ROW_NOT_STRING(li, i));
        continue;
      }
      if (rows[i].length !== width) {
        errors.push(STRINGS.ERR_LAYER_ROW_LENGTH_MISMATCH(li, i, rows[i].length, width));
      }
      for (const ch of rows[i]) {
        if (ch !== "." && !(ch in palette)) {
          errors.push(STRINGS.ERR_UNDEFINED_KEY_IN_LAYER_ROW(ch, li, i));
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
