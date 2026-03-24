import { useState } from "react";
import { useEditor } from "../state/editorContext";

export default function SizeControl() {
  const { state, dispatch } = useEditor();
  const [inputSize, setInputSize] = useState(String(state.canvasSize));

  const handleApply = () => {
    const size = parseInt(inputSize, 10);
    if (isNaN(size)) return;
    const clamped = Math.max(10, Math.min(1000, size));
    if (clamped !== state.canvasSize) {
      if (clamped < state.canvasSize) {
        if (
          !confirm(
            `サイズを${state.canvasSize}から${clamped}に縮小します。はみ出た部分は失われます。`,
          )
        ) {
          return;
        }
      }
      dispatch({ type: "SET_CANVAS_SIZE", size: clamped });
      setInputSize(String(clamped));
    }
  };

  return (
    <div className="size-control">
      <h3>Size</h3>
      <div className="size-input-row">
        <input
          type="number"
          min={10}
          max={1000}
          value={inputSize}
          onChange={(e) => setInputSize(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
          className="size-input"
          aria-label="Canvas size"
        />
        <span className="size-label">x {inputSize}</span>
      </div>
      <button className="tool-btn" onClick={handleApply}>
        Apply
      </button>
    </div>
  );
}
