import { percentageToPixel, pixelToPercentage } from "../lib/export";

export function useCanvasUtils() {
  return {
    toPixelX: (pct: number, imageWidth: number) =>
      percentageToPixel(pct, imageWidth),
    toPixelY: (pct: number, imageHeight: number) =>
      percentageToPixel(pct, imageHeight),
    toPctX: (px: number, imageWidth: number) =>
      pixelToPercentage(px, imageWidth),
    toPctY: (px: number, imageHeight: number) =>
      pixelToPercentage(px, imageHeight),
  };
}

export function constrainToCanvas(
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } {
  const minWidth = 2;
  const minHeight = 2;
  const clampedX = Math.max(0, Math.min(100 - minWidth, x));
  const clampedY = Math.max(0, Math.min(100 - minHeight, y));
  const fittedWidth = Math.max(minWidth, Math.min(width, 100 - clampedX));
  const fittedHeight = Math.max(minHeight, Math.min(height, 100 - clampedY));
  return { x: clampedX, y: clampedY, width: fittedWidth, height: fittedHeight };
}

export function getDefaultSlotSize(shape: "head" | "rectangle"): {
  width: number;
  height: number;
} {
  if (shape === "head") {
    return { width: 10, height: 10 };
  }
  return { width: 15, height: 12 };
}