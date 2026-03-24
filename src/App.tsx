import { useEffect } from "react";
import { EditorProvider, useEditor } from "./state/editorContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Toolbar from "./components/Toolbar";
import PalettePanel from "./components/PalettePanel";
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
  return (
    <div className="app">
      <KeyboardHandler />
      <Toolbar />
      <div className="main-area">
        <div className="sidebar">
          <PalettePanel />
          <SizeControl />
          <ImportExportPanel />
        </div>
        <PixelCanvas />
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
