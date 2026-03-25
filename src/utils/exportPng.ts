import type { PaletteEntry } from "../state/types";
import { STRINGS } from "../strings";

export function gridToPngBlob(grid: string[][], palette: PaletteEntry[], scale = 1): Promise<Blob> {
  const size = grid.length;
  const px = size * scale;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error(STRINGS.ERR_CANVAS_CONTEXT));

  const colorMap = new Map<string, string>();
  for (const p of palette) colorMap.set(p.key, p.color);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const key = grid[r][c];
      if (key === ".") continue; // transparent
      ctx.fillStyle = colorMap.get(key) ?? "#FF00FF";
      ctx.fillRect(c * scale, r * scale, scale, scale);
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(STRINGS.ERR_PNG_GENERATION));
    }, "image/png");
  });
}
