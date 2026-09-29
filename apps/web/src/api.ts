export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`/api/v1${path}`, {
      method,
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-SSC-Request": "1",
        ...(method !== "GET" ? { "Idempotency-Key": crypto.randomUUID() } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json();
    if (!res.ok)
      throw new ApiError(
        data.message || "Không thể tải dữ liệu.",
        res.status,
        data.code,
      );
    return data;
  } finally {
    clearTimeout(timeout);
  }
}
export const money = (v: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    v,
  );
export const date = (v: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(v));
export const time = (v: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(v));
export const labels: Record<string, string> = {
  queued: "Chờ coach tiếp nhận",
  needs_permission: "Cần cấp quyền Drive",
  assigned: "Đã phân công",
  in_review: "Đang phân tích",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
  rejected: "Đã từ chối",
  succeeded: "Thành công",
  failed: "Thất bại",
  scheduled: "Đã đặt lịch",
  pending: "Chờ xét duyệt",
  active: "Đang hoạt động",
  reserved: "Đang giữ lượt",
  consumed: "Đã dùng lượt",
  released: "Đã hoàn lượt",
};
export const rights: Record<string, string> = {
  VIDEO_LIBRARY: "Toàn bộ thư viện bài học",
  MONTHLY_VOD_REVIEW: "1 VOD Review cá nhân / chu kỳ",
  MONTHLY_1ON1_COACHING: "1 buổi coaching 1-1 / chu kỳ",
  ACADEMY_ACCESS: "Lộ trình Academy chuyên sâu",
};
export const LIBRARY = "VIDEO_LIBRARY",
  VOD = "MONTHLY_VOD_REVIEW",
  COACHING = "MONTHLY_1ON1_COACHING",
  ACADEMY = "ACADEMY_ACCESS";
