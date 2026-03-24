import { describe, it, expect } from "vitest";
import { gridToJson, jsonToGrid, validateDotArtJson } from "../utils/jsonSerializer";
import type { PaletteEntry } from "../state/types";

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
    expect(result.errors.some((e) => e.includes("正方形"))).toBe(true);
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
    expect(result.errors.some((e) => e.includes("未定義"))).toBe(true);
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
