import { useRef, useState, useEffect, useCallback } from "react";
import { useEditor } from "../state/editorContext";
import { useCanvasRenderer } from "../hooks/useCanvasRenderer";
import { useCanvasInteraction } from "../hooks/useCanvasInteraction";
import { MIN_ZOOM, MAX_ZOOM, MAX_FILL_CELLS } from "../constants";
import type { PaletteEntry } from "../state/types";

const CURSOR_MAP = {
  pen: "crosshair",
  eraser: "crosshair",
  fill: "crosshair",
  eyedropper: "crosshair",
} as const;

function buildColorMap(palette: PaletteEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of palette) map.set(p.key, p.color);
  return map;
}

export default function PixelCanvas() {
  const { state, dispatch } = useEditor();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fillWarning, setFillWarning] = useState("");
  const fillWarningTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleFillLimitReached = useCallback(() => {
    setFillWarning(
      `Fill stopped at ${MAX_FILL_CELLS.toLocaleString()} cell limit — only a partial area was filled`,
    );
    clearTimeout(fillWarningTimer.current);
    fillWarningTimer.current = setTimeout(() => setFillWarning(""), 4000);
  }, []);

  const render = useCanvasRenderer(
    state.grid,
    state.canvasSize,
    state.zoom,
    state.panOffset,
    state.showGrid,
    state.boldGrid,
    state.palette,
  );
  const { onPointerDown, onPointerMove, onPointerUp, onWheel, strokePixels } =
    useCanvasInteraction(state, dispatch, canvasRef, handleFillLimitReached);

  const rafRef = useRef<number>(0);
  const bufferRef = useRef<OffscreenCanvas | null>(null);
  const paintRef = useRef<() => void>(() => {});

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;

    // Ensure offscreen buffer matches canvas size
    if (
      !bufferRef.current ||
      bufferRef.current.width !== canvas.width ||
      bufferRef.current.height !== canvas.height
    ) {
      bufferRef.current = new OffscreenCanvas(canvas.width, canvas.height);
    }
    const bufCtx = bufferRef.current.getContext("2d");
    if (!bufCtx) return;

    bufCtx.resetTransform();
    bufCtx.scale(devicePixelRatio, devicePixelRatio);

    // Render grid to offscreen buffer
    render(bufCtx as unknown as CanvasRenderingContext2D, w, h);

    // Draw provisional stroke pixels on top of buffer
    const colorMap = buildColorMap(state.palette);
    const { zoom, panOffset } = state;
    for (const p of strokePixels.current.values()) {
      const x = panOffset.x + p.col * zoom;
      const y = panOffset.y + p.row * zoom;
      if (p.key === ".") {
        // Draw checkerboard for erased pixels
        if (zoom <= 4) {
          const isLight = (p.row + p.col) % 2 === 0;
          bufCtx.fillStyle = isLight ? "#e0e0e0" : "#c0c0c0";
          bufCtx.fillRect(x, y, zoom, zoom);
        } else {
          const cSize = Math.max(1, Math.floor(zoom / 2));
          for (let cy = 0; cy < zoom; cy += cSize) {
            for (let cx = 0; cx < zoom; cx += cSize) {
              const isLight = (Math.floor(cy / cSize) + Math.floor(cx / cSize)) % 2 === 0;
              bufCtx.fillStyle = isLight ? "#e0e0e0" : "#c0c0c0";
              bufCtx.fillRect(
                x + cx,
                y + cy,
                Math.min(cSize, zoom - cx),
                Math.min(cSize, zoom - cy),
              );
            }
          }
        }
      } else {
        bufCtx.fillStyle = colorMap.get(p.key) ?? "#FF00FF";
        bufCtx.fillRect(x, y, zoom, zoom);
      }
    }

    // Swap: copy buffer to visible canvas in one operation
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bufferRef.current, 0, 0);
    ctx.scale(devicePixelRatio, devicePixelRatio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render, state.palette, state.zoom, state.panOffset, strokePixels]);

  // Keep paintRef in sync with latest paint callback
  paintRef.current = paint;

  // Resize observer — registered once; uses paintRef to avoid re-subscription on every state change
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let isFirst = true;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const newW = Math.round(width * devicePixelRatio);
        const newH = Math.round(height * devicePixelRatio);
        if (canvas.width === newW && canvas.height === newH) continue;
        canvas.width = newW;
        canvas.height = newH;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        // Fit to view on initial layout when container gets real dimensions
        if (isFirst) {
          isFirst = false;
          fitToViewRef.current();
        }
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => paintRef.current());
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Repaint on state change
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(paint);
  }, [paint]);

  // Continuous repaint during pointer move for provisional pixels
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      onPointerMove(e);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(paint);
    },
    [onPointerMove, paint],
  );

  const fitToView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    const padding = 40;
    const available = Math.min(width, height) - padding * 2;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, available / state.canvasSize));
    const totalSize = state.canvasSize * newZoom;
    const newPanX = (width - totalSize) / 2;
    const newPanY = (height - totalSize) / 2;
    dispatch({ type: "SET_VIEW", zoom: Math.round(newZoom * 100) / 100, x: newPanX, y: newPanY });
  }, [state.canvasSize, dispatch]);

  const fitToViewRef = useRef(fitToView);
  fitToViewRef.current = fitToView;

  // Fit to view when canvas size changes (e.g. import)
  useEffect(() => {
    fitToView();
  }, [fitToView]);

  // Fit to view with F key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey) {
        fitToView();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fitToView]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: "hidden",
        position: "relative",
        cursor: CURSOR_MAP[state.activeTool],
        touchAction: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Pixel art canvas"
        onPointerDown={onPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }}
      />
      <button
        className="tool-btn fit-btn"
        onClick={fitToView}
        title="Fit canvas to view (F)"
      >
        Fit
      </button>
      {fillWarning && (
        <div className="fill-warning-toast" role="alert">
          {fillWarning}
        </div>
      )}
    </div>
  );
}
