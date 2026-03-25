import type { EditorState, PaletteEntry, Layer } from "../state/types";

const STORAGE_KEY = "jsonpixel-state";

interface PersistedState {
  canvasSize: number;
  layers: Layer[];
  activeLayerIndex: number;
  palette: PaletteEntry[];
  selectedColor: string;
  /** @deprecated kept for backward compat loading */
  grid?: string[][];
}

export function saveState(state: Pick<EditorState, "canvasSize" | "layers" | "activeLayerIndex" | "palette" | "selectedColor">): void {
  try {
    const data: PersistedState = {
      canvasSize: state.canvasSize,
      layers: state.layers,
      activeLayerIndex: state.activeLayerIndex,
      palette: state.palette,
      selectedColor: state.selectedColor,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function loadState(): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedState;

    // Migrate from old single-grid format
    if (!data.layers && data.grid && Array.isArray(data.grid)) {
      data.layers = [{ name: "Layer 1", visible: true, grid: data.grid }];
      data.activeLayerIndex = 0;
      delete data.grid;
    }

    if (
      !data.layers ||
      !Array.isArray(data.layers) ||
      !data.palette ||
      typeof data.canvasSize !== "number"
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
