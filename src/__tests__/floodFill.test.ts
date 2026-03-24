import { describe, it, expect } from "vitest";
import { floodFill } from "../utils/floodFill";

describe("floodFill", () => {
  it("fills a connected region", () => {
    const grid = [
      [".", ".", "R"],
      [".", ".", "R"],
      ["R", "R", "R"],
    ];
    const cells = floodFill(grid, 0, 0, "G");
    expect(cells).toHaveLength(4);
    const coords = new Set(cells.map((c) => `${c.row},${c.col}`));
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
    const cells = floodFill(grid, 0, 0, "G");
    expect(cells).toHaveLength(1);
    expect(cells[0]).toEqual({ row: 0, col: 0 });
  });

  it("returns empty when fillKey matches target", () => {
    const grid = [
      ["R", "R"],
      ["R", "R"],
    ];
    const cells = floodFill(grid, 0, 0, "R");
    expect(cells).toHaveLength(0);
  });

  it("returns empty for out-of-bounds", () => {
    const grid = [["R"]];
    expect(floodFill(grid, -1, 0, "G")).toHaveLength(0);
    expect(floodFill(grid, 0, 5, "G")).toHaveLength(0);
  });

  it("fills entire grid when all same color", () => {
    const grid = [
      [".", ".", "."],
      [".", ".", "."],
      [".", ".", "."],
    ];
    const cells = floodFill(grid, 1, 1, "R");
    expect(cells).toHaveLength(9);
  });
});
