import type { EditorState, PaletteEntry } from "../state/types";

const STORAGE_KEY = "jsonpixel-state";

interface PersistedState {
  canvasSize: number;
  grid: string[][];
  palette: PaletteEntry[];
  selectedColor: string;
}

export function saveState(state: EditorState): void {
  try {
    const data: PersistedState = {
      canvasSize: state.canvasSize,
      grid: state.grid,
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
    if (
      !data.grid ||
      !Array.isArray(data.grid) ||
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
