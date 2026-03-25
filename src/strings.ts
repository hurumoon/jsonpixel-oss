// Centralized UI strings for the application.
// All user-facing messages should be defined here.

export const STRINGS = {
  // Validation errors (jsonSerializer)
  ERR_NOT_OBJECT: "Not a JSON object",
  ERR_INVALID_PALETTE: "Invalid palette",
  ERR_INVALID_ROWS: "Invalid rows",
  ERR_NOT_SQUARE: (w: number, h: number) => `Not a square (${w}x${h})`,
  ERR_DOT_IN_PALETTE: "Palette must not contain '.'",
  ERR_KEY_NOT_SINGLE_CHAR: (key: string) => `Palette key '${key}' must be a single character`,
  ERR_INVALID_COLOR: (color: string) => `Invalid color: ${color}`,
  ERR_ROW_NOT_STRING: (i: number) => `row[${i}] is not a string`,
  ERR_ROW_LENGTH_MISMATCH: (i: number, actual: number, expected: number) =>
    `row[${i}] length mismatch (${actual} != ${expected})`,
  ERR_UNDEFINED_KEY_IN_ROW: (ch: string, i: number) =>
    `Undefined key '${ch}' in row[${i}]`,

  // Layered validation errors
  ERR_INVALID_LAYERS: "Invalid layers",
  ERR_INVALID_FIRST_LAYER_ROWS: "layers[0] rows are invalid",
  ERR_INVALID_LAYER: (li: number) => `layers[${li}] is invalid`,
  ERR_INVALID_LAYER_NAME: (li: number) => `layers[${li}].name is invalid`,
  ERR_INVALID_LAYER_VISIBLE: (li: number) => `layers[${li}].visible is invalid`,
  ERR_INVALID_LAYER_ROWS: (li: number) => `layers[${li}].rows are invalid`,
  ERR_LAYER_SIZE_MISMATCH: (li: number, actual: number, expected: number) =>
    `layers[${li}] size mismatch (${actual} != ${expected})`,
  ERR_LAYER_ROW_NOT_STRING: (li: number, i: number) =>
    `layers[${li}].rows[${i}] is not a string`,
  ERR_LAYER_ROW_LENGTH_MISMATCH: (li: number, i: number, actual: number, expected: number) =>
    `layers[${li}].rows[${i}] length mismatch (${actual} != ${expected})`,
  ERR_UNDEFINED_KEY_IN_LAYER_ROW: (ch: string, li: number, i: number) =>
    `Undefined key '${ch}' in layers[${li}].rows[${i}]`,

  // Import/Export errors
  ERR_JSON_PARSE_FAILED: "Failed to parse JSON",
  ERR_FILE_READ_FAILED: "Failed to read file",
  ERR_CLIPBOARD_COPY_FAILED: "Failed to copy to clipboard",

  // Canvas / PNG errors
  ERR_CANVAS_CONTEXT: "Could not get Canvas 2D context",
  ERR_PNG_GENERATION: "Failed to generate PNG",

  // Confirmation dialogs
  CONFIRM_RESIZE: (from: number, to: number) =>
    `Resize canvas from ${from} to ${to}. Overflowing pixels will be lost.`,
  CONFIRM_CLEAR_CANVAS: "Clear canvas?",
} as const;
