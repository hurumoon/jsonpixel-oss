import type { PaletteEntry } from "../state/types";

export function gridToSvgString(grid: string[][], palette: PaletteEntry[]): string {
  const size = grid.length;
  const colorMap = new Map<string, string>();
  for (const p of palette) colorMap.set(p.key, p.color);

  // Group adjacent same-color pixels per row into runs for a more compact SVG
  const rects: string[] = [];
  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      const key = grid[r][c];
      if (key === ".") {
        c++;
        continue;
      }
      const color = colorMap.get(key) ?? "#FF00FF";
      let runLen = 1;
      while (c + runLen < size && grid[r][c + runLen] === key) {
        runLen++;
      }
      rects.push(`<rect x="${c}" y="${r}" width="${runLen}" height="1" fill="${color}"/>`);
      c += runLen;
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`,
    ...rects,
    `</svg>`,
  ].join("\n");
}

export function gridToSvgBlob(grid: string[][], palette: PaletteEntry[]): Blob {
  return new Blob([gridToSvgString(grid, palette)], { type: "image/svg+xml" });
}
