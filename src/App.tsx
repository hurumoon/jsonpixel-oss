import { useEffect, useState } from "react";
import { EditorProvider, useEditor } from "./state/editorContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Toolbar from "./components/Toolbar";
import PalettePanel from "./components/PalettePanel";
import LayerPanel from "./components/LayerPanel";
import SizeControl from "./components/SizeControl";
import ImportExportPanel from "./components/ImportExportPanel";
import PixelCanvas from "./components/PixelCanvas";

function KeyboardHandler() {
  const { dispatch } = useEditor();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          dispatch({ type: "UNDO" });
        } else if (e.key === "y") {
          e.preventDefault();
          dispatch({ type: "REDO" });
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "b":
          dispatch({ type: "SET_TOOL", tool: "pen" });
          break;
        case "e":
          dispatch({ type: "SET_TOOL", tool: "eraser" });
          break;
        case "g":
          dispatch({ type: "SET_TOOL", tool: "fill" });
          break;
        case "i":
          dispatch({ type: "SET_TOOL", tool: "eyedropper" });
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch]);

  return null;
}

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app">
      <KeyboardHandler />
      <header>
        <h1 className="visually-hidden">JsonPixel - Dot Art Editor</h1>
        <Toolbar />
      </header>
      <div className="main-area">
        <div
          className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <LayerPanel />
          <PalettePanel />
          <SizeControl />
          <ImportExportPanel />
        </aside>
        <main>
          <PixelCanvas />
        </main>
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? "\u2715" : "\u2630"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <EditorProvider>
        <AppContent />
      </EditorProvider>
    </ErrorBoundary>
  );
}
