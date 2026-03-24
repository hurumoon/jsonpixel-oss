import { describe, it, expect } from "vitest";
import { screenToGrid, getVisibleRegion, bresenhamLine } from "../utils/canvasHelpers";

describe("screenToGrid", () => {
  it("converts screen coordinates to grid coordinates", () => {
    const result = screenToGrid(50, 30, { x: 10, y: 10 }, 20);
    expect(result).toEqual({ row: 1, col: 2 });
  });

  it("handles zero pan offset", () => {
    const result = screenToGrid(20, 40, { x: 0, y: 0 }, 10);
    expect(result).toEqual({ row: 4, col: 2 });
  });

  it("returns negative values for positions before pan offset", () => {
    const result = screenToGrid(5, 5, { x: 100, y: 100 }, 10);
    expect(result.row).toBeLessThan(0);
    expect(result.col).toBeLessThan(0);
  });
});

describe("getVisibleRegion", () => {
  it("returns full canvas when fully visible", () => {
    const result = getVisibleRegion({ x: 0, y: 0 }, 10, 100, 100, 10);
    expect(result).toEqual({ startRow: 0, endRow: 10, startCol: 0, endCol: 10 });
  });

  it("clips to canvas bounds", () => {
    const result = getVisibleRegion({ x: -50, y: -50 }, 10, 100, 100, 10);
    expect(result.startRow).toBe(5);
    expect(result.startCol).toBe(5);
    expect(result.endRow).toBe(10);
    expect(result.endCol).toBe(10);
  });

  it("returns clamped start at 0", () => {
    const result = getVisibleRegion({ x: 50, y: 50 }, 10, 200, 200, 10);
    expect(result.startRow).toBe(0);
    expect(result.startCol).toBe(0);
  });
});

describe("bresenhamLine", () => {
  it("produces a horizontal line", () => {
    const points = bresenhamLine(0, 0, 3, 0);
    expect(points).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ]);
  });

  it("produces a vertical line", () => {
    const points = bresenhamLine(0, 0, 0, 3);
    expect(points).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 3, col: 0 },
    ]);
  });

  it("produces a diagonal line", () => {
    const points = bresenhamLine(0, 0, 2, 2);
    expect(points).toHaveLength(3);
    expect(points[0]).toEqual({ row: 0, col: 0 });
    expect(points[2]).toEqual({ row: 2, col: 2 });
  });

  it("handles single point", () => {
    const points = bresenhamLine(5, 5, 5, 5);
    expect(points).toEqual([{ row: 5, col: 5 }]);
  });

  it("works in reverse direction", () => {
    const points = bresenhamLine(3, 0, 0, 0);
    expect(points).toHaveLength(4);
    expect(points[0]).toEqual({ row: 0, col: 3 });
    expect(points[3]).toEqual({ row: 0, col: 0 });
  });
});
