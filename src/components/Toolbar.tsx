import { useEditor } from "../state/editorContext";
import type { Tool } from "../state/types";
import AboutDialog from "./AboutDialog";

const tools: { tool: Tool; label: string; shortcut: string }[] = [
  { tool: "pen", label: "Pen", shortcut: "B" },
  { tool: "eraser", label: "Eraser", shortcut: "E" },
  { tool: "fill", label: "Fill", shortcut: "G" },
  { tool: "eyedropper", label: "Pick", shortcut: "I" },
];

export default function Toolbar() {
  const { state, dispatch } = useEditor();

  return (
    <nav className="toolbar" aria-label="Drawing tools">
      <div className="toolbar-group" role="group" aria-label="Tools">
        {tools.map((t) => (
          <button
            key={t.tool}
            className={`tool-btn ${state.activeTool === t.tool ? "active" : ""}`}
            onClick={() => dispatch({ type: "SET_TOOL", tool: t.tool })}
            title={`${t.label} (${t.shortcut})`}
            aria-pressed={state.activeTool === t.tool}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="toolbar-group" role="group" aria-label="View">
        <button
          className={`tool-btn ${state.showGrid ? "active" : ""}`}
          onClick={() => dispatch({ type: "TOGGLE_GRID" })}
          title="Grid"
          aria-pressed={state.showGrid}
        >
          Grid
        </button>
        <button
          className={`tool-btn ${state.boldGrid ? "active" : ""}`}
          onClick={() => dispatch({ type: "TOGGLE_BOLD_GRID" })}
          title="Bold Grid"
          aria-pressed={state.boldGrid}
          disabled={!state.showGrid}
        >
          Bold
        </button>
      </div>
      <div className="toolbar-group" role="group" aria-label="History">
        <button
          className="tool-btn"
          onClick={() => dispatch({ type: "UNDO" })}
          disabled={state.undoStack.length === 0}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          className="tool-btn"
          onClick={() => dispatch({ type: "REDO" })}
          disabled={state.redoStack.length === 0}
          title="Redo (Ctrl+Y)"
        >
          Redo
        </button>
      </div>
      <div className="toolbar-group">
        <span className="zoom-label" aria-live="polite">
          Zoom: {Math.round(state.zoom)}px
        </span>
      </div>
      <div className="toolbar-spacer" />
      <div className="toolbar-group">
        <AboutDialog />
      </div>
    </nav>
  );
}
