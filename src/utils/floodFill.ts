import { MAX_FILL_CELLS } from "../constants";

export interface FloodFillResult {
  cells: { row: number; col: number }[];
  limitReached: boolean;
}

export function floodFill(
  grid: string[][],
  startRow: number,
  startCol: number,
  fillKey: string,
): FloodFillResult {
  const size = grid.length;
  if (startRow < 0 || startRow >= size || startCol < 0 || startCol >= size)
    return { cells: [], limitReached: false };
  const targetKey = grid[startRow][startCol];
  if (targetKey === fillKey) return { cells: [], limitReached: false };

  const result: { row: number; col: number }[] = [];
  // Use Uint8Array for visited tracking — much more memory-efficient than Set for large grids
  const visited = new Uint8Array(size * size);
  const queue: number[] = [startRow * size + startCol];
  visited[startRow * size + startCol] = 1;

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    const r = (id / size) | 0;
    const c = id % size;
    result.push({ row: r, col: c });

    if (result.length >= MAX_FILL_CELLS) {
      return { cells: result, limitReached: true };
    }

    if (r > 0) {
      const nid = id - size;
      if (!visited[nid] && grid[r - 1][c] === targetKey) {
        visited[nid] = 1;
        queue.push(nid);
      }
    }
    if (r < size - 1) {
      const nid = id + size;
      if (!visited[nid] && grid[r + 1][c] === targetKey) {
        visited[nid] = 1;
        queue.push(nid);
      }
    }
    if (c > 0) {
      const nid = id - 1;
      if (!visited[nid] && grid[r][c - 1] === targetKey) {
        visited[nid] = 1;
        queue.push(nid);
      }
    }
    if (c < size - 1) {
      const nid = id + 1;
      if (!visited[nid] && grid[r][c + 1] === targetKey) {
        visited[nid] = 1;
        queue.push(nid);
      }
    }
  }
  return { cells: result, limitReached: false };
}
