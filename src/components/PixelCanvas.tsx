import { useRef, useEffect, useCallback } from "react";
import { useEditor } from "../state/editorContext";
import { useCanvasRenderer } from "../hooks/useCanvasRenderer";
import { useCanvasInteraction } from "../hooks/useCanvasInteraction";
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
  const render = useCanvasRenderer(
    state.grid,
    state.canvasSize,
    state.zoom,
    state.panOffset,
    state.showGrid,
    state.palette,
  );
  const { onMouseDown, onMouseMove, onMouseUp, onWheel, strokePixels } = useCanvasInteraction(
    state,
    dispatch,
    canvasRef,
  );

  const rafRef = useRef<number>(0);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    render(ctx, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);

    // Draw provisional stroke pixels on top
    const colorMap = buildColorMap(state.palette);
    const { zoom, panOffset } = state;
    for (const p of strokePixels.current.values()) {
      const x = panOffset.x + p.col * zoom;
      const y = panOffset.y + p.row * zoom;
      if (p.key === ".") {
        ctx.fillStyle = "#e0e0e0";
      } else {
        ctx.fillStyle = colorMap.get(p.key) ?? "#FF00FF";
      }
      ctx.fillRect(x, y, zoom, zoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render, state.palette, state.zoom, state.panOffset, strokePixels]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.scale(devicePixelRatio, devicePixelRatio);
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(paint);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [paint]);

  // Repaint on state change
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(paint);
  }, [paint]);

  // Continuous repaint during draw for provisional pixels
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      onMouseMove(e);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(paint);
    },
    [onMouseMove, paint],
  );

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: "hidden",
        position: "relative",
        cursor: CURSOR_MAP[state.activeTool],
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Pixel art canvas"
        onMouseDown={onMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
