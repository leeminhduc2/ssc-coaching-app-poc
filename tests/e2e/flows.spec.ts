import { test, expect, APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
const headers = { "X-SSC-Request": "1" };
const post = (
  r: APIRequestContext,
  path: string,
  data: unknown = {},
  id = randomUUID(),
) =>
  r.post(`/api/v1${path}`, {
    headers: { ...headers, "Idempotency-Key": id },
    data,
  });
async function register(r: APIRequestContext, plan = "master") {
  const email = `test-${randomUUID()}@ssc.test`;
  let res = await post(r, "/auth/register", {
    email,
    password: "Test@12345",
    displayName: "Học viên kiểm thử",
    consent: true,
  });
  expect(res.ok()).toBeTruthy();
  if (plan) {
    res = await post(r, "/payments/checkout-session", {
      planId: plan,
      outcome: "succeeded",
      consent: true,
    });
    expect(res.ok(), await res.text()).toBeTruthy();
  }
  return email;
}
const review = {
  title: "Trận đấu kiểm thử",
  url: "https://drive.google.com/file/d/test-file-123456/view",
  rank: "Kim Cương",
  focus: "Kinh tế",
  notes: "Kiểm thử",
  access: "accessible",
  consent: true,
};
test("Khách: thư viện miễn phí, khóa membership, chặn CSRF và webhook giả", async ({
  request,
}) => {
  const list = await (await request.get("/api/v1/videos")).json();
  expect(list.items.some((v: any) => v.locked)).toBeTruthy();
  expect(list.items.every((v: any) => v.visibility !== "private")).toBeTruthy();
  expect(
    (await post(request, "/videos/video-3/playback-descriptor")).status(),
  ).toBe(403);
  expect(
    (await post(request, "/videos/video-1/playback-descriptor")).ok(),
  ).toBeTruthy();
  expect(
    (await request.post("/api/v1/auth/logout", { data: {} })).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/v1/payments/webhooks/mock", { data: {} })
    ).status(),
  ).toBe(403);
});
test("Checkout thất bại/hủy không cấp quyền; thành công idempotent", async ({
  request,
}) => {
  await register(request, "");
  for (const outcome of ["failed", "cancelled"]) {
    expect(
      (
        await post(request, "/payments/checkout-session", {
          planId: "master",
          outcome,
          consent: true,
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (await (await request.get("/api/v1/auth/session")).json()).entitlements,
    ).toEqual([]);
  }
  const id = randomUUID(),
    data = { planId: "master", outcome: "succeeded", consent: true };
  const [a, b] = await Promise.all([
    post(request, "/payments/checkout-session", data, id),
    post(request, "/payments/checkout-session", data, id),
  ]);
  expect((await a.json()).id).toBe((await b.json()).id);
  const s = await (await request.get("/api/v1/auth/session")).json();
  expect(s.entitlements).toContain("MONTHLY_VOD_REVIEW");
  expect(s.benefits[0].remaining).toBe(1);
  expect(
    (
      await post(request, "/payments/checkout-session", {
        planId: "challenger",
        outcome: "succeeded",
        consent: true,
      })
    ).status(),
  ).toBe(400);
});
test("Một lượt không bị tiêu thụ hai lần khi gửi đồng thời", async ({
  request,
}) => {
  await register(request);
  const results = await Promise.all([
    post(request, "/vod-reviews", review),
    post(request, "/vod-reviews", review),
  ]);
  expect(results.map((r) => r.status()).sort()).toEqual([201, 409]);
  expect(
    (await (await request.get("/api/v1/vod-reviews/mine")).json()).length,
  ).toBe(1);
});
test("Thiếu quyền Drive → kiểm tra lại → hủy và hoàn lượt; tệp không tồn tại hoàn lượt", async ({
  request,
}) => {
  await register(request);
  const r = await (
    await post(request, "/vod-reviews", {
      ...review,
      access: "permission_required",
    })
  ).json();
  expect(r.status).toBe("needs_permission");
  let s = await (await request.get("/api/v1/auth/session")).json();
  expect(s.benefits[0].remaining).toBe(0);
  expect(
    (
      await post(request, `/vod-reviews/${r.id}/recheck-source`, {
        access: "accessible",
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await post(request, `/vod-reviews/${r.id}/cancel`)).ok(),
  ).toBeTruthy();
  s = await (await request.get("/api/v1/auth/session")).json();
  expect(s.benefits[0].remaining).toBe(1);
  const missing = await (
    await post(request, "/vod-reviews", { ...review, access: "not_found" })
  ).json();
  expect(missing.status).toBe("rejected");
  expect(
    (await (await request.get("/api/v1/auth/session")).json()).benefits[0]
      .remaining,
  ).toBe(1);
});
test("Coach hoàn thành → VOD riêng tư → giữ quyền sau hạ gói; chặn IDOR", async ({
  request,
  playwright,
}) => {
  const email = await register(request);
  const reviewResponse = await post(request, "/vod-reviews", {
    ...review,
    coachId: "coach-1",
  });
  const r = await reviewResponse.json();
  const memberState = await request.storageState();
  const coach = await playwright.request.newContext({
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5173",
  });
  await post(coach, "/demo/login", { account: "coach-2" });
  expect((await coach.get(`/api/v1/vod-reviews/${r.id}/source`)).status()).toBe(
    403,
  );
  await post(coach, "/demo/login", { account: "coach-1" });
  for (const action of ["assign", "start", "complete"]) {
    const result = await post(coach, `/coach/vod-reviews/${r.id}/${action}`, {
      summary:
        "Giữ mốc lợi tức trước khi roll. Luyện tập ghi lại ba quyết định kinh tế trong năm trận tiếp theo.",
    });
    expect(result.ok(), await result.text()).toBeTruthy();
  }
  const list = await (await request.get("/api/v1/videos?tab=mine")).json();
  expect(list.items.length).toBe(1);
  const id = list.items[0].id;
  expect(
    (await post(request, `/videos/${id}/playback-descriptor`)).ok(),
  ).toBeTruthy();
  expect(
    (
      await post(request, "/membership/change-plan", { planId: "diamond" })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await post(request, `/videos/${id}/playback-descriptor`)).ok(),
  ).toBeTruthy();
  expect((await post(request, "/vod-reviews", review)).status()).toBe(403);
  await post(coach, "/demo/login", { account: "master" });
  expect(
    (await post(coach, `/videos/${id}/playback-descriptor`)).status(),
  ).toBe(403);
  expect((await coach.get(`/api/v1/vod-reviews/${r.id}/source`)).status()).toBe(
    403,
  );
  await coach.dispose();
});
test("Đặt lịch giữ lượt, chặn trùng, đổi lịch và hủy hoàn lượt", async ({
  request,
}) => {
  await register(request, "grandmaster");
  const slots = await (
    await request.get("/api/v1/coaches/coach-2/availability")
  ).json();
  const open = slots.filter(
    (s: any) =>
      s.available && new Date(s.start).getTime() - Date.now() > 86400000,
  );
  const result = await post(request, "/coaching/sessions", {
    coachId: "coach-2",
    start: open[0].start,
    goal: "Cải thiện kinh tế và quyết định lên cấp.",
  });
  expect(result.ok(), await result.text()).toBeTruthy();
  const booking = await result.json();
  expect(
    (
      await post(request, "/coaching/sessions", {
        coachId: "coach-2",
        start: open[1].start,
        goal: "Mục tiêu thứ hai trong chu kỳ.",
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await post(request, `/coaching/sessions/${booking.id}/reschedule`, {
        start: open[1].start,
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await post(request, `/coaching/sessions/${booking.id}/cancel`)).ok(),
  ).toBeTruthy();
  const s = await (await request.get("/api/v1/auth/session")).json();
  expect(
    s.benefits.find((x: any) => x.code === "MONTHLY_1ON1_COACHING").remaining,
  ).toBe(1);
});
test("Academy ứng tuyển, chỉ admin được duyệt và mở nhiệm vụ", async ({
  request,
  playwright,
}) => {
  await register(request, "");
  const application = await (
    await post(request, "/academy/apply", {
      goal: "Muốn phát triển tư duy thi đấu và luyện tập có hệ thống mỗi ngày.",
    })
  ).json();
  expect(application.status).toBe("pending");
  expect(
    (
      await post(request, `/admin/enrollments/${application.id}/approve`)
    ).status(),
  ).toBe(403);
  const admin = await playwright.request.newContext({
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5173",
  });
  await post(admin, "/demo/login", { account: "admin" });
  expect(
    (await post(admin, `/admin/enrollments/${application.id}/approve`)).ok(),
  ).toBeTruthy();
  const s = await (await request.get("/api/v1/auth/session")).json();
  expect(s.entitlements).toHaveLength(4);
  expect(s.enrollment.status).toBe("active");
  expect(
    (
      await post(request, `/academy/tasks/${s.enrollment.tasks[0].id}`, {
        completed: true,
      })
    ).ok(),
  ).toBeTruthy();
  await admin.dispose();
});
test("Giao diện: đăng ký → checkout → học và lưu tiến độ", async ({ page }) => {
  await page.goto("/checkout/diamond");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Đăng nhập để tiếp tục" }).click();
  await page
    .getByRole("link", { name: "Đăng ký miễn phí", exact: true })
    .click();
  await page
    .getByLabel("Tên hiển thị", { exact: true })
    .fill("Người học giao diện");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`ui-${randomUUID()}@ssc.test`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Test@12345");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(page).toHaveURL(/checkout\/diamond/);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Xác nhận thanh toán mô phỏng" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hành trình mới đã mở!" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Vào không gian học tập" }).click();
  await expect(
    page.getByRole("heading", { name: /Chào Người học giao diện/ }),
  ).toBeVisible();
  await page.goto("/app/watch/video-3");
  await page.getByRole("button", { name: "Phát video minh họa" }).click();
  await expect(page.locator("video")).toBeVisible();
  await page.getByRole("button", { name: "Đánh dấu hoàn thành" }).click();
  await expect(
    page.getByRole("button", { name: "Đã hoàn thành", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Đã hoàn thành", exact: true }),
  ).toBeVisible();
});
test("Bốn tier cùng shell, mở rộng đúng module; tìm kiếm và mobile không tràn", async ({
  page,
}) => {
  await page.goto("/");
  const select = page.getByLabel("Chuyển tài khoản trải nghiệm");
  await select.selectOption("diamond");
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("link", { name: "Gửi VOD Review", exact: true }),
  ).toHaveCount(0);
  for (const [account, link] of [
    ["master", "Gửi VOD Review"],
    ["grandmaster", "Coaching 1-1"],
    ["challenger", "Academy"],
  ]) {
    await select.selectOption(account);
    await expect(
      page
        .locator(".sidebar")
        .getByRole("link", { name: link, exact: link !== "Academy" }),
    ).toBeVisible();
  }
  await page.goto("/app/library");
  await page.getByLabel("Tìm kiếm bài học").fill("không-có-bài-này-xyz");
  await expect(
    page.getByRole("heading", { name: "Chưa tìm thấy bài học phù hợp" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await expect(page.locator(".video-card").first()).toBeVisible();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBeTruthy();
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Mở menu học tập" }).click();
  await expect(select).toBeVisible();
});
test("Trang chính không có lỗi khả năng truy cập nghiêm trọng", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Chuyển tài khoản trải nghiệm").selectOption("master");
  await expect(page).toHaveURL(/\/app$/);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    results.violations
      .filter((x) => x.impact === "critical" || x.impact === "serious")
      .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
});
