import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCanvasRenderer } from "../hooks/useCanvasRenderer";
import type { PaletteEntry } from "../state/types";

// Minimal OffscreenCanvas / ImageData stubs for jsdom
class FakeImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(w: number, h: number) {
    this.width = Math.floor(w);
    this.height = Math.floor(h);
    this.data = new Uint8ClampedArray(this.width * this.height * 4);
  }
}

class FakeOffscreenCanvas {
  width: number;
  height: number;
  private ctx: FakeCtx;
  constructor(w: number, h: number) {
    this.width = Math.floor(w);
    this.height = Math.floor(h);
    this.ctx = new FakeCtx(this);
  }
  getContext(_type: string) {
    return this.ctx;
  }
}

class FakeCtx {
  calls: { method: string; args: unknown[] }[] = [];
  constructor(_canvas: FakeOffscreenCanvas) {
  }
  createImageData(w: number, h: number) {
    return new FakeImageData(w, h);
  }
  putImageData() {}
  clearRect() {}
  drawImage(...args: unknown[]) {
    this.calls.push({ method: "drawImage", args });
  }
  set fillStyle(_v: string) {}
  fillRect(...args: unknown[]) {
    this.calls.push({ method: "fillRect", args });
  }
  set strokeStyle(_v: string) {}
  set lineWidth(_v: number) {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  stroke() {}
  strokeRect() {}
  resetTransform() {}
  scale() {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).OffscreenCanvas = FakeOffscreenCanvas;

function makeGrid(size: number, fill = "."): string[][] {
  return Array.from({ length: size }, () => Array(size).fill(fill));
}

const palette: PaletteEntry[] = [
  { key: "R", color: "#ff0000" },
  { key: "G", color: "#00ff00" },
];

describe("useCanvasRenderer", () => {
  let ctx: FakeCtx;

  beforeEach(() => {
    ctx = new FakeCtx(new FakeOffscreenCanvas(400, 400));
  });

  it("renders without error at integer zoom", () => {
    const grid = makeGrid(16);
    const { result } = renderHook(() =>
      useCanvasRenderer(grid, 16, 2, { x: 0, y: 0 }, false, false, palette),
    );

    expect(() => {
      result.current(ctx as unknown as CanvasRenderingContext2D, 400, 400);
    }).not.toThrow();
  });

  it("renders without error at fractional zoom (pinch-zoom scenario)", () => {
    const grid = makeGrid(64, "R");
    const { result } = renderHook(() =>
      useCanvasRenderer(grid, 64, 2.35, { x: 10, y: 10 }, false, false, palette),
    );

    expect(() => {
      result.current(ctx as unknown as CanvasRenderingContext2D, 400, 400);
    }).not.toThrow();
  });

  it("ImageData indices stay within bounds at fractional zoom", () => {
    const size = 64;
    const grid = makeGrid(size, "R");
    const zoom = 1.73; // fractional zoom common during pinch

    const { result } = renderHook(() =>
      useCanvasRenderer(grid, size, zoom, { x: 0, y: 0 }, false, false, palette),
    );

    // Spy on createImageData to capture the ImageData and verify no out-of-bounds writes
    const imageDataInstances: FakeImageData[] = [];
    const origCreate = FakeCtx.prototype.createImageData;
    vi.spyOn(FakeCtx.prototype, "createImageData").mockImplementation(function (
      this: FakeCtx,
      w: number,
      h: number,
    ) {
      const img = origCreate.call(this, w, h);
      imageDataInstances.push(img);
      return img;
    });

    result.current(ctx as unknown as CanvasRenderingContext2D, 400, 400);

    // Verify all ImageData writes were within bounds
    for (const img of imageDataInstances) {
      const maxIdx = img.width * img.height * 4;
      // Check that no pixel was written beyond the buffer
      // (in the buggy version, fractional indices would cause writes at wrong positions)
      expect(img.data.length).toBe(maxIdx);
      // Verify the data was actually written (not all zeros — "R" = #ff0000)
      let hasNonZero = false;
      for (let i = 0; i < img.data.length; i += 4) {
        if (img.data[i] !== 0) {
          hasNonZero = true;
          break;
        }
      }
      expect(hasNonZero).toBe(true);
    }

    vi.restoreAllMocks();
  });

  it("produces consistent pixel data at various fractional zoom levels", () => {
    const size = 32;
    // A grid with a known pattern: alternating R and G
    const grid = makeGrid(size);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        grid[r][c] = (r + c) % 2 === 0 ? "R" : "G";
      }
    }

    const fractionalZooms = [0.5, 1.33, 1.5, 2.17, 2.5, 3.14, 3.75];

    for (const zoom of fractionalZooms) {
      const { result } = renderHook(() =>
        useCanvasRenderer(grid, size, zoom, { x: 0, y: 0 }, false, false, palette),
      );

      expect(() => {
        result.current(ctx as unknown as CanvasRenderingContext2D, 400, 400);
      }).not.toThrow();
    }
  });

  it("renders correctly with large canvas at fractional zoom", () => {
    // This is the scenario from the bug report — large canvas + fractional zoom
    const size = 128;
    const grid = makeGrid(size, "R");
    const zoom = 0.73; // small fractional zoom on mobile

    const { result } = renderHook(() =>
      useCanvasRenderer(grid, size, zoom, { x: 5, y: 5 }, false, false, palette),
    );

    expect(() => {
      result.current(ctx as unknown as CanvasRenderingContext2D, 400, 400);
    }).not.toThrow();
  });
});
