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

  // Multi-touch state for pinch zoom / two-finger pan
  const activeTouches = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDist = useRef(0);
  const pinchStartZoom = useRef(0);
  const pinchStartCenter = useRef({ x: 0, y: 0 });
  const pinchStartPan = useRef({ x: 0, y: 0 });

  const getPointerPos = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
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

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (canvas && e.pointerType === "touch") {
        canvas.setPointerCapture(e.pointerId);
      }

      const pos = getPointerPos(e);

      // Track touch for multi-touch gestures
      if (e.pointerType === "touch") {
        activeTouches.current.set(e.pointerId, pos);
        // If two fingers down, start pinch/pan gesture
        if (activeTouches.current.size === 2) {
          // Cancel any drawing in progress
          isDrawing.current = false;
          strokePixels.current.clear();
          isPanning.current = true;

          const touches = Array.from(activeTouches.current.values());
          const dx = touches[1].x - touches[0].x;
          const dy = touches[1].y - touches[0].y;
          pinchStartDist.current = Math.sqrt(dx * dx + dy * dy);
          pinchStartZoom.current = state.zoom;
          pinchStartCenter.current = {
            x: (touches[0].x + touches[1].x) / 2,
            y: (touches[0].y + touches[1].y) / 2,
          };
          pinchStartPan.current = { ...state.panOffset };
          return;
        }
        // Single touch — don't start drawing immediately, wait to confirm it's not a two-finger gesture
      }

      // Middle button or right button for pan (mouse)
      if (e.button === 1 || e.button === 2) {
        isPanning.current = true;
        lastMouse.current = pos;
        e.preventDefault();
        return;
      }

      if (e.button !== 0) return;

      // For touch, ignore if multi-touch is active
      if (e.pointerType === "touch" && activeTouches.current.size > 1) return;

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
        const activeGrid = state.layers[state.activeLayerIndex].grid;
        const cells = floodFill(activeGrid, cell.row, cell.col, fillKey);
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
      getPointerPos,
      canvasRef,
      state.panOffset,
      state.zoom,
      state.activeTool,
      state.selectedColor,
      state.grid,
      state.canvasSize,
      state.layers,
      state.activeLayerIndex,
      dispatch,
      drawAt,
    ],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const pos = getPointerPos(e);

      // Update tracked touch position
      if (e.pointerType === "touch" && activeTouches.current.has(e.pointerId)) {
        activeTouches.current.set(e.pointerId, pos);

        // Two-finger pinch/pan
        if (activeTouches.current.size === 2) {
          const touches = Array.from(activeTouches.current.values());
          const dx = touches[1].x - touches[0].x;
          const dy = touches[1].y - touches[0].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const currentCenter = {
            x: (touches[0].x + touches[1].x) / 2,
            y: (touches[0].y + touches[1].y) / 2,
          };

          // Calculate new zoom
          const scale = dist / pinchStartDist.current;
          const newZoom = Math.max(1, Math.min(100, pinchStartZoom.current * scale));

          // Calculate new pan (zoom toward pinch center + pan offset)
          const zoomScale = newZoom / pinchStartZoom.current;
          const newPanX =
            currentCenter.x -
            (pinchStartCenter.current.x - pinchStartPan.current.x) * zoomScale;
          const newPanY =
            currentCenter.y -
            (pinchStartCenter.current.y - pinchStartPan.current.y) * zoomScale;

          dispatch({
            type: "SET_VIEW",
            zoom: Math.round(newZoom * 100) / 100,
            x: newPanX,
            y: newPanY,
          });
          return;
        }
      }

      // Mouse middle-button / right-button pan
      if (isPanning.current && e.pointerType !== "touch") {
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
    [getPointerPos, state.panOffset, state.zoom, dispatch, drawAt],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Remove tracked touch
      if (e.pointerType === "touch") {
        activeTouches.current.delete(e.pointerId);
        if (activeTouches.current.size < 2) {
          isPanning.current = false;
        }
      }

      if (isPanning.current && e.pointerType !== "touch") {
        isPanning.current = false;
        return;
      }
      if (isDrawing.current) {
        isDrawing.current = false;
        const pixels = Array.from(strokePixels.current.values());
        strokePixels.current.clear();
        if (pixels.length > 0) {
          dispatch({ type: "SET_PIXELS", pixels });
        }
        lastCell.current = null;
      }
    },
    [dispatch],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const oldZoom = state.zoom;
      const delta = e.deltaY > 0 ? -1 : 1;
      const factor = 1.1;
      const newZoom = Math.max(1, Math.min(100, delta > 0 ? oldZoom * factor : oldZoom / factor));

      // Zoom toward mouse position
      const scale = newZoom / oldZoom;
      const newPanX = pos.x - (pos.x - state.panOffset.x) * scale;
      const newPanY = pos.y - (pos.y - state.panOffset.y) * scale;

      dispatch({ type: "SET_VIEW", zoom: Math.round(newZoom * 100) / 100, x: newPanX, y: newPanY });
    },
    [canvasRef, state.zoom, state.panOffset, dispatch],
  );

  return { onPointerDown, onPointerMove, onPointerUp, onWheel, strokePixels };
}
