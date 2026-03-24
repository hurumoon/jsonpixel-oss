export interface DotArtJson {
  palette: Record<string, string>;
  rows: string[];
}

export interface LayeredDotArtJson {
  palette: Record<string, string>;
  layers: { name: string; visible: boolean; rows: string[] }[];
}

export interface PaletteEntry {
  key: string;
  color: string;
}

export type Tool = "pen" | "eraser" | "fill" | "eyedropper";

export interface PixelDiff {
  row: number;
  col: number;
  prev: string;
  next: string;
}

export interface UndoEntry {
  layerIndex: number;
  diffs: PixelDiff[];
}

export interface Layer {
  name: string;
  visible: boolean;
  grid: string[][];
}

export interface EditorState {
  canvasSize: number;
  layers: Layer[];
  activeLayerIndex: number;
  /** Flattened composite of all visible layers (computed from layers) */
  grid: string[][];
  palette: PaletteEntry[];
  selectedColor: string;
  activeTool: Tool;
  showGrid: boolean;
  boldGrid: boolean;
  zoom: number;
  panOffset: { x: number; y: number };
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
}

export type EditorAction =
  | { type: "SET_PIXEL"; row: number; col: number; key: string }
  | { type: "SET_PIXELS"; pixels: { row: number; col: number; key: string }[] }
  | { type: "SET_TOOL"; tool: Tool }
  | { type: "SET_COLOR"; key: string }
  | { type: "ADD_PALETTE_ENTRY"; key: string; color: string }
  | { type: "REMOVE_PALETTE_ENTRY"; key: string }
  | { type: "UPDATE_PALETTE_COLOR"; key: string; color: string }
  | { type: "SET_CANVAS_SIZE"; size: number }
  | { type: "IMPORT_JSON"; data: DotArtJson }
  | { type: "IMPORT_LAYERED_JSON"; data: LayeredDotArtJson }
  | { type: "TOGGLE_GRID" }
  | { type: "TOGGLE_BOLD_GRID" }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_PAN"; x: number; y: number }
  | { type: "SET_VIEW"; zoom: number; x: number; y: number }
  | { type: "CLEAR_CANVAS" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "ADD_LAYER" }
  | { type: "REMOVE_LAYER"; index: number }
  | { type: "SET_ACTIVE_LAYER"; index: number }
  | { type: "TOGGLE_LAYER_VISIBILITY"; index: number }
  | { type: "RENAME_LAYER"; index: number; name: string }
  | { type: "MOVE_LAYER"; fromIndex: number; toIndex: number }
  | { type: "MERGE_LAYER_DOWN"; index: number };
