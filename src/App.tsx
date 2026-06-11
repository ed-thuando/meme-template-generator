import Toolbar from "./components/Toolbar";
import EmptyState from "./components/EmptyState";
import MemeCanvas from "./components/MemeCanvas";
import SlotPanel from "./components/SlotPanel";
import { useStore } from "./store";
import { useEffect, useRef } from "react";
import type { MemeCanvasHandle } from "./components/MemeCanvas";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

function App() {
  const template = useStore((s) => s.template);
  const loadImage = useStore((s) => s.loadTemplate);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canvasRef = useRef<MemeCanvasHandle>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            loadImage(reader.result as string, img.naturalWidth, img.naturalHeight);
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  return (
    <div
      className="h-screen flex flex-col bg-gray-900 text-white"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Toolbar canvasRef={canvasRef} />
      <div className="flex-1 flex overflow-hidden">
        {template ? (
          <>
            <MemeCanvas ref={canvasRef} />
            <SlotPanel />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

export default App;