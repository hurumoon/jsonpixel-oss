import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from "react";
import type { EditorState, EditorAction } from "./types";
import { editorReducer, createInitialState } from "./editorReducer";
import { saveState, loadState } from "../utils/persistence";

const EditorContext = createContext<{
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
} | null>(null);

function createRestoredState(): EditorState {
  const base = createInitialState(16);
  const saved = loadState();
  if (!saved) return base;
  return {
    ...base,
    canvasSize: saved.canvasSize ?? base.canvasSize,
    grid: saved.grid ?? base.grid,
    palette: saved.palette ?? base.palette,
    selectedColor: saved.selectedColor ?? base.selectedColor,
  };
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, null, createRestoredState);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveState(state), 500);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.grid, state.palette, state.canvasSize, state.selectedColor]);

  return <EditorContext.Provider value={{ state, dispatch }}>{children}</EditorContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}
