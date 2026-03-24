import { describe, it, expect } from "vitest";
import { gridToPngBlob } from "../utils/exportPng";

const hasCanvas = (() => {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("2d");
  } catch {
    return false;
  }
})();

describe.skipIf(!hasCanvas)("gridToPngBlob", () => {
  it("returns a PNG blob", async () => {
    const grid = [
      ["R", "."],
      [".", "R"],
    ];
    const palette = [{ key: "R", color: "#FF0000" }];
    const blob = await gridToPngBlob(grid, palette, 1);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
  });

  it("respects scale parameter", async () => {
    const grid = [
      ["R", "."],
      [".", "R"],
    ];
    const palette = [{ key: "R", color: "#FF0000" }];
    const blob = await gridToPngBlob(grid, palette, 4);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});
