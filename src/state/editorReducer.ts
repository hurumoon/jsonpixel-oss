import type { EditorState, EditorAction, PixelDiff, PaletteEntry, Layer } from "./types";
import { MAX_UNDO, MIN_CANVAS_SIZE, MAX_CANVAS_SIZE, MIN_ZOOM, MAX_ZOOM } from "../constants";

export function createEmptyGrid(size: number): string[][] {
  return Array.from({ length: size }, () => Array(size).fill("."));
}

export function flattenLayers(layers: Layer[], size: number): string[][] {
  const grid = createEmptyGrid(size);
  for (const layer of layers) {
    if (!layer.visible) continue;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const key = layer.grid[r]?.[c];
        if (key && key !== ".") {
          grid[r][c] = key;
        }
      }
    }
  }
  return grid;
}

function createDefaultLayer(size: number, name = "Layer 1"): Layer {
  return { name, visible: true, grid: createEmptyGrid(size) };
}

export function createInitialState(size = 16): EditorState {
  const layers = [createDefaultLayer(size)];
  return {
    canvasSize: size,
    layers,
    activeLayerIndex: 0,
    grid: flattenLayers(layers, size),
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
    boldGrid: false,
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

function updateLayerGrid(layers: Layer[], layerIndex: number, newGrid: string[][]): Layer[] {
  return layers.map((l, i) => (i === layerIndex ? { ...l, grid: newGrid } : l));
}

function activeGrid(state: EditorState): string[][] {
  return state.layers[state.activeLayerIndex].grid;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_PIXEL": {
      const { row, col, key } = action;
      if (row < 0 || row >= state.canvasSize || col < 0 || col >= state.canvasSize) return state;
      const grid = activeGrid(state);
      if (grid[row][col] === key) return state;
      const diff: PixelDiff = { row, col, prev: grid[row][col], next: key };
      const newGrid = grid.map((r) => [...r]);
      newGrid[row][col] = key;
      const newLayers = updateLayerGrid(state.layers, state.activeLayerIndex, newGrid);
      return {
        ...state,
        layers: newLayers,
        grid: flattenLayers(newLayers, state.canvasSize),
        undoStack: [
          ...state.undoStack.slice(-(MAX_UNDO - 1)),
          { layerIndex: state.activeLayerIndex, diffs: [diff] },
        ],
        redoStack: [],
      };
    }

    case "SET_PIXELS": {
      const diffs: PixelDiff[] = [];
      const grid = activeGrid(state);
      const newGrid = grid.map((r) => [...r]);
      for (const p of action.pixels) {
        if (p.row < 0 || p.row >= state.canvasSize || p.col < 0 || p.col >= state.canvasSize)
          continue;
        if (newGrid[p.row][p.col] === p.key) continue;
        diffs.push({ row: p.row, col: p.col, prev: newGrid[p.row][p.col], next: p.key });
        newGrid[p.row][p.col] = p.key;
      }
      if (diffs.length === 0) return state;
      const newLayers = updateLayerGrid(state.layers, state.activeLayerIndex, newGrid);
      return {
        ...state,
        layers: newLayers,
        grid: flattenLayers(newLayers, state.canvasSize),
        undoStack: [
          ...state.undoStack.slice(-(MAX_UNDO - 1)),
          { layerIndex: state.activeLayerIndex, diffs },
        ],
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
      const newLayers = state.layers.map((layer) => ({
        ...layer,
        grid: layer.grid.map((row) => row.map((c) => (c === action.key ? "." : c))),
      }));
      return {
        ...state,
        palette: newPalette,
        layers: newLayers,
        grid: flattenLayers(newLayers, state.canvasSize),
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
      const size = Math.max(MIN_CANVAS_SIZE, Math.min(MAX_CANVAS_SIZE, action.size));
      const newLayers = state.layers.map((layer) => {
        const newGrid = createEmptyGrid(size);
        const copySize = Math.min(size, state.canvasSize);
        for (let r = 0; r < copySize; r++) {
          for (let c = 0; c < copySize; c++) {
            newGrid[r][c] = layer.grid[r][c];
          }
        }
        return { ...layer, grid: newGrid };
      });
      return {
        ...state,
        canvasSize: size,
        layers: newLayers,
        grid: flattenLayers(newLayers, size),
        undoStack: [],
        redoStack: [],
      };
    }

    case "IMPORT_JSON": {
      const { data } = action;
      const rows = data.rows.length;
      const cols = Math.max(...data.rows.map((row) => row.length));
      const size = Math.max(rows, cols);
      const palette: PaletteEntry[] = Object.entries(data.palette).map(([key, color]) => ({
        key,
        color,
      }));
      const grid = createEmptyGrid(size);
      for (let r = 0; r < rows; r++) {
        const chars = data.rows[r].split("");
        for (let c = 0; c < chars.length; c++) {
          grid[r][c] = chars[c];
        }
      }
      const newLayers: Layer[] = [{ name: "Layer 1", visible: true, grid }];
      return {
        ...state,
        canvasSize: size,
        layers: newLayers,
        activeLayerIndex: 0,
        grid: flattenLayers(newLayers, size),
        palette,
        selectedColor: palette[0]?.key ?? ".",
        undoStack: [],
        redoStack: [],
      };
    }

    case "IMPORT_LAYERED_JSON": {
      const { data } = action;
      const firstRows = data.layers[0]?.rows ?? [];
      const rows = firstRows.length;
      const cols = rows > 0 ? Math.max(...firstRows.map((row) => row.length)) : 0;
      const size = Math.max(rows, cols);
      const palette: PaletteEntry[] = Object.entries(data.palette).map(([key, color]) => ({
        key,
        color,
      }));
      const newLayers: Layer[] = data.layers.map((l) => {
        const grid = createEmptyGrid(size);
        for (let r = 0; r < l.rows.length; r++) {
          const chars = l.rows[r].split("");
          for (let c = 0; c < chars.length; c++) {
            grid[r][c] = chars[c];
          }
        }
        return { name: l.name, visible: l.visible, grid };
      });
      if (newLayers.length === 0) {
        newLayers.push(createDefaultLayer(size));
      }
      return {
        ...state,
        canvasSize: size,
        layers: newLayers,
        activeLayerIndex: 0,
        grid: flattenLayers(newLayers, size),
        palette,
        selectedColor: palette[0]?.key ?? ".",
        undoStack: [],
        redoStack: [],
      };
    }

    case "TOGGLE_GRID":
      return { ...state, showGrid: !state.showGrid };

    case "TOGGLE_BOLD_GRID":
      return { ...state, boldGrid: !state.boldGrid };

    case "SET_ZOOM":
      return { ...state, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, action.zoom)) };

    case "SET_PAN": {
      const totalPx = state.canvasSize * state.zoom;
      const clampedX = Math.max(-totalPx, Math.min(totalPx, action.x));
      const clampedY = Math.max(-totalPx, Math.min(totalPx, action.y));
      return { ...state, panOffset: { x: clampedX, y: clampedY } };
    }

    case "SET_VIEW": {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, action.zoom));
      const total = state.canvasSize * newZoom;
      const cx = Math.max(-total, Math.min(total, action.x));
      const cy = Math.max(-total, Math.min(total, action.y));
      return { ...state, zoom: newZoom, panOffset: { x: cx, y: cy } };
    }

    case "CLEAR_CANVAS": {
      const grid = activeGrid(state);
      const diffs: PixelDiff[] = [];
      for (let r = 0; r < state.canvasSize; r++) {
        for (let c = 0; c < state.canvasSize; c++) {
          if (grid[r][c] !== ".") {
            diffs.push({ row: r, col: c, prev: grid[r][c], next: "." });
          }
        }
      }
      if (diffs.length === 0) return state;
      const newLayers = updateLayerGrid(
        state.layers,
        state.activeLayerIndex,
        createEmptyGrid(state.canvasSize),
      );
      return {
        ...state,
        layers: newLayers,
        grid: flattenLayers(newLayers, state.canvasSize),
        undoStack: [
          ...state.undoStack.slice(-(MAX_UNDO - 1)),
          { layerIndex: state.activeLayerIndex, diffs },
        ],
        redoStack: [],
      };
    }

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const entry = state.undoStack[state.undoStack.length - 1];
      const layerGrid = state.layers[entry.layerIndex].grid;
      const newGrid = applyDiffs(layerGrid, entry.diffs, true);
      const newLayers = updateLayerGrid(state.layers, entry.layerIndex, newGrid);
      return {
        ...state,
        layers: newLayers,
        grid: flattenLayers(newLayers, state.canvasSize),
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, entry],
      };
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const entry = state.redoStack[state.redoStack.length - 1];
      const layerGrid = state.layers[entry.layerIndex].grid;
      const newGrid = applyDiffs(layerGrid, entry.diffs, false);
      const newLayers = updateLayerGrid(state.layers, entry.layerIndex, newGrid);
      return {
        ...state,
        layers: newLayers,
        grid: flattenLayers(newLayers, state.canvasSize),
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, entry],
      };
    }

    case "ADD_LAYER": {
      const newName = `Layer ${state.layers.length + 1}`;
      const newLayer = createDefaultLayer(state.canvasSize, newName);
      const newLayers = [...state.layers, newLayer];
      return {
        ...state,
        layers: newLayers,
        activeLayerIndex: newLayers.length - 1,
        grid: flattenLayers(newLayers, state.canvasSize),
        undoStack: [],
        redoStack: [],
      };
    }

    case "REMOVE_LAYER": {
      if (state.layers.length <= 1) return state;
      const { index } = action;
      if (index < 0 || index >= state.layers.length) return state;
      const newLayers = state.layers.filter((_, i) => i !== index);
      const newActive = state.activeLayerIndex >= newLayers.length
        ? newLayers.length - 1
        : state.activeLayerIndex > index
          ? state.activeLayerIndex - 1
          : state.activeLayerIndex;
      return {
        ...state,
        layers: newLayers,
        activeLayerIndex: newActive,
        grid: flattenLayers(newLayers, state.canvasSize),
        undoStack: [],
        redoStack: [],
      };
    }

    case "SET_ACTIVE_LAYER": {
      const { index } = action;
      if (index < 0 || index >= state.layers.length) return state;
      return { ...state, activeLayerIndex: index };
    }

    case "TOGGLE_LAYER_VISIBILITY": {
      const { index } = action;
      if (index < 0 || index >= state.layers.length) return state;
      const newLayers = state.layers.map((l, i) =>
        i === index ? { ...l, visible: !l.visible } : l,
      );
      return {
        ...state,
        layers: newLayers,
        grid: flattenLayers(newLayers, state.canvasSize),
      };
    }

    case "RENAME_LAYER": {
      const { index, name } = action;
      if (index < 0 || index >= state.layers.length) return state;
      return {
        ...state,
        layers: state.layers.map((l, i) => (i === index ? { ...l, name } : l)),
      };
    }

    case "MOVE_LAYER": {
      const { fromIndex, toIndex } = action;
      if (
        fromIndex < 0 || fromIndex >= state.layers.length ||
        toIndex < 0 || toIndex >= state.layers.length ||
        fromIndex === toIndex
      ) return state;
      const newLayers = [...state.layers];
      const [moved] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, moved);
      let newActive = state.activeLayerIndex;
      if (state.activeLayerIndex === fromIndex) {
        newActive = toIndex;
      } else if (fromIndex < state.activeLayerIndex && toIndex >= state.activeLayerIndex) {
        newActive = state.activeLayerIndex - 1;
      } else if (fromIndex > state.activeLayerIndex && toIndex <= state.activeLayerIndex) {
        newActive = state.activeLayerIndex + 1;
      }
      return {
        ...state,
        layers: newLayers,
        activeLayerIndex: newActive,
        grid: flattenLayers(newLayers, state.canvasSize),
      };
    }

    case "MERGE_LAYER_DOWN": {
      const { index } = action;
      if (index <= 0 || index >= state.layers.length) return state;
      const upper = state.layers[index];
      const lower = state.layers[index - 1];
      const mergedGrid = lower.grid.map((row) => [...row]);
      for (let r = 0; r < state.canvasSize; r++) {
        for (let c = 0; c < state.canvasSize; c++) {
          const key = upper.grid[r]?.[c];
          if (key && key !== ".") {
            mergedGrid[r][c] = key;
          }
        }
      }
      const newLayers = state.layers.filter((_, i) => i !== index);
      newLayers[index - 1] = { ...lower, grid: mergedGrid };
      const newActive = state.activeLayerIndex >= index
        ? Math.max(0, state.activeLayerIndex - 1)
        : state.activeLayerIndex;
      return {
        ...state,
        layers: newLayers,
        activeLayerIndex: newActive,
        grid: flattenLayers(newLayers, state.canvasSize),
        undoStack: [],
        redoStack: [],
      };
    }

    default:
      return state;
  }
}
