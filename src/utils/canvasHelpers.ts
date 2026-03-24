export function screenToGrid(
  mouseX: number,
  mouseY: number,
  panOffset: { x: number; y: number },
  zoom: number,
): { row: number; col: number } {
  return {
    col: Math.floor((mouseX - panOffset.x) / zoom),
    row: Math.floor((mouseY - panOffset.y) / zoom),
  };
}

export function getVisibleRegion(
  panOffset: { x: number; y: number },
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
  canvasSize: number,
): { startRow: number; endRow: number; startCol: number; endCol: number } {
  const startCol = Math.max(0, Math.floor(-panOffset.x / zoom));
  const startRow = Math.max(0, Math.floor(-panOffset.y / zoom));
  const endCol = Math.min(canvasSize, Math.ceil((viewportWidth - panOffset.x) / zoom));
  const endRow = Math.min(canvasSize, Math.ceil((viewportHeight - panOffset.y) / zoom));
  return { startRow, endRow, startCol, endCol };
}

export function bresenhamLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { row: number; col: number }[] {
  const points: { row: number; col: number }[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ row: y0, col: x0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return points;
}
