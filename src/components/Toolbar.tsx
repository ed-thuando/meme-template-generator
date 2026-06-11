import { useStore, allSlots } from "../store";
import { getImageDimensions } from "../lib/tauri";
import { useState } from "react";
import type { RefObject } from "react";
import type { MemeCanvasHandle } from "./MemeCanvas";

function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

async function openImageDialog(): Promise<string | null> {
  if (!isTauri()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    multiple: false,
    filters: [
      { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"] },
    ],
  });
  return selected as string | null;
}

function Toolbar({ canvasRef }: { canvasRef: RefObject<MemeCanvasHandle | null> }) {
  const loadTemplate = useStore((s) => s.loadTemplate);
  const reset = useStore((s) => s.reset);
  const template = useStore((s) => s.template);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  async function handleOpenImage() {
    try {
      if (isTauri()) {
        const imagePath = await openImageDialog();
        if (!imagePath) return;
        const { width, height } = await getImageDimensions(imagePath);
        loadTemplate(imagePath, width, height);
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              loadTemplate(reader.result as string, img.naturalWidth, img.naturalHeight);
            };
            img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
        };
        input.click();
      }
    } catch (err) {
      console.error("Failed to open image:", err);
    }
  }

  async function handleExport() {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await canvasRef.current.exportImage("png", 1);
      if (isTauri()) {
        // Desktop: save PNG into <Downloads>/meme-output/images and append a row
        // per slot (position/size/angle) to <Downloads>/meme-output/data.csv.
        const { downloadDir, join } = await import("@tauri-apps/api/path");
        const outputDir = await join(await downloadDir(), "meme-output");
        const filename = `meme-${Date.now()}.png`;
        const slots = (template ? allSlots(template) : []).map(({ partition, slot: s }) => ({
          partition: partition.label,
          name: s.label,
          shape: s.shape,
          x: s.x,
          y: s.y,
          width: s.width,
          height: s.height,
          angle: s.rotation,
        }));
        const { exportMeme } = await import("../lib/tauri");
        const savedPath = await exportMeme(outputDir, filename, dataUrl, slots);
        setExportMsg(`Saved: ${savedPath}`);
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "meme.png";
        link.click();
      }
    } catch (err) {
      console.error("Failed to export:", err);
      setExportMsg("Export failed — see console");
    }
  }

  return (
    <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-2">
      <h1 className="text-white font-bold text-lg mr-4">Meme Generator</h1>

      <button
        onClick={handleOpenImage}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded cursor-pointer"
      >
        Open Image
      </button>

      {template && (
        <>
          <button
            onClick={reset}
            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded cursor-pointer"
          >
            Close
          </button>

          <div className="w-px h-6 bg-gray-600 mx-1" />

          <button
            onClick={undo}
            className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded cursor-pointer"
            title="Undo"
          >
            ↩
          </button>
          <button
            onClick={redo}
            className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded cursor-pointer"
            title="Redo"
          >
            ↪
          </button>

          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded cursor-pointer"
          >
            Export
          </button>
        </>
      )}

      <div className="flex-1" />

      {exportMsg && (
        <span
          className="text-xs text-gray-300 truncate max-w-[420px]"
          title={exportMsg}
        >
          {exportMsg}
        </span>
      )}
    </div>
  );
}

export default Toolbar;