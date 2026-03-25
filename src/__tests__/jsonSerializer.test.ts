import { describe, it, expect } from "vitest";
import {
  gridToJson,
  jsonToGrid,
  validateDotArtJson,
  layersToJson,
  validateLayeredDotArtJson,
  isLayeredJson,
} from "../utils/jsonSerializer";
import type { PaletteEntry, Layer } from "../state/types";

describe("gridToJson", () => {
  it("converts grid and palette to DotArtJson", () => {
    const grid = [
      ["R", ".", "G"],
      [".", "R", "."],
      ["G", ".", "R"],
    ];
    const palette: PaletteEntry[] = [
      { key: "R", color: "#FF0000" },
      { key: "G", color: "#00FF00" },
      { key: "B", color: "#0000FF" },
    ];
    const json = gridToJson(grid, palette);
    expect(json.palette).toEqual({ R: "#FF0000", G: "#00FF00" });
    expect(json.rows).toEqual(["R.G", ".R.", "G.R"]);
  });

  it("excludes unused palette entries", () => {
    const grid = [
      [".", "."],
      [".", "."],
    ];
    const palette: PaletteEntry[] = [{ key: "R", color: "#FF0000" }];
    const json = gridToJson(grid, palette);
    expect(json.palette).toEqual({});
  });
});

describe("jsonToGrid", () => {
  it("parses DotArtJson into grid and palette", () => {
    const result = jsonToGrid({
      palette: { R: "#FF0000" },
      rows: ["R.", ".R"],
    });
    expect(result.size).toBe(2);
    expect(result.grid).toEqual([
      ["R", "."],
      [".", "R"],
    ]);
    expect(result.palette).toEqual([{ key: "R", color: "#FF0000" }]);
  });
});

describe("validateDotArtJson", () => {
  it("accepts valid JSON", () => {
    const result = validateDotArtJson({
      palette: { R: "#FF0000" },
      rows: ["R.", ".R"],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects non-object", () => {
    expect(validateDotArtJson(null).valid).toBe(false);
    expect(validateDotArtJson("string").valid).toBe(false);
  });

  it("rejects missing palette", () => {
    const result = validateDotArtJson({ rows: [".."] });
    expect(result.valid).toBe(false);
  });

  it("rejects non-square canvas", () => {
    const result = validateDotArtJson({
      palette: { R: "#FF0000" },
      rows: ["RR", "RR", "RR"],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("square"))).toBe(true);
  });

  it("rejects dot in palette", () => {
    const result = validateDotArtJson({
      palette: { ".": "#000000" },
      rows: [".."],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid hex color", () => {
    const result = validateDotArtJson({
      palette: { R: "red" },
      rows: ["R"],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects undefined key in rows", () => {
    const result = validateDotArtJson({
      palette: { R: "#FF0000" },
      rows: ["RX"],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Undefined key"))).toBe(true);
  });

  it("rejects inconsistent row lengths", () => {
    const result = validateDotArtJson({
      palette: { R: "#FF0000" },
      rows: ["RR", "R"],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects multi-char palette key", () => {
    const result = validateDotArtJson({
      palette: { RR: "#FF0000" },
      rows: [".."],
    });
    expect(result.valid).toBe(false);
  });

  it("accepts valid layered JSON via validateDotArtJson", () => {
    const result = validateDotArtJson({
      palette: { R: "#FF0000" },
      layers: [
        { name: "Layer 1", visible: true, rows: ["R.", ".R"] },
      ],
    });
    expect(result.valid).toBe(true);
  });
});

describe("roundtrip", () => {
  it("gridToJson -> jsonToGrid preserves data", () => {
    const originalGrid = [
      ["R", "G", "."],
      [".", "R", "G"],
      ["G", ".", "R"],
    ];
    const palette: PaletteEntry[] = [
      { key: "R", color: "#FF0000" },
      { key: "G", color: "#00FF00" },
    ];
    const json = gridToJson(originalGrid, palette);
    const result = jsonToGrid(json);
    expect(result.grid).toEqual(originalGrid);
    expect(result.size).toBe(3);
  });
});

describe("layersToJson", () => {
  it("converts layers and palette to LayeredDotArtJson", () => {
    const layers: Layer[] = [
      { name: "bg", visible: true, grid: [["R", "."], [".", "R"]] },
      { name: "fg", visible: false, grid: [[".", "G"], ["G", "."]] },
    ];
    const palette: PaletteEntry[] = [
      { key: "R", color: "#FF0000" },
      { key: "G", color: "#00FF00" },
      { key: "B", color: "#0000FF" },
    ];
    const json = layersToJson(layers, palette);
    expect(json.palette).toEqual({ R: "#FF0000", G: "#00FF00" });
    expect(json.layers).toHaveLength(2);
    expect(json.layers[0]).toEqual({ name: "bg", visible: true, rows: ["R.", ".R"] });
    expect(json.layers[1]).toEqual({ name: "fg", visible: false, rows: [".G", "G."] });
  });

  it("excludes unused palette entries across all layers", () => {
    const layers: Layer[] = [
      { name: "empty", visible: true, grid: [[".", "."], [".", "."]] },
    ];
    const palette: PaletteEntry[] = [{ key: "R", color: "#FF0000" }];
    const json = layersToJson(layers, palette);
    expect(json.palette).toEqual({});
  });
});

describe("validateLayeredDotArtJson", () => {
  it("accepts valid layered JSON", () => {
    const result = validateLayeredDotArtJson({
      palette: { R: "#FF0000", G: "#00FF00" },
      layers: [
        { name: "bg", visible: true, rows: ["R.", ".R"] },
        { name: "fg", visible: true, rows: [".G", "G."] },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects empty layers array", () => {
    const result = validateLayeredDotArtJson({
      palette: { R: "#FF0000" },
      layers: [],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects layer with wrong size", () => {
    const result = validateLayeredDotArtJson({
      palette: { R: "#FF0000" },
      layers: [
        { name: "bg", visible: true, rows: ["R.", ".R"] },
        { name: "fg", visible: true, rows: ["R"] },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects undefined key in layer rows", () => {
    const result = validateLayeredDotArtJson({
      palette: { R: "#FF0000" },
      layers: [
        { name: "bg", visible: true, rows: ["RX", ".R"] },
      ],
    });
    expect(result.valid).toBe(false);
  });
});

describe("isLayeredJson", () => {
  it("returns true for layered JSON", () => {
    expect(isLayeredJson({ palette: {}, layers: [] })).toBe(true);
  });

  it("returns false for flat JSON", () => {
    expect(isLayeredJson({ palette: {}, rows: [] })).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isLayeredJson(null)).toBe(false);
    expect(isLayeredJson("string")).toBe(false);
  });
});
