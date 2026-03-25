import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from "react";
import type { EditorState, EditorAction } from "./types";
import { editorReducer, createInitialState, flattenLayers } from "./editorReducer";
import { saveState, loadState } from "../utils/persistence";
import { SAVE_DEBOUNCE_MS } from "../constants";

const EditorContext = createContext<{
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
} | null>(null);

function createRestoredState(): EditorState {
  const base = createInitialState(16);
  const saved = loadState();
  if (!saved) return base;
  const layers = saved.layers ?? base.layers;
  const canvasSize = saved.canvasSize ?? base.canvasSize;
  return {
    ...base,
    canvasSize,
    layers,
    activeLayerIndex: saved.activeLayerIndex ?? 0,
    grid: flattenLayers(layers, canvasSize),
    palette: saved.palette ?? base.palette,
    selectedColor: saved.selectedColor ?? base.selectedColor,
  };
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, null, createRestoredState);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(
      () =>
        saveState({
          canvasSize: state.canvasSize,
          layers: state.layers,
          activeLayerIndex: state.activeLayerIndex,
          palette: state.palette,
          selectedColor: state.selectedColor,
        }),
      SAVE_DEBOUNCE_MS,
    );
    return () => clearTimeout(saveTimer.current);
  }, [state.layers, state.palette, state.canvasSize, state.selectedColor, state.activeLayerIndex]);

  return <EditorContext.Provider value={{ state, dispatch }}>{children}</EditorContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}
