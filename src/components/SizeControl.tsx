import { useState } from "react";
import { useEditor } from "../state/editorContext";
import { MIN_CANVAS_SIZE, MAX_CANVAS_SIZE } from "../constants";

export default function SizeControl() {
  const { state, dispatch } = useEditor();
  const [inputSize, setInputSize] = useState(String(state.canvasSize));
  const [prevCanvasSize, setPrevCanvasSize] = useState(state.canvasSize);

  // Sync input when canvasSize changes externally (e.g. import)
  if (state.canvasSize !== prevCanvasSize) {
    setPrevCanvasSize(state.canvasSize);
    setInputSize(String(state.canvasSize));
  }

  const handleApply = () => {
    const size = parseInt(inputSize, 10);
    if (isNaN(size)) return;
    const clamped = Math.max(MIN_CANVAS_SIZE, Math.min(MAX_CANVAS_SIZE, size));
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
          min={MIN_CANVAS_SIZE}
          max={MAX_CANVAS_SIZE}
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
