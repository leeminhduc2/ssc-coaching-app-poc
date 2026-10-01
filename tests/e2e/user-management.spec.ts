import { expect, request as requestFactory, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

const mutationHeaders = () => ({
  "X-SSC-Request": "1",
  "Idempotency-Key": randomUUID(),
});
const png = Buffer.from("89504e470d0a1a0a", "hex");

test("admin manages account lifecycle without deleting membership history", async ({
  request: admin,
}) => {
  await admin.post("/api/v1/demo/login", {
    headers: mutationHeaders(),
    data: { account: "admin" },
  });
  const email = `managed-${randomUUID()}@ssc.test`;
  const member = await requestFactory.newContext({
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5173",
  });
  await member.post("/api/v1/auth/register", {
    headers: mutationHeaders(),
    data: {
      email,
      password: "Initial@123",
      displayName: "Managed Member",
      consent: true,
    },
  });
  await member.post("/api/v1/payments/checkout-session", {
    headers: mutationHeaders(),
    data: { planId: "master", outcome: "succeeded", consent: true },
  });

  const listResponse = await admin.get(
    `/api/v1/admin/users?search=${encodeURIComponent(email)}&status=active`,
  );
  expect(listResponse.ok(), await listResponse.text()).toBeTruthy();
  const list = await listResponse.json();
  expect(list.total).toBe(1);
  expect(list.items[0].passwordHash).toBeUndefined();
  const userId = list.items[0].id;
  const firstPage = await (
    await admin.get(
      "/api/v1/admin/users?page=1&pageSize=1&role=member&status=active",
    )
  ).json();
  expect(firstPage.items).toHaveLength(1);
  expect(firstPage.total).toBeGreaterThan(1);
  const secondPage = await (
    await admin.get(
      "/api/v1/admin/users?page=2&pageSize=1&role=member&status=active",
    )
  ).json();
  expect(secondPage.items).toHaveLength(1);
  expect(secondPage.items[0].id).not.toBe(firstPage.items[0].id);

  expect(
    (
      await admin.post(`/api/v1/admin/users/${userId}/reset-password`, {
        headers: mutationHeaders(),
        data: { password: "Changed@123" },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await member.get("/api/v1/auth/session")).json(),
  ).resolves.toMatchObject({
    user: null,
  });
  expect(
    (
      await member.post("/api/v1/auth/login", {
        headers: mutationHeaders(),
        data: { email, password: "Initial@123" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await member.post("/api/v1/auth/login", {
        headers: mutationHeaders(),
        data: { email, password: "Changed@123" },
      })
    ).ok(),
  ).toBeTruthy();

  expect(
    (
      await admin.delete(`/api/v1/admin/users/${userId}`, {
        headers: mutationHeaders(),
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await member.post("/api/v1/auth/login", {
        headers: mutationHeaders(),
        data: { email, password: "Changed@123" },
      })
    ).status(),
  ).toBe(401);
  const disabled = await (
    await admin.get(`/api/v1/admin/users/${userId}`)
  ).json();
  expect(disabled.status).toBe("disabled");
  expect(disabled.passwordHash).toBeUndefined();

  expect(
    (
      await admin.patch(`/api/v1/admin/users/${userId}`, {
        headers: mutationHeaders(),
        data: { status: "active" },
      })
    ).ok(),
  ).toBeTruthy();
  await member.post("/api/v1/auth/login", {
    headers: mutationHeaders(),
    data: { email, password: "Changed@123" },
  });
  const restoredSession = await (
    await member.get("/api/v1/auth/session")
  ).json();
  expect(restoredSession.subscription).not.toBeNull();

  expect(
    (
      await admin.delete("/api/v1/admin/users/demo-admin", {
        headers: mutationHeaders(),
      })
    ).status(),
  ).toBe(409);
  await member.dispose();
});

test("admin provisions a coach and coach updates only their public profile", async ({
  request: admin,
}) => {
  await admin.post("/api/v1/demo/login", {
    headers: mutationHeaders(),
    data: { account: "admin" },
  });
  const token = randomUUID(),
    email = `coach-${token}@ssc.test`,
    slug = `coach-${token}`;
  const create = await admin.post("/api/v1/admin/users", {
    headers: mutationHeaders(),
    multipart: {
      email,
      password: "Coach@12345",
      displayName: "Coach Integration",
      role: "coach",
      slug,
      headline: "Coach kiểm thử hệ thống",
      bio: "Hồ sơ coach đủ dài để kiểm thử cập nhật thông tin công khai.",
      specialty: "Kinh tế và chuyển đội hình",
      achievement: "Thành tích kiểm thử",
      image: { name: "coach.png", mimeType: "image/png", buffer: png },
    },
  });
  expect(create.ok(), await create.text()).toBeTruthy();
  const created = await create.json();
  expect(created.passwordHash).toBeUndefined();
  expect(created.coach.image).toMatch(/^\/api\/uploads\/coaches\//);
  const originalImage = created.coach.image;

  const coach = await requestFactory.newContext({
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5173",
  });
  await coach.post("/api/v1/auth/login", {
    headers: mutationHeaders(),
    data: { email, password: "Coach@12345" },
  });
  expect((await coach.get("/api/v1/coach/profile")).ok()).toBeTruthy();
  const update = await coach.patch("/api/v1/coach/profile", {
    headers: mutationHeaders(),
    multipart: {
      displayName: "Coach Updated",
      achievement: "Thành tích đã cập nhật",
      image: { name: "updated.png", mimeType: "image/png", buffer: png },
    },
  });
  expect(update.ok(), await update.text()).toBeTruthy();
  const updated = await update.json();
  expect(updated.user.displayName).toBe("Coach Updated");
  expect(updated.achievements[0].title).toBe("Thành tích đã cập nhật");
  expect((await coach.get(updated.image)).ok()).toBeTruthy();
  expect((await coach.get(originalImage)).status()).toBe(404);

  const forbiddenField = await coach.patch("/api/v1/coach/profile", {
    headers: mutationHeaders(),
    multipart: { slug: "cannot-change" },
  });
  expect(forbiddenField.status()).toBe(400);

  expect(
    (
      await admin.patch(`/api/v1/admin/users/${created.id}`, {
        headers: mutationHeaders(),
        data: { role: "member" },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await admin.get(`/api/v1/coaches/${created.coach.id}`)).status(),
  ).toBe(404);
  expect(
    (
      await admin.get(`/api/v1/coaches/${created.coach.id}/availability`)
    ).status(),
  ).toBe(404);
  const coachSession = await (await coach.get("/api/v1/auth/session")).json();
  expect(coachSession.user).toBeNull();
  await coach.dispose();
});

test("admin UI creates, edits and changes account status", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("Chuyển tài khoản trải nghiệm")
    .first()
    .selectOption("admin");
  await page.waitForURL(/\/app\/admin$/);
  await expect(page.getByRole("link", { name: "Hồ sơ công khai" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Tài khoản", exact: true }).click();

  const email = `ui-member-${randomUUID()}@ssc.test`;
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  let editor = page.locator(".admin-user-editor");
  await editor.getByLabel("Tên hiển thị").fill("UI Managed Member");
  await editor.getByLabel("Email").fill(email);
  await editor.getByLabel("Mật khẩu khởi tạo").fill("Frontend@123");
  await editor.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page.getByText("Đã tạo tài khoản mới.")).toBeVisible();

  await page.getByPlaceholder("Tìm theo tên hoặc email…").fill(email);
  const row = page.locator("tbody tr", { hasText: email });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Hội viên");
  await row.getByRole("button", { name: "Sửa" }).click();
  editor = page.locator(".admin-user-editor");
  await editor.getByLabel("Riot ID").fill("UITest#VN2");
  await editor.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByText("Đã cập nhật tài khoản.")).toBeVisible();

  await row.getByRole("button", { name: "Sửa" }).click();
  editor = page.locator(".admin-user-editor");
  await editor.getByRole("button", { name: "Đặt lại mật khẩu" }).click();
  const reset = page.locator(".password-reset");
  await reset.getByLabel("Mật khẩu mới").fill("Frontend@456");
  await reset.getByLabel("Xác nhận mật khẩu").fill("Frontend@456");
  await reset.getByRole("button", { name: "Xác nhận đặt lại" }).click();
  await expect(page.getByText(/Đã đặt lại mật khẩu/)).toBeVisible();
  await editor.getByRole("button", { name: "Đóng form tài khoản" }).click();

  await row.getByRole("button", { name: "Vô hiệu hóa" }).click();
  await row.getByRole("button", { name: "Xác nhận" }).click();
  await expect(row.getByText("Đã vô hiệu hóa")).toBeVisible();
  await row.getByRole("button", { name: "Khôi phục" }).click();
  await expect(row.getByText("Đang hoạt động")).toBeVisible();

  const coachEmail = `ui-coach-${randomUUID()}@ssc.test`;
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  editor = page.locator(".admin-user-editor");
  await editor.getByLabel("Tên hiển thị").fill("UI Coach");
  await editor.getByLabel("Email").fill(coachEmail);
  await editor.getByLabel("Mật khẩu khởi tạo").fill("Frontend@123");
  await editor.getByLabel("Vai trò").selectOption("coach");
  await editor.getByLabel("Slug").fill(`ui-coach-${randomUUID()}`);
  await editor.getByLabel("Chuyên môn").fill("Kiểm thử giao diện");
  await editor.getByLabel("Tiêu đề hồ sơ").fill("Coach tích hợp frontend");
  await editor
    .getByLabel("Giới thiệu")
    .fill("Hồ sơ coach đủ dài để kiểm thử form quản trị phía frontend.");
  await editor.getByLabel("Thành tích nổi bật").fill("Thành tích UI test");
  await editor.locator('input[name="image"]').setInputFiles({
    name: "coach.png",
    mimeType: "image/png",
    buffer: png,
  });
  await editor.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page.getByText("Đã tạo tài khoản mới.")).toBeVisible();
  await page.getByPlaceholder("Tìm theo tên hoặc email…").fill(coachEmail);
  await expect(page.locator("tbody tr", { hasText: coachEmail })).toContainText(
    "Coach",
  );
  await page.getByLabel("Lọc vai trò").selectOption("coach");
  await page.getByLabel("Lọc trạng thái").selectOption("active");
  await expect(page.locator("tbody tr", { hasText: coachEmail })).toBeVisible();
  await page.getByLabel("Lọc vai trò").selectOption("");
  await page.getByLabel("Lọc trạng thái").selectOption("");

  await page
    .getByPlaceholder("Tìm theo tên hoặc email…")
    .fill("admin@ssc.demo");
  const self = page.locator("tbody tr", { hasText: "admin@ssc.demo" });
  await expect(self).toBeVisible();
  await expect(self.getByRole("button", { name: "Vô hiệu hóa" })).toHaveCount(
    0,
  );
});

test("coach UI validates an image and updates the public profile", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Chuyển tài khoản trải nghiệm")
    .first()
    .selectOption("coach-1");
  await page.waitForURL(/\/app\/coach$/);
  await page.getByRole("link", { name: "Hồ sơ công khai" }).click();
  await expect(page).toHaveURL(/\/app\/coach\/profile$/);

  const form = page.locator(".coach-profile-layout"),
    name = `Coach UI ${randomUUID().slice(0, 6)}`;
  await form.getByLabel("Tên coach").fill(name);
  await form.locator('input[name="image"]').setInputFiles({
    name: "unsafe.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg></svg>"),
  });
  await expect(
    page.getByText("Ảnh phải là tệp JPEG, PNG hoặc WebP."),
  ).toBeVisible();
  await form.locator('input[name="image"]').setInputFiles({
    name: "coach.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(form.locator(".image-preview img")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await form.getByRole("button", { name: "Lưu hồ sơ công khai" }).click();
  await expect(
    page.getByText("Đã cập nhật hồ sơ coach công khai."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Xem trang công khai" }).click();
  await expect(page).toHaveURL(/\/coaches\/coach-1$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();

  await page.goto("/");
  await page
    .getByLabel("Chuyển tài khoản trải nghiệm")
    .first()
    .selectOption("diamond");
  await page.waitForURL(/\/app$/);
  await expect(page.getByRole("link", { name: "Hồ sơ công khai" })).toHaveCount(
    0,
  );
});
