import type { MemeSheet, MemeTemplate, Slot, Partition } from "../types";

export const SHEET_CSV_HEADER =
  "image_path,image_width,image_height,partition,partition_order,slot_name,slot_order,shape,x,y,width,height,angle";

export interface SheetRowInput {
  partition: string;
  partitionOrder: number;
  slotName: string;
  slotOrder: number;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
}

export function buildSheetRows(template: MemeTemplate): SheetRowInput[] {
  return template.partitions.flatMap((partition) =>
    partition.slots.map((slot) => ({
      partition: partition.label,
      partitionOrder: partition.order,
      slotName: slot.label,
      slotOrder: slot.order,
      shape: slot.shape,
      x: slot.x,
      y: slot.y,
      width: slot.width,
      height: slot.height,
      angle: slot.rotation,
    }))
  );
}

export function sheetRowsToCsv(imagePath: string, template: MemeTemplate, rows: SheetRowInput[]): string {
  const lines = [SHEET_CSV_HEADER];
  for (const row of rows) {
    lines.push(
      [
        csvCell(imagePath),
        template.imageWidth,
        template.imageHeight,
        csvCell(row.partition),
        row.partitionOrder,
        csvCell(row.slotName),
        row.slotOrder,
        csvCell(row.shape),
        row.x.toFixed(4),
        row.y.toFixed(4),
        row.width.toFixed(4),
        row.height.toFixed(4),
        row.angle.toFixed(4),
      ].join(",")
    );
  }
  return lines.join("\n") + (rows.length ? "\n" : "");
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function exportMemeSheet(templates: MemeTemplate[]): MemeSheet {
  return {
    version: 1,
    templates,
  };
}

export function partitionsFromSheet(
  sheet: MemeSheet,
  templateIndex: number
): Partition[] {
  const template = sheet.templates[templateIndex];
  if (!template) return [];
  return template.partitions;
}

export function slotsFromSheet(
  sheet: MemeSheet,
  templateIndex: number
): Slot[] {
  return partitionsFromSheet(sheet, templateIndex).flatMap((p) => p.slots);
}

export function percentageToPixel(
  percentage: number,
  dimension: number
): number {
  return (percentage / 100) * dimension;
}

export function pixelToPercentage(
  pixels: number,
  dimension: number
): number {
  if (dimension === 0) return 0;
  return (pixels / dimension) * 100;
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export function originFilename(imagePath: string, fallback = "origin.png"): string {
  if (imagePath.startsWith("data:")) return fallback;
  const parts = imagePath.split(/[/\\]/);
  return parts[parts.length - 1] || fallback;
}
