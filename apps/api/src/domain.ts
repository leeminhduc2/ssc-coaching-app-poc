import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";
export const LIBRARY = "VIDEO_LIBRARY",
  VOD = "MONTHLY_VOD_REVIEW",
  COACHING = "MONTHLY_1ON1_COACHING",
  ACADEMY = "ACADEMY_ACCESS";
export function inherit(
  planId: string,
  plans: {
    id: string;
    parentId: string | null;
    entitlements: { code: string }[];
  }[],
): string[] {
  const seen = new Set<string>(),
    rights = new Set<string>();
  let id: string | null = planId;
  while (id) {
    if (seen.has(id)) throw new Error("Vòng lặp quyền lợi");
    seen.add(id);
    const p = plans.find((x) => x.id === id);
    if (!p) break;
    p.entitlements.forEach((x) => rights.add(x.code));
    id = p.parentId;
  }
  return [...rights];
}
export function parseDrive(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Vui lòng nhập liên kết Google Drive hợp lệ.");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "drive.google.com" ||
    url.username ||
    url.password ||
    url.port
  )
    throw new Error("Chỉ chấp nhận liên kết https://drive.google.com.");
  const id =
    url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1] ||
    (url.pathname === "/open" ? url.searchParams.get("id") : null);
  if (!id || !/^[\w-]{10,200}$/.test(id))
    throw new Error("Liên kết cần chứa mã tệp Google Drive hợp lệ.");
  return id;
}
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function encrypt(s: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv(
      "aes-256-gcm",
      Buffer.from(process.env.FIELD_ENCRYPTION_KEY!, "hex"),
      iv,
    );
  return Buffer.concat([
    iv,
    cipher.update(s),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
}
export function decrypt(s: string) {
  const b = Buffer.from(s, "base64"),
    c = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(process.env.FIELD_ENCRYPTION_KEY!, "hex"),
      b.subarray(0, 12),
    );
  c.setAuthTag(b.subarray(-16));
  return Buffer.concat([c.update(b.subarray(12, -16)), c.final()]).toString();
}
export const remaining = (quantity: number, usages: { status: string }[]) =>
  quantity - usages.filter((x) => x.status !== "released").length;
