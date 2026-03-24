import { useState } from "react";
import { useEditor } from "../state/editorContext";

const KEY_CANDIDATES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz".split("");

export default function PalettePanel() {
  const { state, dispatch } = useEditor();
  const [newColor, setNewColor] = useState("#FF0000");

  const usedKeys = new Set(state.palette.map((p) => p.key));
  const nextKey = KEY_CANDIDATES.find((k) => !usedKeys.has(k));

  const handleAdd = () => {
    if (!nextKey) return;
    dispatch({ type: "ADD_PALETTE_ENTRY", key: nextKey, color: newColor });
    dispatch({ type: "SET_COLOR", key: nextKey });
  };

  return (
    <div className="palette-panel">
      <h3>Palette</h3>
      <div className="palette-list" role="listbox" aria-label="Color palette">
        {state.palette.map((entry) => (
          <div
            key={entry.key}
            role="option"
            aria-selected={state.selectedColor === entry.key}
            className={`palette-entry ${state.selectedColor === entry.key ? "selected" : ""}`}
            onClick={() => {
              dispatch({ type: "SET_COLOR", key: entry.key });
              if (state.activeTool === "eraser") {
                dispatch({ type: "SET_TOOL", tool: "pen" });
              }
            }}
          >
            <input
              type="color"
              value={entry.color}
              onChange={(e) =>
                dispatch({ type: "UPDATE_PALETTE_COLOR", key: entry.key, color: e.target.value })
              }
              className="palette-color-input"
              aria-label={`Color ${entry.key}: ${entry.color}`}
            />
            <span className="palette-key">{entry.key}</span>
            <button
              className="palette-remove"
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: "REMOVE_PALETTE_ENTRY", key: entry.key });
              }}
              aria-label={`Remove color ${entry.key}`}
            >
              x
            </button>
          </div>
        ))}
      </div>
      {nextKey ? (
        <div className="palette-add">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="palette-color-input"
            aria-label="New color"
          />
          <button className="tool-btn" onClick={handleAdd}>
            + Add ({nextKey})
          </button>
        </div>
      ) : (
        <p className="palette-full">Palette full (max 62)</p>
      )}
    </div>
  );
}
