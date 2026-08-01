export type CatalogVersionListItem = {
  id: string;
  number: number;
  label: string;
  summary: string | null;
  isBaseline: boolean;
  createdAt: string;
  createdBy: string | null;
  changeCount: number;
  isCurrent: boolean;
  isHead: boolean;
};

export type CatalogVersionDetail = {
  id: string;
  number: number;
  label: string;
  summary: string | null;
  isBaseline: boolean;
  createdAt: string;
  createdBy: string | null;
  isCurrent: boolean;
  isHead: boolean;
  changes: Array<{
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    label: string | null;
    beforeData: unknown;
    afterData: unknown;
    sortOrder: number;
  }>;
};

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || `Error ${res.status}`;
  } catch {
    return `Error ${res.status}`;
  }
}

export async function fetchAdminVersions(): Promise<{
  currentVersionNumber: number;
  headVersionNumber: number;
  versions: CatalogVersionListItem[];
}> {
  const res = await fetch("/api/admin/versions", { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchAdminVersionDetail(number: number): Promise<CatalogVersionDetail> {
  const res = await fetch(`/api/admin/versions?number=${number}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { version: CatalogVersionDetail };
  return data.version;
}

export async function restoreAdminVersion(number: number): Promise<{
  currentVersionNumber: number;
  headVersionNumber: number;
  versions: CatalogVersionListItem[];
  changed: boolean;
}> {
  const res = await fetch("/api/admin/versions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ number }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
