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
});
