import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  deleteManagedCoachImage,
  MAX_COACH_IMAGE_SIZE,
  storeCoachImage,
  validateCoachImage,
} from "../../apps/api/src/media";

const png = Buffer.from("89504e470d0a1a0a", "hex");
let directory: string;
const oldUploadDirectory = process.env.UPLOAD_DIR;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "ssc-coach-upload-"));
  process.env.UPLOAD_DIR = directory;
});

afterEach(async () => {
  if (oldUploadDirectory === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = oldUploadDirectory;
  await rm(directory, { recursive: true, force: true });
});

describe("coach image storage", () => {
  test("stores with a generated name and removes only managed uploads", async () => {
    const url = await storeCoachImage({
      buffer: png,
      mimetype: "image/png",
      size: png.length,
      originalname: "../../unsafe-name.png",
    });
    expect(url).toMatch(/^\/api\/uploads\/coaches\/[0-9a-f-]+\.png$/);
    const files = await readdir(join(directory, "coaches"));
    expect(files).toHaveLength(1);
    expect(await readFile(join(directory, "coaches", files[0]))).toEqual(png);

    await deleteManagedCoachImage("/assets/coach-1.jpg");
    expect(await readdir(join(directory, "coaches"))).toHaveLength(1);
    await deleteManagedCoachImage(url);
    expect(await readdir(join(directory, "coaches"))).toHaveLength(0);
  });

  test("rejects spoofed, unsupported and oversized files", () => {
    expect(() =>
      validateCoachImage({
        buffer: png,
        mimetype: "image/jpeg",
        size: png.length,
        originalname: "spoofed.jpg",
      }),
    ).toThrow();
    expect(() =>
      validateCoachImage({
        buffer: Buffer.from("<svg></svg>"),
        mimetype: "image/svg+xml",
        size: 11,
        originalname: "unsafe.svg",
      }),
    ).toThrow();
    expect(() =>
      validateCoachImage({
        buffer: png,
        mimetype: "image/png",
        size: MAX_COACH_IMAGE_SIZE + 1,
        originalname: "large.png",
      }),
    ).toThrow();
  });
});
