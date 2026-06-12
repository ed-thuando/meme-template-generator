export async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

export async function readImageAsBase64(path: string): Promise<string> {
  return invokeCommand<string>("read_image_as_base64", { path });
}

export async function saveJson(path: string, content: string): Promise<void> {
  return invokeCommand<void>("save_json", { path, content });
}

export async function saveFile(path: string, data: string): Promise<void> {
  return invokeCommand<void>("save_file", { path, data });
}

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

export async function exportTemplateSheet(
  outputDir: string,
  originPath: string,
  originBase64: string | null,
  imageWidth: number,
  imageHeight: number,
  rows: SheetRowInput[]
): Promise<string> {
  return invokeCommand<string>("export_template_sheet", {
    outputDir,
    originPath,
    originBase64,
    imageWidth,
    imageHeight,
    rows: rows.map((r) => ({
      partition: r.partition,
      partition_order: r.partitionOrder,
      slot_name: r.slotName,
      slot_order: r.slotOrder,
      shape: r.shape,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      angle: r.angle,
    })),
  });
}

export async function getImageDimensions(
  path: string
): Promise<{ width: number; height: number }> {
  const result = await invokeCommand<[number, number]>(
    "get_image_dimensions",
    { path }
  );
  return { width: result[0], height: result[1] };
}
