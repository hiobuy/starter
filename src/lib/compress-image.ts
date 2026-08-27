/** Resize/compress before Taobao upload (IOP max ~3MB; sessionStorage ~5MB). */
export async function compressImageFile(
  file: File,
  options?: { maxEdge?: number; quality?: number; maxBytes?: number },
): Promise<File> {
  const maxEdge = options?.maxEdge ?? 1280;
  const quality = options?.quality ?? 0.85;
  const maxBytes = options?.maxBytes ?? 2 * 1024 * 1024;

  if (
    file.size <= maxBytes &&
    (file.type === "image/jpeg" || file.type === "image/jpg")
  ) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height, 1));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  const compressed = new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  return compressed.size <= maxBytes ? compressed : file;
}
