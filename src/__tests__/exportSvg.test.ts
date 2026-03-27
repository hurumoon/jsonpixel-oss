import { describe, it, expect } from "vitest";
import { gridToSvgString, gridToSvgBlob } from "../utils/exportSvg";

describe("gridToSvgString", () => {
  it("generates valid SVG with pixel rects", () => {
    const grid = [
      ["R", "."],
      [".", "G"],
    ];
    const palette = [
      { key: "R", color: "#FF0000" },
      { key: "G", color: "#00FF00" },
    ];
    const svg = gridToSvgString(grid, palette);
    expect(svg).toContain('viewBox="0 0 2 2"');
    expect(svg).toContain('fill="#FF0000"');
    expect(svg).toContain('fill="#00FF00"');
    expect(svg).toContain("shape-rendering=\"crispEdges\"");
    expect(svg).not.toContain('fill="."');
  });

  it("merges adjacent same-color pixels into runs", () => {
    const grid = [
      ["R", "R", "R"],
      [".", ".", "."],
      ["G", ".", "G"],
    ];
    const palette = [
      { key: "R", color: "#FF0000" },
      { key: "G", color: "#00FF00" },
    ];
    const svg = gridToSvgString(grid, palette);
    // The three R pixels in row 0 should be merged into one rect with width=3
    expect(svg).toContain('x="0" y="0" width="3" height="1" fill="#FF0000"');
    // The two G pixels in row 2 should be separate rects
    expect(svg).toContain('x="0" y="2" width="1" height="1" fill="#00FF00"');
    expect(svg).toContain('x="2" y="2" width="1" height="1" fill="#00FF00"');
  });

  it("handles fully transparent grid", () => {
    const grid = [
      [".", "."],
      [".", "."],
    ];
    const svg = gridToSvgString(grid, []);
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<rect");
  });
});

describe("gridToSvgBlob", () => {
  it("returns an SVG blob", () => {
    const grid = [["R"]];
    const palette = [{ key: "R", color: "#FF0000" }];
    const blob = gridToSvgBlob(grid, palette);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/svg+xml");
  });
});
