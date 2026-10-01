import { describe, expect, test } from "vitest";
import { validateCoachImage } from "../../apps/web/src/image-input";

const file = (type: string, size: number) => ({ type, size }) as File;

describe("coach image picker validation", () => {
  test("accepts supported images up to 5 MiB", () => {
    expect(validateCoachImage(file("image/jpeg", 1024))).toBe("");
    expect(validateCoachImage(file("image/png", 5 * 1024 * 1024))).toBe("");
    expect(validateCoachImage(file("image/webp", 2048))).toBe("");
  });

  test("rejects unsupported and oversized files before upload", () => {
    expect(validateCoachImage(file("image/svg+xml", 1024))).toMatch(/JPEG/);
    expect(validateCoachImage(file("image/png", 5 * 1024 * 1024 + 1))).toMatch(
      /5 MiB/,
    );
  });
});
