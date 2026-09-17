/** Carga una imagen del ZIP en el navegador y devuelve un object URL. */
export async function loadZipImageObjectUrl(
  file: File,
  imageFilename: string
): Promise<string | null> {
  const target = imageFilename.trim().toLowerCase();
  if (!target) return null;

  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  let entry =
    zip.file(imageFilename) ??
    Object.values(zip.files).find((f) => {
      if (f.dir) return false;
      const base = f.name.replace(/\\/g, "/").split("/").pop()?.toLowerCase();
      return base === target;
    });

  if (!entry || entry.dir) return null;

  const blob = await entry.async("blob");
  return URL.createObjectURL(blob);
}
