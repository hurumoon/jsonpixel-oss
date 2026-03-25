import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCanvasInteraction } from "./useCanvasInteraction";
import type { EditorState, EditorAction } from "../state/types";
import type { Dispatch } from "react";
import { createInitialState } from "../state/editorReducer";

function makeState(overrides: Partial<EditorState> = {}): EditorState {
  return { ...createInitialState(16), ...overrides };
}

function makePointerEvent(
  _type: string,
  overrides: Partial<PointerEvent> & { clientX?: number; clientY?: number } = {},
): React.PointerEvent {
  return {
    clientX: 0,
    clientY: 0,
    button: 0,
    pointerId: 1,
    pointerType: "mouse",
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as React.PointerEvent;
}

function makeWheelEvent(
  overrides: Partial<WheelEvent> & { clientX?: number; clientY?: number } = {},
): React.WheelEvent {
  return {
    clientX: 0,
    clientY: 0,
    deltaY: -100,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as React.WheelEvent;
}

describe("useCanvasInteraction", () => {
  let dispatch: Mock & Dispatch<EditorAction>;
  let canvasRef: { current: HTMLCanvasElement | null };

  beforeEach(() => {
    dispatch = vi.fn();
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 400,
      height: 400,
      right: 400,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    canvasRef = { current: canvas };
  });

  it("returns pointer event handlers instead of mouse event handlers", () => {
    const state = makeState();
    const { result } = renderHook(() => useCanvasInteraction(state, dispatch, canvasRef));

    expect(result.current).toHaveProperty("onPointerDown");
    expect(result.current).toHaveProperty("onPointerMove");
    expect(result.current).toHaveProperty("onPointerUp");
    expect(result.current).toHaveProperty("onWheel");
    expect(result.current).toHaveProperty("strokePixels");
    // Should NOT have old mouse handlers
    expect(result.current).not.toHaveProperty("onMouseDown");
    expect(result.current).not.toHaveProperty("onMouseMove");
    expect(result.current).not.toHaveProperty("onMouseUp");
  });

  it("draws on pointer down with pen tool", () => {
    const state = makeState({ zoom: 20, panOffset: { x: 0, y: 0 } });
    const { result } = renderHook(() => useCanvasInteraction(state, dispatch, canvasRef));

    act(() => {
      result.current.onPointerDown(
        makePointerEvent("pointerdown", { clientX: 30, clientY: 50 }),
      );
    });

    // Should have started drawing — strokePixels should have an entry
    expect(result.current.strokePixels.current.size).toBeGreaterThan(0);
  });

  it("commits stroke pixels on pointer up", () => {
    const state = makeState({ zoom: 20, panOffset: { x: 0, y: 0 } });
    const { result } = renderHook(() => useCanvasInteraction(state, dispatch, canvasRef));

    act(() => {
      result.current.onPointerDown(
        makePointerEvent("pointerdown", { clientX: 30, clientY: 50 }),
      );
    });
    act(() => {
      result.current.onPointerUp(makePointerEvent("pointerup"));
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SET_PIXELS" }),
    );
  });

  it("pans on middle button drag", () => {
    const state = makeState({ panOffset: { x: 100, y: 100 } });
    const { result } = renderHook(() => useCanvasInteraction(state, dispatch, canvasRef));

    act(() => {
      result.current.onPointerDown(
        makePointerEvent("pointerdown", { button: 1, clientX: 200, clientY: 200 }),
      );
    });
    act(() => {
      result.current.onPointerMove(
        makePointerEvent("pointermove", { button: 1, clientX: 210, clientY: 215 }),
      );
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SET_PAN" }),
    );
  });

  it("handles wheel zoom", () => {
    const state = makeState({ zoom: 20, panOffset: { x: 0, y: 0 } });
    const { result } = renderHook(() => useCanvasInteraction(state, dispatch, canvasRef));

    act(() => {
      result.current.onWheel(makeWheelEvent({ deltaY: -100, clientX: 100, clientY: 100 }));
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SET_VIEW" }),
    );
  });

  it("handles touch pointer events (pointerType=touch)", () => {
    const state = makeState({ zoom: 20, panOffset: { x: 0, y: 0 } });
    const { result } = renderHook(() => useCanvasInteraction(state, dispatch, canvasRef));

    // Single touch — should draw
    act(() => {
      result.current.onPointerDown(
        makePointerEvent("pointerdown", {
          pointerId: 1,
          pointerType: "touch",
          clientX: 40,
          clientY: 40,
        }),
      );
    });

    expect(result.current.strokePixels.current.size).toBeGreaterThan(0);
  });

  it("starts pinch gesture when two touch pointers are down", () => {
    const state = makeState({ zoom: 20, panOffset: { x: 0, y: 0 } });
    const { result } = renderHook(() => useCanvasInteraction(state, dispatch, canvasRef));

    // First finger
    act(() => {
      result.current.onPointerDown(
        makePointerEvent("pointerdown", {
          pointerId: 1,
          pointerType: "touch",
          clientX: 100,
          clientY: 200,
        }),
      );
    });

    // Second finger — should switch to pinch mode
    act(() => {
      result.current.onPointerDown(
        makePointerEvent("pointerdown", {
          pointerId: 2,
          pointerType: "touch",
          clientX: 200,
          clientY: 200,
        }),
      );
    });

    // Drawing should have been cancelled
    // strokePixels should be empty because pinch cancelled the stroke
    expect(result.current.strokePixels.current.size).toBe(0);
  });

  it("dispatches SET_VIEW during pinch move", () => {
    const state = makeState({ zoom: 20, panOffset: { x: 0, y: 0 } });
    const { result } = renderHook(() => useCanvasInteraction(state, dispatch, canvasRef));

    // Two fingers down
    act(() => {
      result.current.onPointerDown(
        makePointerEvent("pointerdown", {
          pointerId: 1,
          pointerType: "touch",
          clientX: 100,
          clientY: 200,
        }),
      );
    });
    act(() => {
      result.current.onPointerDown(
        makePointerEvent("pointerdown", {
          pointerId: 2,
          pointerType: "touch",
          clientX: 200,
          clientY: 200,
        }),
      );
    });

    // Move fingers apart (pinch out)
    act(() => {
      result.current.onPointerMove(
        makePointerEvent("pointermove", {
          pointerId: 1,
          pointerType: "touch",
          clientX: 50,
          clientY: 200,
        }),
      );
    });
    act(() => {
      result.current.onPointerMove(
        makePointerEvent("pointermove", {
          pointerId: 2,
          pointerType: "touch",
          clientX: 250,
          clientY: 200,
        }),
      );
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SET_VIEW" }),
    );
  });

  it("uses eyedropper on touch", () => {
    const grid = createInitialState(16).grid;
    grid[2][2] = "R";
    const state = makeState({
      activeTool: "eyedropper",
      zoom: 20,
      panOffset: { x: 0, y: 0 },
      grid,
    });
    const { result } = renderHook(() => useCanvasInteraction(state, dispatch, canvasRef));

    act(() => {
      result.current.onPointerDown(
        makePointerEvent("pointerdown", {
          pointerType: "touch",
          clientX: 45,
          clientY: 45,
        }),
      );
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SET_COLOR", key: "R" }),
    );
  });

  it("calls onFillLimitReached when flood fill hits the limit", async () => {
    const constants = await import("../constants");
    const original = constants.MAX_FILL_CELLS;
    // Set a very low limit so the 16x16 grid triggers it
    Object.defineProperty(constants, "MAX_FILL_CELLS", { value: 3, writable: true });
    try {
      const state = makeState({
        activeTool: "fill",
        zoom: 20,
        panOffset: { x: 0, y: 0 },
        selectedColor: "R",
      });
      const onFillLimitReached = vi.fn();
      const { result } = renderHook(() =>
        useCanvasInteraction(state, dispatch, canvasRef, onFillLimitReached),
      );

      act(() => {
        result.current.onPointerDown(
          makePointerEvent("pointerdown", { clientX: 10, clientY: 10 }),
        );
      });

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "SET_PIXELS" }),
      );
      expect(onFillLimitReached).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(constants, "MAX_FILL_CELLS", { value: original, writable: true });
    }
  });

  it("does not call onFillLimitReached when fill completes within limit", () => {
    // Fill a single isolated cell — well within limit
    const initState = createInitialState(3);
    initState.layers[0].grid[0][0] = ".";
    initState.layers[0].grid[0][1] = "R";
    initState.layers[0].grid[1][0] = "R";
    const state = makeState({
      ...initState,
      activeTool: "fill",
      zoom: 100,
      panOffset: { x: 0, y: 0 },
      selectedColor: "G",
      canvasSize: 3,
    });
    const onFillLimitReached = vi.fn();
    const { result } = renderHook(() =>
      useCanvasInteraction(state, dispatch, canvasRef, onFillLimitReached),
    );

    act(() => {
      result.current.onPointerDown(
        makePointerEvent("pointerdown", { clientX: 50, clientY: 50 }),
      );
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SET_PIXELS" }),
    );
    expect(onFillLimitReached).not.toHaveBeenCalled();
  });
});
