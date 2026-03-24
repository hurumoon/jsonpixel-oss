import type { EditorState, EditorAction, PixelDiff, PaletteEntry } from "./types";

const MAX_UNDO = 50;

export function createEmptyGrid(size: number): string[][] {
  return Array.from({ length: size }, () => Array(size).fill("."));
}

export function createInitialState(size = 16): EditorState {
  return {
    canvasSize: size,
    grid: createEmptyGrid(size),
    palette: [
      { key: "K", color: "#000000" },
      { key: "W", color: "#FFFFFF" },
      { key: "R", color: "#FF0000" },
      { key: "G", color: "#00FF00" },
      { key: "B", color: "#0000FF" },
      { key: "Y", color: "#FFFF00" },
    ],
    selectedColor: "K",
    activeTool: "pen",
    showGrid: true,
    zoom: 20,
    panOffset: { x: 0, y: 0 },
    undoStack: [],
    redoStack: [],
  };
}

function applyDiffs(grid: string[][], diffs: PixelDiff[], undo: boolean): string[][] {
  const newGrid = grid.map((row) => [...row]);
  for (const d of diffs) {
    newGrid[d.row][d.col] = undo ? d.prev : d.next;
  }
  return newGrid;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_PIXEL": {
      const { row, col, key } = action;
      if (row < 0 || row >= state.canvasSize || col < 0 || col >= state.canvasSize) return state;
      if (state.grid[row][col] === key) return state;
      const diff: PixelDiff = { row, col, prev: state.grid[row][col], next: key };
      const newGrid = state.grid.map((r) => [...r]);
      newGrid[row][col] = key;
      return {
        ...state,
        grid: newGrid,
        undoStack: [...state.undoStack.slice(-(MAX_UNDO - 1)), [diff]],
        redoStack: [],
      };
    }

    case "SET_PIXELS": {
      const diffs: PixelDiff[] = [];
      const newGrid = state.grid.map((r) => [...r]);
      for (const p of action.pixels) {
        if (p.row < 0 || p.row >= state.canvasSize || p.col < 0 || p.col >= state.canvasSize)
          continue;
        if (newGrid[p.row][p.col] === p.key) continue;
        diffs.push({ row: p.row, col: p.col, prev: newGrid[p.row][p.col], next: p.key });
        newGrid[p.row][p.col] = p.key;
      }
      if (diffs.length === 0) return state;
      return {
        ...state,
        grid: newGrid,
        undoStack: [...state.undoStack.slice(-(MAX_UNDO - 1)), diffs],
        redoStack: [],
      };
    }

    case "SET_TOOL":
      return { ...state, activeTool: action.tool };

    case "SET_COLOR":
      return { ...state, selectedColor: action.key };

    case "ADD_PALETTE_ENTRY": {
      if (state.palette.some((p) => p.key === action.key)) return state;
      if (action.key === ".") return state;
      return {
        ...state,
        palette: [...state.palette, { key: action.key, color: action.color }],
      };
    }

    case "REMOVE_PALETTE_ENTRY": {
      const newPalette = state.palette.filter((p) => p.key !== action.key);
      const newGrid = state.grid.map((row) => row.map((c) => (c === action.key ? "." : c)));
      return {
        ...state,
        palette: newPalette,
        grid: newGrid,
        selectedColor:
          state.selectedColor === action.key ? (newPalette[0]?.key ?? ".") : state.selectedColor,
        undoStack: [],
        redoStack: [],
      };
    }

    case "UPDATE_PALETTE_COLOR":
      return {
        ...state,
        palette: state.palette.map((p) =>
          p.key === action.key ? { ...p, color: action.color } : p,
        ),
      };

    case "SET_CANVAS_SIZE": {
      const size = Math.max(10, Math.min(1000, action.size));
      const newGrid = createEmptyGrid(size);
      const copySize = Math.min(size, state.canvasSize);
      for (let r = 0; r < copySize; r++) {
        for (let c = 0; c < copySize; c++) {
          newGrid[r][c] = state.grid[r][c];
        }
      }
      return {
        ...state,
        canvasSize: size,
        grid: newGrid,
        undoStack: [],
        redoStack: [],
      };
    }

    case "IMPORT_JSON": {
      const { data } = action;
      const size = data.rows.length;
      const palette: PaletteEntry[] = Object.entries(data.palette).map(([key, color]) => ({
        key,
        color,
      }));
      const grid = data.rows.map((row) => row.split(""));
      return {
        ...state,
        canvasSize: size,
        grid,
        palette,
        selectedColor: palette[0]?.key ?? ".",
        undoStack: [],
        redoStack: [],
      };
    }

    case "TOGGLE_GRID":
      return { ...state, showGrid: !state.showGrid };

    case "SET_ZOOM":
      return { ...state, zoom: Math.max(1, Math.min(100, action.zoom)) };

    case "SET_PAN": {
      const totalPx = state.canvasSize * state.zoom;
      const clampedX = Math.max(-totalPx, Math.min(totalPx, action.x));
      const clampedY = Math.max(-totalPx, Math.min(totalPx, action.y));
      return { ...state, panOffset: { x: clampedX, y: clampedY } };
    }

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const diffs = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        grid: applyDiffs(state.grid, diffs, true),
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, diffs],
      };
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const diffs = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        grid: applyDiffs(state.grid, diffs, false),
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, diffs],
      };
    }

    default:
      return state;
  }
}
