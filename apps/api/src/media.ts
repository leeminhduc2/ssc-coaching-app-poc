import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fail } from "./service";

export const MAX_COACH_IMAGE_SIZE = 5 * 1024 * 1024;

export type UploadFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

const kinds = {
  jpeg: { extension: "jpg", mime: "image/jpeg" },
  png: { extension: "png", mime: "image/png" },
  webp: { extension: "webp", mime: "image/webp" },
} as const;

export function uploadRoot() {
  return resolve(
    process.env.UPLOAD_DIR || resolve(__dirname, "../../../.local/uploads"),
  );
}

function coachImageRoot() {
  return resolve(uploadRoot(), "coaches");
}

export async function ensureUploadRoot() {
  await mkdir(coachImageRoot(), { recursive: true });
}

function detectedKind(buffer: Buffer): keyof typeof kinds | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return "jpeg";
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
  )
    return "png";
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "webp";
  return null;
}

export function validateCoachImage(file: UploadFile | undefined) {
  if (!file) fail("Vui lòng chọn ảnh coach.");
  if (file!.size < 1 || file!.size > MAX_COACH_IMAGE_SIZE)
    fail("Ảnh coach phải có dung lượng không quá 5 MiB.");
  const kind = detectedKind(file!.buffer);
  if (!kind) fail("Ảnh coach phải là tệp JPEG, PNG hoặc WebP hợp lệ.");
  if (kinds[kind!].mime !== file!.mimetype)
    fail("Ảnh coach phải là tệp JPEG, PNG hoặc WebP hợp lệ.");
  return kinds[kind!];
}

export async function storeCoachImage(file: UploadFile) {
  const kind = validateCoachImage(file);
  await ensureUploadRoot();
  const name = `${randomUUID()}.${kind.extension}`;
  await writeFile(resolve(coachImageRoot(), name), file.buffer, { flag: "wx" });
  return `/api/uploads/coaches/${name}`;
}

export async function deleteManagedCoachImage(url?: string | null) {
  const match = url?.match(
    /^\/api\/uploads\/coaches\/([0-9a-f-]+\.(?:jpg|png|webp))$/,
  );
  if (!match) return;
  try {
    await unlink(resolve(coachImageRoot(), match[1]));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
