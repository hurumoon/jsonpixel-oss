import { useState } from "react";

export default function AboutDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="tool-btn"
        onClick={() => setOpen(true)}
        title="About"
      >
        About
      </button>

      {open && (
        <div className="about-overlay" onClick={() => setOpen(false)}>
          <div className="about-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="about-close"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>

            <h2 className="about-title">JsonPixel</h2>
            <p className="about-subtitle">dot art editor</p>
            <p className="about-description">
              A web app for creating and editing dot art in JSON format.
              Supports palette management, grid display, and PNG/JSON/SVG export.
            </p>

            <div className="about-section">
              <div className="about-section-label">Author</div>
              <div className="about-section-value">hurumoon</div>
            </div>

            <div className="about-section">
              <div className="about-section-label">Share</div>
              <div className="about-share">
                <button
                  className="about-share-btn"
                  onClick={() => {
                    const text =
                      "jsonpixel - A dot art editor with JSON export";
                    const url = window.location.href;
                    window.open(
                      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                      "_blank",
                    );
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share on X
                </button>
              </div>
            </div>

            <div className="about-section">
              <div className="about-section-label">Shortcuts</div>
              <div className="about-shortcuts">
                <span>
                  <kbd>B</kbd> Pen
                </span>
                <span>
                  <kbd>E</kbd> Eraser
                </span>
                <span>
                  <kbd>G</kbd> Fill
                </span>
                <span>
                  <kbd>I</kbd> Pick
                </span>
                <span>
                  <kbd>Ctrl+Z</kbd> Undo
                </span>
                <span>
                  <kbd>Ctrl+Y</kbd> Redo
                </span>
              </div>
            </div>

            <div className="about-section">
              <div className="about-section-label">Claude Skill</div>
              <div className="about-section-value">
                <a
                  href="https://pixelpassion.jp/JsonPixel/SKILL.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-link"
                >
                  SKILL.md
                </a>
              </div>
            </div>

            <div className="about-footer">
              <div>Version: 1.0.1</div>
              <div>Stack: React + Vite</div>
            </div>

            <button className="about-close-btn" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
