export interface Slot {
  id: string;
  order: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: "head" | "rectangle";
  label: string;
  photoPath?: string;
  rotation: number;
}

export interface Partition {
  id: string;
  order: number;
  label: string;
  slots: Slot[];
}

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface MemeTemplate {
  id: string;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  partitions: Partition[];
  textOverlays: TextOverlay[];
  createdAt: string;
  updatedAt: string;
}

export interface MemeSheet {
  version: 1;
  templates: MemeTemplate[];
}

export interface PresetPhoto {
  id: string;
  name: string;
  team: string;
  filePath: string;
  tags: string[];
}

export type SlotShape = Slot["shape"];

export interface ExportOptions {
  format: "png" | "webp";
  quality: number;
  scale: number;
}
