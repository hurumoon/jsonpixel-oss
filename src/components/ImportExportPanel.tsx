import { useState, useRef, useCallback } from "react";
import { useEditor } from "../state/editorContext";
import { gridToJson, validateDotArtJson } from "../utils/jsonSerializer";
import { gridToPngBlob } from "../utils/exportPng";
import type { DotArtJson } from "../state/types";

export default function ImportExportPanel() {
  const { state, dispatch } = useEditor();
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(""), 2000);
  }, []);

  const handleExport = () => {
    const json = gridToJson(state.grid, state.palette);
    const text = JSON.stringify(json, null, 2);
    setJsonText(text);
    setError("");
    showFeedback("Exported");
  };

  const handleImport = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      const validation = validateDotArtJson(parsed);
      if (!validation.valid) {
        setError(validation.errors.join("\n"));
        setFeedback("");
        return;
      }
      dispatch({ type: "IMPORT_JSON", data: parsed as DotArtJson });
      setError("");
      showFeedback("Imported");
    } catch {
      setError("JSONのパースに失敗しました");
      setFeedback("");
    }
  };

  const handleDownload = () => {
    const json = gridToJson(state.grid, state.palette);
    const text = JSON.stringify(json, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dotart.json";
    a.click();
    URL.revokeObjectURL(url);
    showFeedback("Downloaded JSON");
  };

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setJsonText(text);
      handleImport(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCopy = async () => {
    const json = gridToJson(state.grid, state.palette);
    const text = JSON.stringify(json, null, 2);
    await navigator.clipboard.writeText(text);
    showFeedback("Copied!");
  };

  const handlePngDownload = async () => {
    showFeedback("Exporting PNG...");
    try {
      const scale = Math.max(1, Math.floor(512 / state.canvasSize));
      const blob = await gridToPngBlob(state.grid, state.palette, scale);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dotart.png";
      a.click();
      URL.revokeObjectURL(url);
      showFeedback("Downloaded PNG");
    } catch {
      setError("PNG export failed");
    }
  };

  return (
    <div className="import-export-panel">
      <h3>Import / Export</h3>
      <div className="ie-buttons">
        <button className="tool-btn" onClick={handleExport}>
          Export
        </button>
        <button className="tool-btn" onClick={() => handleImport(jsonText)}>
          Import
        </button>
        <button className="tool-btn" onClick={handleDownload}>
          Download
        </button>
        <button className="tool-btn" onClick={handleCopy}>
          Copy
        </button>
        <button className="tool-btn" onClick={handlePngDownload}>
          PNG
        </button>
      </div>
      <button className="tool-btn file-btn" onClick={() => fileRef.current?.click()}>
        Load File
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        onChange={handleFileLoad}
        style={{ display: "none" }}
      />
      <textarea
        className="json-textarea"
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        placeholder="JSON..."
        rows={6}
        aria-label="JSON data"
      />
      {feedback && (
        <div className="feedback-msg" aria-live="polite">
          {feedback}
        </div>
      )}
      {error && (
        <div className="error-msg" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
