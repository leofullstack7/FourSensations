/** Cache de object URLs para imágenes del ZIP de carga masiva (una sola carga de JSZip). */

type ZipLike = {
  file: (name: string) => { dir: boolean; async: (type: "blob") => Promise<Blob> } | null;
  files: Record<string, { dir: boolean; name: string; async: (type: "blob") => Promise<Blob> }>;
};

export class BulkZipImageUrlCache {
  private zipPromise: Promise<ZipLike> | null = null;
  private urls = new Map<string, string>();
  private pending = new Map<string, Promise<string | null>>();
  private revoked = false;

  constructor(private readonly file: File) {}

  private loadZip(): Promise<ZipLike> {
    if (!this.zipPromise) {
      this.zipPromise = (async () => {
        const { default: JSZip } = await import("jszip");
        return (await JSZip.loadAsync(await this.file.arrayBuffer())) as unknown as ZipLike;
      })();
    }
    return this.zipPromise;
  }

  async getUrl(imageFilename: string): Promise<string | null> {
    if (this.revoked) return null;
    const key = imageFilename.trim().toLowerCase();
    if (!key) return null;
    const hit = this.urls.get(key);
    if (hit) return hit;
    const inflight = this.pending.get(key);
    if (inflight) return inflight;

    const promise = (async () => {
      try {
        const zip = await this.loadZip();
        let entry =
          zip.file(imageFilename) ??
          Object.values(zip.files).find((f) => {
            if (f.dir) return false;
            const base = f.name.replace(/\\/g, "/").split("/").pop()?.toLowerCase();
            return base === key;
          }) ??
          null;
        if (!entry || entry.dir) return null;
        const blob = await entry.async("blob");
        if (this.revoked) return null;
        const url = URL.createObjectURL(blob);
        this.urls.set(key, url);
        return url;
      } catch {
        return null;
      } finally {
        this.pending.delete(key);
      }
    })();

    this.pending.set(key, promise);
    return promise;
  }

  revokeAll(): void {
    this.revoked = true;
    for (const url of this.urls.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    }
    this.urls.clear();
    this.pending.clear();
    this.zipPromise = null;
  }
}
