import { useRef, useCallback, type RefObject } from "react";
import type { EditorState, EditorAction } from "../state/types";
import { screenToGrid, bresenhamLine } from "../utils/canvasHelpers";
import { floodFill } from "../utils/floodFill";

export function useCanvasInteraction(
  state: EditorState,
  dispatch: React.Dispatch<EditorAction>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
) {
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastCell = useRef<{ row: number; col: number } | null>(null);
  const lastMouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const strokePixels = useRef<Map<string, { row: number; col: number; key: string }>>(new Map());

  const getMousePos = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    [canvasRef],
  );

  const getDrawKey = useCallback((): string => {
    if (state.activeTool === "eraser") return ".";
    return state.selectedColor;
  }, [state.activeTool, state.selectedColor]);

  const drawAt = useCallback(
    (row: number, col: number) => {
      if (row < 0 || row >= state.canvasSize || col < 0 || col >= state.canvasSize) return;
      const key = getDrawKey();
      const id = `${row},${col}`;
      if (!strokePixels.current.has(id)) {
        strokePixels.current.set(id, { row, col, key });
      }
    },
    [state.canvasSize, getDrawKey],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getMousePos(e);

      // Middle button or space+left for pan
      if (e.button === 1) {
        isPanning.current = true;
        lastMouse.current = pos;
        e.preventDefault();
        return;
      }

      if (e.button !== 0) return;

      const cell = screenToGrid(pos.x, pos.y, state.panOffset, state.zoom);

      if (state.activeTool === "fill") {
        if (
          cell.row < 0 ||
          cell.row >= state.canvasSize ||
          cell.col < 0 ||
          cell.col >= state.canvasSize
        )
          return;
        const fillKey = state.selectedColor;
        const cells = floodFill(state.grid, cell.row, cell.col, fillKey);
        if (cells.length > 0) {
          dispatch({ type: "SET_PIXELS", pixels: cells.map((c) => ({ ...c, key: fillKey })) });
        }
        return;
      }

      if (state.activeTool === "eyedropper") {
        if (
          cell.row < 0 ||
          cell.row >= state.canvasSize ||
          cell.col < 0 ||
          cell.col >= state.canvasSize
        )
          return;
        const pickedKey = state.grid[cell.row][cell.col];
        if (pickedKey !== ".") {
          dispatch({ type: "SET_COLOR", key: pickedKey });
          dispatch({ type: "SET_TOOL", tool: "pen" });
        }
        return;
      }

      isDrawing.current = true;
      strokePixels.current.clear();
      lastCell.current = cell;
      drawAt(cell.row, cell.col);
    },
    [
      getMousePos,
      state.panOffset,
      state.zoom,
      state.activeTool,
      state.selectedColor,
      state.grid,
      state.canvasSize,
      dispatch,
      drawAt,
    ],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getMousePos(e);

      if (isPanning.current) {
        const dx = pos.x - lastMouse.current.x;
        const dy = pos.y - lastMouse.current.y;
        dispatch({ type: "SET_PAN", x: state.panOffset.x + dx, y: state.panOffset.y + dy });
        lastMouse.current = pos;
        return;
      }

      if (!isDrawing.current) return;

      const cell = screenToGrid(pos.x, pos.y, state.panOffset, state.zoom);
      if (
        lastCell.current &&
        (cell.row !== lastCell.current.row || cell.col !== lastCell.current.col)
      ) {
        const points = bresenhamLine(
          lastCell.current.col,
          lastCell.current.row,
          cell.col,
          cell.row,
        );
        for (const p of points) {
          drawAt(p.row, p.col);
        }
      }
      lastCell.current = cell;
    },
    [getMousePos, state.panOffset, state.zoom, dispatch, drawAt],
  );

  const onMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }
    if (isDrawing.current) {
      isDrawing.current = false;
      const pixels = Array.from(strokePixels.current.values());
      if (pixels.length > 0) {
        dispatch({ type: "SET_PIXELS", pixels });
      }
      strokePixels.current.clear();
      lastCell.current = null;
    }
  }, [dispatch]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const pos = getMousePos(e);
      const oldZoom = state.zoom;
      const delta = e.deltaY > 0 ? -1 : 1;
      const factor = 1.1;
      const newZoom = Math.max(1, Math.min(100, delta > 0 ? oldZoom * factor : oldZoom / factor));

      // Zoom toward mouse position
      const scale = newZoom / oldZoom;
      const newPanX = pos.x - (pos.x - state.panOffset.x) * scale;
      const newPanY = pos.y - (pos.y - state.panOffset.y) * scale;

      dispatch({ type: "SET_ZOOM", zoom: Math.round(newZoom * 100) / 100 });
      dispatch({ type: "SET_PAN", x: newPanX, y: newPanY });
    },
    [getMousePos, state.zoom, state.panOffset, dispatch],
  );

  return { onMouseDown, onMouseMove, onMouseUp, onWheel, strokePixels };
}
