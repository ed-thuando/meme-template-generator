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

export interface SlotMeta {
  partition?: string;
  name: string;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
}

export async function exportMeme(
  outputDir: string,
  filename: string,
  imageBase64: string,
  slots: SlotMeta[]
): Promise<string> {
  return invokeCommand<string>("export_meme", {
    outputDir,
    filename,
    imageBase64,
    slots,
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