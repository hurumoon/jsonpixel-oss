import { useCallback, useRef } from "react";
import type { PaletteEntry } from "../state/types";
import { getVisibleRegion } from "../utils/canvasHelpers";

const CHECKER_LIGHT_R = 224,
  CHECKER_LIGHT_G = 224,
  CHECKER_LIGHT_B = 224;
const CHECKER_DARK_R = 192,
  CHECKER_DARK_G = 192,
  CHECKER_DARK_B = 192;
const GRID_COLOR = "#999999";

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGBColor {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function buildRgbMap(palette: PaletteEntry[]): Map<string, RGBColor> {
  const map = new Map<string, RGBColor>();
  for (const p of palette) map.set(p.key, hexToRgb(p.color));
  return map;
}

export function useCanvasRenderer(
  grid: string[][],
  canvasSize: number,
  zoom: number,
  panOffset: { x: number; y: number },
  showGrid: boolean,
  palette: PaletteEntry[],
) {
  const offscreenRef = useRef<OffscreenCanvas | null>(null);

  const render = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const rgbMap = buildRgbMap(palette);
      const { startRow, endRow, startCol, endCol } = getVisibleRegion(
        panOffset,
        zoom,
        width,
        height,
        canvasSize,
      );
      const visibleCols = endCol - startCol;
      const visibleRows = endRow - startRow;

      ctx.clearRect(0, 0, width, height);

      if (visibleCols <= 0 || visibleRows <= 0) return;

      // For small zoom (<= 4), use ImageData for pixel-level rendering (much faster)
      // For larger zoom, use fillRect (need to draw bigger squares)
      if (zoom <= 4) {
        const imgW = visibleCols * zoom;
        const imgH = visibleRows * zoom;
        if (imgW <= 0 || imgH <= 0) return;

        // Use offscreen canvas to build the image
        if (
          !offscreenRef.current ||
          offscreenRef.current.width !== imgW ||
          offscreenRef.current.height !== imgH
        ) {
          offscreenRef.current = new OffscreenCanvas(imgW, imgH);
        }
        const offCtx = offscreenRef.current.getContext("2d");
        if (!offCtx) return;

        const imageData = offCtx.createImageData(imgW, imgH);
        const data = imageData.data;

        for (let r = startRow; r < endRow; r++) {
          for (let c = startCol; c < endCol; c++) {
            const key = grid[r][c];
            const localR = r - startRow;
            const localC = c - startCol;

            let cr: number, cg: number, cb: number, ca: number;
            if (key === ".") {
              // Checkerboard - use cell-level pattern
              const isLight = (r + c) % 2 === 0;
              cr = isLight ? CHECKER_LIGHT_R : CHECKER_DARK_R;
              cg = isLight ? CHECKER_LIGHT_G : CHECKER_DARK_G;
              cb = isLight ? CHECKER_LIGHT_B : CHECKER_DARK_B;
              ca = 255;
            } else {
              const rgb = rgbMap.get(key);
              if (rgb) {
                cr = rgb.r;
                cg = rgb.g;
                cb = rgb.b;
                ca = 255;
              } else {
                cr = 255;
                cg = 0;
                cb = 255;
                ca = 255;
              }
            }

            // Fill the zoom x zoom block
            for (let py = 0; py < zoom; py++) {
              for (let px = 0; px < zoom; px++) {
                const idx = ((localR * zoom + py) * imgW + (localC * zoom + px)) * 4;
                data[idx] = cr;
                data[idx + 1] = cg;
                data[idx + 2] = cb;
                data[idx + 3] = ca;
              }
            }
          }
        }

        offCtx.putImageData(imageData, 0, 0);
        const destX = panOffset.x + startCol * zoom;
        const destY = panOffset.y + startRow * zoom;
        ctx.drawImage(offscreenRef.current, destX, destY);
      } else {
        // Larger zoom: fillRect is fine, fewer cells visible
        for (let r = startRow; r < endRow; r++) {
          for (let c = startCol; c < endCol; c++) {
            const x = panOffset.x + c * zoom;
            const y = panOffset.y + r * zoom;
            const key = grid[r][c];

            if (key === ".") {
              const cSize = Math.max(1, Math.floor(zoom / 2));
              for (let cy = 0; cy < zoom; cy += cSize) {
                for (let cx = 0; cx < zoom; cx += cSize) {
                  const isLight = (Math.floor(cy / cSize) + Math.floor(cx / cSize)) % 2 === 0;
                  ctx.fillStyle = isLight
                    ? `rgb(${CHECKER_LIGHT_R},${CHECKER_LIGHT_G},${CHECKER_LIGHT_B})`
                    : `rgb(${CHECKER_DARK_R},${CHECKER_DARK_G},${CHECKER_DARK_B})`;
                  ctx.fillRect(
                    x + cx,
                    y + cy,
                    Math.min(cSize, zoom - cx),
                    Math.min(cSize, zoom - cy),
                  );
                }
              }
            } else {
              const rgb = rgbMap.get(key);
              ctx.fillStyle = rgb ? `rgb(${rgb.r},${rgb.g},${rgb.b})` : "#FF00FF";
              ctx.fillRect(x, y, zoom, zoom);
            }
          }
        }
      }

      // Grid lines
      if (showGrid && zoom >= 4) {
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let c = startCol; c <= endCol; c++) {
          const x = panOffset.x + c * zoom;
          ctx.moveTo(x, panOffset.y + startRow * zoom);
          ctx.lineTo(x, panOffset.y + endRow * zoom);
        }
        for (let r = startRow; r <= endRow; r++) {
          const y = panOffset.y + r * zoom;
          ctx.moveTo(panOffset.x + startCol * zoom, y);
          ctx.lineTo(panOffset.x + endCol * zoom, y);
        }
        ctx.stroke();
      }

      // Canvas border
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.strokeRect(panOffset.x, panOffset.y, canvasSize * zoom, canvasSize * zoom);
    },
    [grid, canvasSize, zoom, panOffset, showGrid, palette],
  );

  return render;
}
