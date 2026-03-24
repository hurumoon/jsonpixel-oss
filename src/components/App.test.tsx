import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../App";

describe("App mobile layout", () => {
  it("renders sidebar toggle button", () => {
    render(<App />);
    const toggle = screen.getByRole("button", { name: /toggle sidebar/i });
    expect(toggle).toBeInTheDocument();
  });

  it("sidebar toggle opens and closes sidebar", () => {
    render(<App />);
    const toggle = screen.getByRole("button", { name: /toggle sidebar/i });

    // Initially sidebar does not have 'open' class
    const sidebar = document.querySelector(".sidebar");
    expect(sidebar).not.toHaveClass("open");

    // Click toggle — sidebar should have 'open' class
    fireEvent.click(toggle);
    expect(sidebar).toHaveClass("open");

    // Click toggle again — sidebar should close
    fireEvent.click(toggle);
    expect(sidebar).not.toHaveClass("open");
  });

  it("overlay closes sidebar when clicked", () => {
    render(<App />);
    const toggle = screen.getByRole("button", { name: /toggle sidebar/i });

    fireEvent.click(toggle);
    const sidebar = document.querySelector(".sidebar");
    expect(sidebar).toHaveClass("open");

    // Click overlay
    const overlay = document.querySelector(".sidebar-overlay");
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay!);
    expect(sidebar).not.toHaveClass("open");
  });
});

describe("App renders core UI", () => {
  it("renders toolbar with tool buttons", () => {
    render(<App />);
    expect(screen.getByText("Pen")).toBeInTheDocument();
    expect(screen.getByText("Eraser")).toBeInTheDocument();
    expect(screen.getByText("Fill")).toBeInTheDocument();
    expect(screen.getByText("Pick")).toBeInTheDocument();
  });

  it("renders canvas", () => {
    render(<App />);
    expect(screen.getByLabelText("Pixel art canvas")).toBeInTheDocument();
  });

  it("canvas has touch-action none", () => {
    render(<App />);
    const canvas = screen.getByLabelText("Pixel art canvas");
    expect(canvas.style.touchAction).toBe("none");
  });
});
