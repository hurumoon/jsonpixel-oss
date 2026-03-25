import { describe, it, expect } from "vitest";
import { floodFill } from "../utils/floodFill";

describe("floodFill", () => {
  it("fills a connected region", () => {
    const grid = [
      [".", ".", "R"],
      [".", ".", "R"],
      ["R", "R", "R"],
    ];
    const result = floodFill(grid, 0, 0, "G");
    expect(result.cells).toHaveLength(4);
    expect(result.limitReached).toBe(false);
    const coords = new Set(result.cells.map((c) => `${c.row},${c.col}`));
    expect(coords).toContain("0,0");
    expect(coords).toContain("0,1");
    expect(coords).toContain("1,0");
    expect(coords).toContain("1,1");
  });

  it("does not cross boundaries", () => {
    const grid = [
      [".", "R", "."],
      ["R", "R", "R"],
      [".", "R", "."],
    ];
    const result = floodFill(grid, 0, 0, "G");
    expect(result.cells).toHaveLength(1);
    expect(result.cells[0]).toEqual({ row: 0, col: 0 });
    expect(result.limitReached).toBe(false);
  });

  it("returns empty when fillKey matches target", () => {
    const grid = [
      ["R", "R"],
      ["R", "R"],
    ];
    const result = floodFill(grid, 0, 0, "R");
    expect(result.cells).toHaveLength(0);
    expect(result.limitReached).toBe(false);
  });

  it("returns empty for out-of-bounds", () => {
    const grid = [["R"]];
    expect(floodFill(grid, -1, 0, "G").cells).toHaveLength(0);
    expect(floodFill(grid, 0, 5, "G").cells).toHaveLength(0);
  });

  it("fills entire grid when all same color", () => {
    const grid = [
      [".", ".", "."],
      [".", ".", "."],
      [".", ".", "."],
    ];
    const result = floodFill(grid, 1, 1, "R");
    expect(result.cells).toHaveLength(9);
    expect(result.limitReached).toBe(false);
  });

  it("returns limitReached true when cell count exceeds MAX_FILL_CELLS", async () => {
    const constants = await import("../constants");
    const original = constants.MAX_FILL_CELLS;
    // Temporarily set limit to 4
    Object.defineProperty(constants, "MAX_FILL_CELLS", { value: 4, writable: true });
    try {
      const grid = [
        [".", ".", "."],
        [".", ".", "."],
        [".", ".", "."],
      ];
      const result = floodFill(grid, 0, 0, "R");
      expect(result.cells).toHaveLength(4);
      expect(result.limitReached).toBe(true);
    } finally {
      Object.defineProperty(constants, "MAX_FILL_CELLS", { value: original, writable: true });
    }
  });

  it("returns limitReached false when fill completes within limit", () => {
    const grid = [
      [".", "R"],
      ["R", "R"],
    ];
    const result = floodFill(grid, 0, 0, "G");
    expect(result.cells).toHaveLength(1);
    expect(result.limitReached).toBe(false);
  });
});
