/** Maximum number of undo entries kept in history */
export const MAX_UNDO = 50;

/** Maximum cells filled in a single flood fill operation */
export const MAX_FILL_CELLS = 500_000;

/** Minimum canvas size (in pixels) */
export const MIN_CANVAS_SIZE = 10;

/** Maximum canvas size (in pixels) */
export const MAX_CANVAS_SIZE = 1000;

/** Minimum zoom level (allow fractional zoom so large canvases fit on small screens) */
export const MIN_ZOOM = 0.1;

/** Maximum zoom level */
export const MAX_ZOOM = 100;

/** Maximum length for layer names */
export const MAX_LAYER_NAME_LENGTH = 50;

/** Debounce delay (ms) for auto-saving state to localStorage */
export const SAVE_DEBOUNCE_MS = 500;

/** Target pixel size for PNG export (longest edge) */
export const PNG_EXPORT_TARGET_SIZE = 512;
