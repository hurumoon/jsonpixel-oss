import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver for jsdom
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    private cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill OffscreenCanvas for jsdom
if (typeof globalThis.OffscreenCanvas === "undefined") {
  globalThis.OffscreenCanvas = class OffscreenCanvas {
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
    getContext() {
      return null;
    }
    transferToImageBitmap() {
      return null as unknown as ImageBitmap;
    }
    convertToBlob() {
      return Promise.resolve(new Blob());
    }
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return false;
    }
  } as unknown as typeof OffscreenCanvas;
}

// Stub HTMLCanvasElement.getContext for jsdom
const origGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (contextId: string, ...args: unknown[]) {
  if (contextId === "2d") {
    const noop = () => {};
    return {
      fillRect: noop,
      clearRect: noop,
      drawImage: noop,
      resetTransform: noop,
      scale: noop,
      save: noop,
      restore: noop,
      beginPath: noop,
      moveTo: noop,
      lineTo: noop,
      stroke: noop,
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      canvas: this,
    } as unknown as CanvasRenderingContext2D;
  }
  return origGetContext.call(this, contextId as "2d", ...(args as []));
} as typeof origGetContext;

// Stub HTMLCanvasElement.toBlob for jsdom (jsdom's toBlob never calls the callback)
HTMLCanvasElement.prototype.toBlob = function (
  callback: BlobCallback,
  type?: string,
) {
  const pngHeader = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const blob = new Blob([pngHeader], { type: type ?? "image/png" });
  setTimeout(() => callback(blob), 0);
};

// Stub setPointerCapture / releasePointerCapture
if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = function () {};
}
if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = function () {};
}
