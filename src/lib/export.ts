import type { MemeSheet, MemeTemplate, Slot, Partition } from "../types";

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
