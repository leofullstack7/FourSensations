import path from "node:path";

export function mimeFromImagePath(entryName: string): string {
  const ext = path.extname(entryName).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      throw new Error(`Extensión no soportada: ${ext}`);
  }
}
