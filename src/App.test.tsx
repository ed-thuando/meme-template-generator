import { render, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "./store";

// MemeCanvas pulls in react-konva/konva which needs the native `canvas` module
// (absent in jsdom). Stub it — these tests only exercise keyboard wiring.
vi.mock("./components/MemeCanvas", () => ({ default: () => null }));

const { default: App } = await import("./App");

describe("keyboard undo/redo", () => {
  beforeEach(() => {
    useStore.getState().reset();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("Ctrl+Z triggers undo", () => {
    const undo = vi.spyOn(useStore.temporal.getState(), "undo");
    render(<App />);
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it("Cmd+Z triggers undo (macOS)", () => {
    const undo = vi.spyOn(useStore.temporal.getState(), "undo");
    render(<App />);
    fireEvent.keyDown(window, { key: "z", metaKey: true });
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+Shift+Z triggers redo", () => {
    const redo = vi.spyOn(useStore.temporal.getState(), "redo");
    render(<App />);
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(redo).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+Y triggers redo", () => {
    const redo = vi.spyOn(useStore.temporal.getState(), "redo");
    render(<App />);
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(redo).toHaveBeenCalledTimes(1);
  });

  it("plain Z does nothing", () => {
    const undo = vi.spyOn(useStore.temporal.getState(), "undo");
    render(<App />);
    fireEvent.keyDown(window, { key: "z" });
    expect(undo).not.toHaveBeenCalled();
  });

  it("ignores Ctrl+Z while typing in an input", () => {
    const undo = vi.spyOn(useStore.temporal.getState(), "undo");
    render(<App />);
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    expect(undo).not.toHaveBeenCalled();
    input.remove();
  });
});
