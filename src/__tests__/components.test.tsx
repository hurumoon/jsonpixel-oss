import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditorProvider } from "../state/editorContext";
import Toolbar from "../components/Toolbar";
import PalettePanel from "../components/PalettePanel";
import SizeControl from "../components/SizeControl";
import ImportExportPanel from "../components/ImportExportPanel";

function renderWithProvider(ui: React.ReactElement) {
  return render(<EditorProvider>{ui}</EditorProvider>);
}

describe("Toolbar", () => {
  it("renders all tool buttons", () => {
    renderWithProvider(<Toolbar />);
    expect(screen.getByText("Pen")).toBeInTheDocument();
    expect(screen.getByText("Eraser")).toBeInTheDocument();
    expect(screen.getByText("Fill")).toBeInTheDocument();
    expect(screen.getByText("Pick")).toBeInTheDocument();
  });

  it("renders grid toggle", () => {
    renderWithProvider(<Toolbar />);
    expect(screen.getByText("Grid")).toBeInTheDocument();
  });

  it("renders undo/redo buttons", () => {
    renderWithProvider(<Toolbar />);
    expect(screen.getByText("Undo")).toBeInTheDocument();
    expect(screen.getByText("Redo")).toBeInTheDocument();
  });

  it("undo/redo are disabled initially", () => {
    renderWithProvider(<Toolbar />);
    expect(screen.getByText("Undo")).toBeDisabled();
    expect(screen.getByText("Redo")).toBeDisabled();
  });

  it("pen is active by default", () => {
    renderWithProvider(<Toolbar />);
    expect(screen.getByText("Pen").className).toContain("active");
  });

  it("clicking a tool changes active state", () => {
    renderWithProvider(<Toolbar />);
    fireEvent.click(screen.getByText("Eraser"));
    expect(screen.getByText("Eraser").className).toContain("active");
    expect(screen.getByText("Pen").className).not.toContain("active");
  });
});

describe("PalettePanel", () => {
  it("renders default palette entries", () => {
    renderWithProvider(<PalettePanel />);
    expect(screen.getByText("K")).toBeInTheDocument();
    expect(screen.getByText("W")).toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument();
  });

  it("renders add button", () => {
    renderWithProvider(<PalettePanel />);
    expect(screen.getByText(/\+ Add/)).toBeInTheDocument();
  });

  it("renders remove buttons for each entry", () => {
    renderWithProvider(<PalettePanel />);
    const removeButtons = screen.getAllByText("x");
    expect(removeButtons.length).toBeGreaterThanOrEqual(6);
  });
});

describe("SizeControl", () => {
  it("renders size input with default value", () => {
    renderWithProvider(<SizeControl />);
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveValue(16);
  });

  it("renders apply button", () => {
    renderWithProvider(<SizeControl />);
    expect(screen.getByText("Apply")).toBeInTheDocument();
  });
});

describe("ImportExportPanel", () => {
  it("renders all buttons", () => {
    renderWithProvider(<ImportExportPanel />);
    expect(screen.getByText("Export")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
    expect(screen.getByText("Download")).toBeInTheDocument();
    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.getByText("PNG")).toBeInTheDocument();
    expect(screen.getByText("Load File")).toBeInTheDocument();
  });

  it("renders JSON textarea", () => {
    renderWithProvider(<ImportExportPanel />);
    expect(screen.getByPlaceholderText("JSON...")).toBeInTheDocument();
  });

  it("export populates textarea with valid JSON", () => {
    renderWithProvider(<ImportExportPanel />);
    fireEvent.click(screen.getByText("Export"));
    const textarea = screen.getByPlaceholderText("JSON...") as HTMLTextAreaElement;
    const parsed = JSON.parse(textarea.value);
    expect(parsed).toHaveProperty("palette");
    expect(parsed).toHaveProperty("rows");
    expect(Array.isArray(parsed.rows)).toBe(true);
  });

  it("import with invalid JSON shows error", () => {
    renderWithProvider(<ImportExportPanel />);
    const textarea = screen.getByPlaceholderText("JSON...") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "not json" } });
    fireEvent.click(screen.getByText("Import"));
    expect(screen.getByText("Failed to parse JSON")).toBeInTheDocument();
  });

  it("import with valid JSON does not show error", () => {
    renderWithProvider(<ImportExportPanel />);
    const textarea = screen.getByPlaceholderText("JSON...");
    const json = JSON.stringify({
      palette: { R: "#FF0000" },
      rows: ["R.", ".R"],
    });
    fireEvent.change(textarea, { target: { value: json } });
    fireEvent.click(screen.getByText("Import"));
    expect(screen.queryByText("Failed to parse JSON")).not.toBeInTheDocument();
  });
});
