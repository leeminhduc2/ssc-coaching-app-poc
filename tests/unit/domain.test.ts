import { describe, it, expect } from "vitest";
import {
  inherit,
  parseDrive,
  remaining,
  encrypt,
  decrypt,
} from "../../apps/api/src/domain";
describe("Quyền lợi kế thừa", () => {
  const plans = [
    { id: "a", parentId: null, entitlements: [{ code: "LIBRARY" }] },
    { id: "b", parentId: "a", entitlements: [{ code: "VOD" }] },
    { id: "c", parentId: "b", entitlements: [{ code: "COACHING" }] },
    { id: "d", parentId: "c", entitlements: [{ code: "ACADEMY" }] },
  ];
  it("kế thừa đầy đủ bốn tầng và không phụ thuộc tên hiển thị", () =>
    expect(inherit("d", plans)).toEqual([
      "ACADEMY",
      "COACHING",
      "VOD",
      "LIBRARY",
    ]));
  it("phát hiện chu kỳ", () =>
    expect(() =>
      inherit("a", [{ ...plans[0], parentId: "b" }, plans[1]]),
    ).toThrow("Vòng lặp"));
  it("không nhân đôi entitlement", () =>
    expect(
      inherit("b", [
        plans[0],
        { ...plans[1], entitlements: [{ code: "LIBRARY" }] },
      ]),
    ).toEqual(["LIBRARY"]));
});
describe("Drive parser chống SSRF", () => {
  it.each([
    "https://drive.google.com/file/d/abcdef123456/view",
    "https://drive.google.com/open?id=abcdef123456",
  ])("đọc đúng file ID: %s", (url) =>
    expect(parseDrive(url)).toBe("abcdef123456"),
  );
  it.each([
    "http://drive.google.com/file/d/abcdef123456/view",
    "https://drive.google.com.evil.test/file/d/abcdef123456/view",
    "https://drive.google.com@evil.test/file/d/abcdef123456/view",
    "https://drive.google.com:9000/file/d/abcdef123456/view",
    "file:///etc/passwd",
    "https://drive.google.com/drive/folders/abcdef123456",
    "https://drive.google.com/file/d/a/view",
  ])("từ chối URL nguy hiểm hoặc không phải tệp: %s", (url) =>
    expect(() => parseDrive(url)).toThrow(),
  );
});
describe("Sổ lượt & mã hóa", () => {
  it("trừ lượt giữ và đã dùng, bỏ qua lượt đã hoàn", () =>
    expect(
      remaining(3, [
        { status: "reserved" },
        { status: "consumed" },
        { status: "released" },
      ]),
    ).toBe(1));
  it("mã hóa có nonce riêng và xác thực chống sửa đổi", () => {
    process.env.FIELD_ENCRYPTION_KEY = "ab".repeat(32);
    const plain = "https://drive.google.com/file/d/private-demo-123/view",
      a = encrypt(plain),
      b = encrypt(plain);
    expect(a).not.toContain(plain);
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(plain);
    const raw = Buffer.from(a, "base64");
    raw[15] ^= 1;
    expect(() => decrypt(raw.toString("base64"))).toThrow();
  });
});
