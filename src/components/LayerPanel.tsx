import { useState } from "react";
import { useEditor } from "../state/editorContext";

export default function LayerPanel() {
  const { state, dispatch } = useEditor();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const startRename = (index: number) => {
    setEditingIndex(index);
    setEditName(state.layers[index].name);
  };

  const commitRename = () => {
    if (editingIndex !== null && editName.trim()) {
      dispatch({ type: "RENAME_LAYER", index: editingIndex, name: editName.trim() });
    }
    setEditingIndex(null);
  };

  return (
    <div className="layer-panel">
      <h3>Layers</h3>
      <div className="layer-buttons">
        <button
          className="tool-btn"
          onClick={() => dispatch({ type: "ADD_LAYER" })}
          title="Add Layer"
        >
          + Add
        </button>
      </div>
      <div className="layer-list" role="list" aria-label="Layers">
        {[...state.layers].reverse().map((layer, ri) => {
          const index = state.layers.length - 1 - ri;
          return (
            <div
              key={index}
              className={`layer-entry ${index === state.activeLayerIndex ? "active" : ""}`}
              onClick={() => dispatch({ type: "SET_ACTIVE_LAYER", index })}
              role="listitem"
            >
              <button
                className={`layer-visibility ${layer.visible ? "visible" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: "TOGGLE_LAYER_VISIBILITY", index });
                }}
                title={layer.visible ? "Hide layer" : "Show layer"}
                aria-label={layer.visible ? "Hide layer" : "Show layer"}
              >
                {layer.visible ? "◉" : "○"}
              </button>
              {editingIndex === index ? (
                <input
                  className="layer-name-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingIndex(null);
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="layer-name"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startRename(index);
                  }}
                >
                  {layer.name}
                </span>
              )}
              <div className="layer-actions">
                <button
                  className="layer-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "MOVE_LAYER", fromIndex: index, toIndex: index + 1 });
                  }}
                  disabled={index >= state.layers.length - 1}
                  title="Move up"
                  aria-label="Move layer up"
                >
                  ▲
                </button>
                <button
                  className="layer-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "MOVE_LAYER", fromIndex: index, toIndex: index - 1 });
                  }}
                  disabled={index <= 0}
                  title="Move down"
                  aria-label="Move layer down"
                >
                  ▼
                </button>
                <button
                  className="layer-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "MERGE_LAYER_DOWN", index });
                  }}
                  disabled={index <= 0}
                  title="Merge down"
                  aria-label="Merge layer down"
                >
                  ⤓
                </button>
                <button
                  className="layer-action-btn layer-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "REMOVE_LAYER", index });
                  }}
                  disabled={state.layers.length <= 1}
                  title="Delete layer"
                  aria-label="Delete layer"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
