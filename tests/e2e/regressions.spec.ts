import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
const h = { "X-SSC-Request": "1" };
test("Nâng gói không nhân lượt, hủy reservation cũ trả lại lượt cho gói mới", async ({
  request,
}) => {
  const post = (p: string, data: any) =>
    request.post("/api/v1" + p, {
      headers: { ...h, "Idempotency-Key": randomUUID() },
      data,
    });
  await post("/auth/register", {
    email: `ledger-${randomUUID()}@ssc.test`,
    password: "Test@12345",
    displayName: "Kiểm thử sổ lượt",
    consent: true,
  });
  await post("/payments/checkout-session", {
    planId: "master",
    outcome: "succeeded",
    consent: true,
  });
  const review = await (
    await post("/vod-reviews", {
      title: "Trận đấu kiểm thử nâng gói",
      url: "https://drive.google.com/file/d/test-file-123456/view",
      rank: "Kim Cương",
      focus: "Kinh tế",
      notes: "",
      access: "accessible",
      consent: true,
    })
  ).json();
  await post("/payments/checkout-session", {
    planId: "grandmaster",
    outcome: "succeeded",
    consent: true,
  });
  let s = await (await request.get("/api/v1/auth/session")).json();
  expect(
    s.benefits.find((x: any) => x.code === "MONTHLY_VOD_REVIEW").remaining,
  ).toBe(0);
  await post(`/vod-reviews/${review.id}/cancel`, {});
  s = await (await request.get("/api/v1/auth/session")).json();
  expect(
    s.benefits.find((x: any) => x.code === "MONTHLY_VOD_REVIEW").remaining,
  ).toBe(1);
});
test("Đánh dấu hoàn thành không bị ghi đè bởi tiến độ cũ", async ({
  request,
}) => {
  const headers = { ...h, "Idempotency-Key": randomUUID() };
  await request.post("/api/v1/auth/register", {
    headers,
    data: {
      email: `progress-${randomUUID()}@ssc.test`,
      password: "Test@12345",
      displayName: "Kiểm thử tiến độ",
      consent: true,
    },
  });
  await request.put("/api/v1/videos/video-1/progress", {
    headers,
    data: { position: 1500, completed: true },
  });
  await request.put("/api/v1/videos/video-1/progress", {
    headers,
    data: { position: 30, completed: false },
  });
  const v = await (await request.get("/api/v1/videos/video-1")).json();
  expect(v.completed).toBe(true);
  expect(v.position).toBe(1500);
});
test("Từ chối sửa nội dung quản trị cho hội viên", async ({ request }) => {
  await request.post("/api/v1/demo/login", {
    headers: h,
    data: { account: "diamond" },
  });
  expect((await request.get("/api/v1/admin/catalog")).status()).toBe(403);
  expect(
    (
      await request.patch("/api/v1/admin/videos/video-1", {
        headers: h,
        data: { title: "Không được phép" },
      })
    ).status(),
  ).toBe(403);
});
