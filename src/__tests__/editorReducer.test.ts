import { describe, it, expect } from "vitest";
import { editorReducer, createInitialState, createEmptyGrid } from "../state/editorReducer";
import type { EditorState } from "../state/types";

function makeState(overrides: Partial<EditorState> = {}): EditorState {
  return { ...createInitialState(4), ...overrides };
}

describe("editorReducer", () => {
  describe("SET_PIXEL", () => {
    it("sets a pixel and creates an undo entry", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      expect(next.grid[0][0]).toBe("R");
      expect(next.undoStack).toHaveLength(1);
      expect(next.redoStack).toHaveLength(0);
    });

    it("ignores out-of-bounds coordinates", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "SET_PIXEL", row: -1, col: 0, key: "R" });
      expect(next).toBe(state);
    });

    it("ignores setting same value", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "." });
      expect(next).toBe(state);
    });
  });

  describe("SET_PIXELS", () => {
    it("sets multiple pixels in a batch", () => {
      const state = makeState();
      const next = editorReducer(state, {
        type: "SET_PIXELS",
        pixels: [
          { row: 0, col: 0, key: "R" },
          { row: 1, col: 1, key: "G" },
        ],
      });
      expect(next.grid[0][0]).toBe("R");
      expect(next.grid[1][1]).toBe("G");
      expect(next.undoStack).toHaveLength(1);
    });

    it("ignores empty batch", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "SET_PIXELS", pixels: [] });
      expect(next).toBe(state);
    });
  });

  describe("UNDO / REDO", () => {
    it("undoes and redoes a pixel change", () => {
      let state = makeState();
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      expect(state.grid[0][0]).toBe("R");

      state = editorReducer(state, { type: "UNDO" });
      expect(state.grid[0][0]).toBe(".");
      expect(state.redoStack).toHaveLength(1);

      state = editorReducer(state, { type: "REDO" });
      expect(state.grid[0][0]).toBe("R");
    });

    it("undo on empty stack is no-op", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "UNDO" });
      expect(next).toBe(state);
    });
  });

  describe("SET_CANVAS_SIZE", () => {
    it("resizes grid preserving existing pixels", () => {
      let state = makeState({ ...createInitialState(16) });
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      state = editorReducer(state, { type: "SET_CANVAS_SIZE", size: 32 });
      expect(state.canvasSize).toBe(32);
      expect(state.grid.length).toBe(32);
      expect(state.grid[0].length).toBe(32);
      expect(state.grid[0][0]).toBe("R");
    });

    it("clamps to min 10", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "SET_CANVAS_SIZE", size: 3 });
      expect(next.canvasSize).toBe(10);
    });

    it("clamps to max 1000", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "SET_CANVAS_SIZE", size: 2000 });
      expect(next.canvasSize).toBe(1000);
    });
  });

  describe("IMPORT_JSON", () => {
    it("imports a valid JSON structure", () => {
      const state = makeState();
      const next = editorReducer(state, {
        type: "IMPORT_JSON",
        data: {
          palette: { R: "#FF0000", G: "#00FF00" },
          rows: ["RG.", ".R.", "..G"],
        },
      });
      expect(next.canvasSize).toBe(3);
      expect(next.grid[0]).toEqual(["R", "G", "."]);
      expect(next.palette).toEqual([
        { key: "R", color: "#FF0000" },
        { key: "G", color: "#00FF00" },
      ]);
    });
  });

  describe("palette operations", () => {
    it("ADD_PALETTE_ENTRY adds a new color", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "ADD_PALETTE_ENTRY", key: "P", color: "#800080" });
      expect(next.palette.find((p) => p.key === "P")).toEqual({ key: "P", color: "#800080" });
    });

    it("ADD_PALETTE_ENTRY rejects duplicate key", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "ADD_PALETTE_ENTRY", key: "K", color: "#111111" });
      expect(next).toBe(state);
    });

    it("ADD_PALETTE_ENTRY rejects dot key", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "ADD_PALETTE_ENTRY", key: ".", color: "#000000" });
      expect(next).toBe(state);
    });

    it("REMOVE_PALETTE_ENTRY clears affected pixels", () => {
      let state = makeState();
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      state = editorReducer(state, { type: "REMOVE_PALETTE_ENTRY", key: "R" });
      expect(state.grid[0][0]).toBe(".");
      expect(state.palette.find((p) => p.key === "R")).toBeUndefined();
    });

    it("UPDATE_PALETTE_COLOR changes the hex value", () => {
      const state = makeState();
      const next = editorReducer(state, {
        type: "UPDATE_PALETTE_COLOR",
        key: "R",
        color: "#FF5555",
      });
      expect(next.palette.find((p) => p.key === "R")?.color).toBe("#FF5555");
    });
  });

  describe("tool and view", () => {
    it("SET_TOOL changes active tool", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "SET_TOOL", tool: "eraser" });
      expect(next.activeTool).toBe("eraser");
    });

    it("SET_COLOR changes selected color", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "SET_COLOR", key: "B" });
      expect(next.selectedColor).toBe("B");
    });

    it("TOGGLE_GRID flips showGrid", () => {
      const state = makeState();
      expect(state.showGrid).toBe(true);
      const next = editorReducer(state, { type: "TOGGLE_GRID" });
      expect(next.showGrid).toBe(false);
    });

    it("SET_ZOOM clamps between 1 and 100", () => {
      const state = makeState();
      expect(editorReducer(state, { type: "SET_ZOOM", zoom: 0 }).zoom).toBe(1);
      expect(editorReducer(state, { type: "SET_ZOOM", zoom: 200 }).zoom).toBe(100);
      expect(editorReducer(state, { type: "SET_ZOOM", zoom: 50 }).zoom).toBe(50);
    });
  });

  describe("createEmptyGrid", () => {
    it("creates a grid of dots", () => {
      const grid = createEmptyGrid(3);
      expect(grid).toEqual([
        [".", ".", "."],
        [".", ".", "."],
        [".", ".", "."],
      ]);
    });
  });
});
