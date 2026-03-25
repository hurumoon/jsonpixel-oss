import { describe, it, expect } from "vitest";
import { editorReducer, createInitialState, createEmptyGrid, flattenLayers } from "../state/editorReducer";
import type { EditorState } from "../state/types";
import { MAX_UNDO, MIN_CANVAS_SIZE, MAX_CANVAS_SIZE, MIN_ZOOM, MAX_ZOOM } from "../constants";

function makeState(overrides: Partial<EditorState> = {}): EditorState {
  return { ...createInitialState(4), ...overrides };
}

describe("editorReducer", () => {
  describe("SET_PIXEL", () => {
    it("sets a pixel and creates an undo entry", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      expect(next.layers[0].grid[0][0]).toBe("R");
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
      expect(next.layers[0].grid[0][0]).toBe("R");
      expect(next.layers[0].grid[1][1]).toBe("G");
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
      expect(state.layers[0].grid.length).toBe(32);
      expect(state.layers[0].grid[0].length).toBe(32);
      expect(state.layers[0].grid[0][0]).toBe("R");
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
      expect(next.layers).toHaveLength(1);
      expect(next.layers[0].grid[0]).toEqual(["R", "G", "."]);
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

    it("REMOVE_PALETTE_ENTRY clears affected pixels in all layers", () => {
      let state = makeState();
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      state = editorReducer(state, { type: "REMOVE_PALETTE_ENTRY", key: "R" });
      expect(state.layers[0].grid[0][0]).toBe(".");
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

  describe("CLEAR_CANVAS", () => {
    it("clears active layer pixels and creates undo entry", () => {
      let state = makeState();
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      state = editorReducer(state, { type: "SET_PIXEL", row: 1, col: 1, key: "G" });
      const next = editorReducer(state, { type: "CLEAR_CANVAS" });
      expect(next.layers[0].grid.every((row) => row.every((c) => c === "."))).toBe(true);
      expect(next.grid.every((row) => row.every((c) => c === "."))).toBe(true);
      expect(next.undoStack.length).toBe(state.undoStack.length + 1);
      expect(next.redoStack).toHaveLength(0);
    });

    it("is a no-op on an already empty canvas", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "CLEAR_CANVAS" });
      expect(next).toBe(state);
    });

    it("can be undone to restore previous state", () => {
      let state = makeState();
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      state = editorReducer(state, { type: "CLEAR_CANVAS" });
      expect(state.grid[0][0]).toBe(".");
      state = editorReducer(state, { type: "UNDO" });
      expect(state.grid[0][0]).toBe("R");
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

describe("layer operations", () => {
  describe("ADD_LAYER", () => {
    it("adds a new empty layer and sets it active", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "ADD_LAYER" });
      expect(next.layers).toHaveLength(2);
      expect(next.activeLayerIndex).toBe(1);
      expect(next.layers[1].name).toBe("Layer 2");
      expect(next.layers[1].visible).toBe(true);
      expect(next.layers[1].grid.every((row) => row.every((c) => c === "."))).toBe(true);
    });
  });

  describe("REMOVE_LAYER", () => {
    it("removes a layer (not the last one)", () => {
      let state = makeState();
      state = editorReducer(state, { type: "ADD_LAYER" });
      expect(state.layers).toHaveLength(2);
      const next = editorReducer(state, { type: "REMOVE_LAYER", index: 1 });
      expect(next.layers).toHaveLength(1);
      expect(next.activeLayerIndex).toBe(0);
    });

    it("does not remove the only layer", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "REMOVE_LAYER", index: 0 });
      expect(next).toBe(state);
    });

    it("adjusts activeLayerIndex when removing below it", () => {
      let state = makeState();
      state = editorReducer(state, { type: "ADD_LAYER" });
      state = editorReducer(state, { type: "ADD_LAYER" });
      state = editorReducer(state, { type: "SET_ACTIVE_LAYER", index: 2 });
      const next = editorReducer(state, { type: "REMOVE_LAYER", index: 0 });
      expect(next.layers).toHaveLength(2);
      expect(next.activeLayerIndex).toBe(1);
    });
  });

  describe("SET_ACTIVE_LAYER", () => {
    it("changes active layer", () => {
      let state = makeState();
      state = editorReducer(state, { type: "ADD_LAYER" });
      const next = editorReducer(state, { type: "SET_ACTIVE_LAYER", index: 0 });
      expect(next.activeLayerIndex).toBe(0);
    });

    it("ignores out-of-bounds index", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "SET_ACTIVE_LAYER", index: 5 });
      expect(next).toBe(state);
    });
  });

  describe("TOGGLE_LAYER_VISIBILITY", () => {
    it("toggles visibility and updates composite grid", () => {
      let state = makeState();
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      expect(state.grid[0][0]).toBe("R");
      const next = editorReducer(state, { type: "TOGGLE_LAYER_VISIBILITY", index: 0 });
      expect(next.layers[0].visible).toBe(false);
      expect(next.grid[0][0]).toBe(".");
    });
  });

  describe("RENAME_LAYER", () => {
    it("renames a layer", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "RENAME_LAYER", index: 0, name: "Background" });
      expect(next.layers[0].name).toBe("Background");
    });
  });

  describe("MOVE_LAYER", () => {
    it("moves a layer up", () => {
      let state = makeState();
      state = editorReducer(state, { type: "ADD_LAYER" });
      state = editorReducer(state, { type: "SET_ACTIVE_LAYER", index: 0 });
      const next = editorReducer(state, { type: "MOVE_LAYER", fromIndex: 0, toIndex: 1 });
      expect(next.layers[1].name).toBe("Layer 1");
      expect(next.layers[0].name).toBe("Layer 2");
      expect(next.activeLayerIndex).toBe(1);
    });

    it("ignores same index", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "MOVE_LAYER", fromIndex: 0, toIndex: 0 });
      expect(next).toBe(state);
    });
  });

  describe("MERGE_LAYER_DOWN", () => {
    it("merges upper layer into lower layer", () => {
      let state = makeState();
      // Draw on layer 1
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      // Add layer 2 and draw on it
      state = editorReducer(state, { type: "ADD_LAYER" });
      state = editorReducer(state, { type: "SET_PIXEL", row: 1, col: 1, key: "G" });
      expect(state.layers).toHaveLength(2);
      // Merge layer 2 down into layer 1
      const next = editorReducer(state, { type: "MERGE_LAYER_DOWN", index: 1 });
      expect(next.layers).toHaveLength(1);
      expect(next.layers[0].grid[0][0]).toBe("R");
      expect(next.layers[0].grid[1][1]).toBe("G");
    });

    it("cannot merge the bottom layer", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "MERGE_LAYER_DOWN", index: 0 });
      expect(next).toBe(state);
    });

    it("upper layer pixel overwrites lower layer pixel", () => {
      let state = makeState();
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      state = editorReducer(state, { type: "ADD_LAYER" });
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "G" });
      const next = editorReducer(state, { type: "MERGE_LAYER_DOWN", index: 1 });
      expect(next.layers[0].grid[0][0]).toBe("G");
    });
  });

  describe("multi-layer drawing", () => {
    it("draws on active layer only", () => {
      let state = makeState();
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      state = editorReducer(state, { type: "ADD_LAYER" });
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "G" });
      // Layer 0 still has R, layer 1 has G
      expect(state.layers[0].grid[0][0]).toBe("R");
      expect(state.layers[1].grid[0][0]).toBe("G");
      // Composite shows topmost (G)
      expect(state.grid[0][0]).toBe("G");
    });

    it("undo restores correct layer", () => {
      let state = makeState();
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      state = editorReducer(state, { type: "ADD_LAYER" });
      state = editorReducer(state, { type: "SET_PIXEL", row: 1, col: 1, key: "G" });
      // Undo should revert layer 1's pixel
      state = editorReducer(state, { type: "UNDO" });
      expect(state.layers[1].grid[1][1]).toBe(".");
      expect(state.grid[1][1]).toBe(".");
    });
  });

  describe("flattenLayers", () => {
    it("composites visible layers bottom to top", () => {
      const layers = [
        { name: "bg", visible: true, grid: [["R", "."], [".", "."]] },
        { name: "fg", visible: true, grid: [[".", "G"], [".", "."]] },
      ];
      const flat = flattenLayers(layers, 2);
      expect(flat).toEqual([["R", "G"], [".", "."]]);
    });

    it("skips hidden layers", () => {
      const layers = [
        { name: "bg", visible: true, grid: [["R", "."], [".", "."]] },
        { name: "fg", visible: false, grid: [["G", "G"], ["G", "G"]] },
      ];
      const flat = flattenLayers(layers, 2);
      expect(flat).toEqual([["R", "."], [".", "."]]);
    });

    it("upper layer overwrites lower layer", () => {
      const layers = [
        { name: "bg", visible: true, grid: [["R"]] },
        { name: "fg", visible: true, grid: [["G"]] },
      ];
      const flat = flattenLayers(layers, 1);
      expect(flat).toEqual([["G"]]);
    });
  });

  describe("IMPORT_LAYERED_JSON", () => {
    it("imports a layered JSON structure", () => {
      const state = makeState();
      const next = editorReducer(state, {
        type: "IMPORT_LAYERED_JSON",
        data: {
          palette: { R: "#FF0000", G: "#00FF00" },
          layers: [
            { name: "Background", visible: true, rows: ["R.", ".R"] },
            { name: "Foreground", visible: true, rows: [".G", "G."] },
          ],
        },
      });
      expect(next.canvasSize).toBe(2);
      expect(next.layers).toHaveLength(2);
      expect(next.layers[0].name).toBe("Background");
      expect(next.layers[0].grid[0]).toEqual(["R", "."]);
      expect(next.layers[1].name).toBe("Foreground");
      expect(next.layers[1].grid[0]).toEqual([".", "G"]);
      expect(next.grid).toEqual([["R", "G"], ["G", "R"]]);
    });
  });

  describe("MOVE_LAYER edge cases", () => {
    it("ignores out-of-bounds toIndex", () => {
      let state = makeState();
      state = editorReducer(state, { type: "ADD_LAYER" });
      const next = editorReducer(state, { type: "MOVE_LAYER", fromIndex: 0, toIndex: 5 });
      expect(next).toBe(state);
    });

    it("ignores negative fromIndex", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "MOVE_LAYER", fromIndex: -1, toIndex: 0 });
      expect(next).toBe(state);
    });

    it("adjusts activeLayerIndex when moving layer from above active to below", () => {
      let state = makeState();
      state = editorReducer(state, { type: "ADD_LAYER" });
      state = editorReducer(state, { type: "ADD_LAYER" });
      // Active is layer 2, move layer 2 to 0
      state = editorReducer(state, { type: "SET_ACTIVE_LAYER", index: 1 });
      const next = editorReducer(state, { type: "MOVE_LAYER", fromIndex: 2, toIndex: 0 });
      expect(next.activeLayerIndex).toBe(2);
    });

    it("updates composite grid after move", () => {
      let state = makeState();
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      state = editorReducer(state, { type: "ADD_LAYER" });
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "G" });
      // Layer 1 (G) is on top, grid shows G
      expect(state.grid[0][0]).toBe("G");
      // Move layer 1 below layer 0
      const next = editorReducer(state, { type: "MOVE_LAYER", fromIndex: 1, toIndex: 0 });
      // Now layer 0 (R, originally index 0) is on top
      expect(next.grid[0][0]).toBe("R");
    });
  });

  describe("MERGE_LAYER_DOWN edge cases", () => {
    it("ignores out-of-bounds index", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "MERGE_LAYER_DOWN", index: 5 });
      expect(next).toBe(state);
    });

    it("adjusts activeLayerIndex when merging active layer", () => {
      let state = makeState();
      state = editorReducer(state, { type: "ADD_LAYER" });
      state = editorReducer(state, { type: "ADD_LAYER" });
      // Active is layer 2
      const next = editorReducer(state, { type: "MERGE_LAYER_DOWN", index: 2 });
      expect(next.layers).toHaveLength(2);
      expect(next.activeLayerIndex).toBe(1);
    });

    it("preserves empty cells from upper layer during merge", () => {
      let state = makeState();
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "R" });
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 1, key: "G" });
      state = editorReducer(state, { type: "ADD_LAYER" });
      // Upper layer has only one pixel at (0,0)
      state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: 0, key: "B" });
      const next = editorReducer(state, { type: "MERGE_LAYER_DOWN", index: 1 });
      // (0,0) should be overwritten by upper, (0,1) preserved from lower
      expect(next.layers[0].grid[0][0]).toBe("B");
      expect(next.layers[0].grid[0][1]).toBe("G");
    });
  });

  describe("RENAME_LAYER edge cases", () => {
    it("ignores out-of-bounds index", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "RENAME_LAYER", index: 5, name: "test" });
      expect(next).toBe(state);
    });

    it("ignores negative index", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "RENAME_LAYER", index: -1, name: "test" });
      expect(next).toBe(state);
    });
  });

  describe("TOGGLE_LAYER_VISIBILITY edge cases", () => {
    it("ignores out-of-bounds index", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "TOGGLE_LAYER_VISIBILITY", index: 5 });
      expect(next).toBe(state);
    });
  });

  describe("TOGGLE_BOLD_GRID", () => {
    it("toggles boldGrid", () => {
      const state = makeState();
      expect(state.boldGrid).toBe(false);
      const next = editorReducer(state, { type: "TOGGLE_BOLD_GRID" });
      expect(next.boldGrid).toBe(true);
      const next2 = editorReducer(next, { type: "TOGGLE_BOLD_GRID" });
      expect(next2.boldGrid).toBe(false);
    });
  });

  describe("SET_PAN", () => {
    it("clamps pan offset to canvas bounds", () => {
      const state = makeState();
      const totalPx = state.canvasSize * state.zoom;
      const next = editorReducer(state, { type: "SET_PAN", x: totalPx + 100, y: -(totalPx + 100) });
      expect(next.panOffset.x).toBe(totalPx);
      expect(next.panOffset.y).toBe(-totalPx);
    });
  });

  describe("SET_VIEW", () => {
    it("clamps zoom and pan simultaneously", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "SET_VIEW", zoom: 200, x: 999999, y: -999999 });
      expect(next.zoom).toBe(MAX_ZOOM);
      const total = state.canvasSize * MAX_ZOOM;
      expect(next.panOffset.x).toBe(total);
      expect(next.panOffset.y).toBe(-total);
    });

    it("clamps minimum zoom", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "SET_VIEW", zoom: -5, x: 0, y: 0 });
      expect(next.zoom).toBe(MIN_ZOOM);
    });
  });

  describe("REMOVE_LAYER edge cases", () => {
    it("ignores out-of-bounds index", () => {
      let state = makeState();
      state = editorReducer(state, { type: "ADD_LAYER" });
      const next = editorReducer(state, { type: "REMOVE_LAYER", index: 5 });
      expect(next).toBe(state);
    });

    it("ignores negative index", () => {
      let state = makeState();
      state = editorReducer(state, { type: "ADD_LAYER" });
      const next = editorReducer(state, { type: "REMOVE_LAYER", index: -1 });
      expect(next).toBe(state);
    });

    it("clamps activeLayerIndex when removing the last layer", () => {
      let state = makeState();
      state = editorReducer(state, { type: "ADD_LAYER" });
      // Active is layer 1 (last)
      expect(state.activeLayerIndex).toBe(1);
      const next = editorReducer(state, { type: "REMOVE_LAYER", index: 1 });
      expect(next.layers).toHaveLength(1);
      expect(next.activeLayerIndex).toBe(0);
    });
  });

  describe("undo stack limit", () => {
    it("limits undo stack to MAX_UNDO entries", () => {
      let state = makeState();
      for (let i = 0; i < MAX_UNDO + 10; i++) {
        state = editorReducer(state, { type: "SET_PIXEL", row: 0, col: i % state.canvasSize, key: i % 2 === 0 ? "R" : "." });
      }
      expect(state.undoStack.length).toBeLessThanOrEqual(MAX_UNDO);
    });
  });

  describe("constants are used correctly", () => {
    it("SET_CANVAS_SIZE clamps to MIN_CANVAS_SIZE", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "SET_CANVAS_SIZE", size: 1 });
      expect(next.canvasSize).toBe(MIN_CANVAS_SIZE);
    });

    it("SET_CANVAS_SIZE clamps to MAX_CANVAS_SIZE", () => {
      const state = makeState();
      const next = editorReducer(state, { type: "SET_CANVAS_SIZE", size: 9999 });
      expect(next.canvasSize).toBe(MAX_CANVAS_SIZE);
    });

    it("SET_ZOOM clamps to MIN_ZOOM and MAX_ZOOM", () => {
      const state = makeState();
      expect(editorReducer(state, { type: "SET_ZOOM", zoom: -10 }).zoom).toBe(MIN_ZOOM);
      expect(editorReducer(state, { type: "SET_ZOOM", zoom: 999 }).zoom).toBe(MAX_ZOOM);
    });
  });
});
