import { FormEvent, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  KeyRound,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api, date } from "./api";
import { ImageInput } from "./image-input";
import { Button, Empty, ErrorBox, Loading, Status, useApp } from "./main";

type CoachProfile = {
  id: string;
  slug: string;
  headline: string;
  bio: string;
  specialty: string;
  image: string;
  achievements: { title: string }[];
};

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: "member" | "coach" | "admin";
  riotId: string;
  rank: string;
  timezone: string;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
  coach: CoachProfile | null;
};

const roleLabels = {
  member: "Hội viên",
  coach: "Coach",
  admin: "Quản trị viên",
};

const ranks = [
  "Sắt",
  "Đồng",
  "Bạc",
  "Vàng",
  "Bạch Kim",
  "Lục Bảo",
  "Kim Cương",
  "Cao Thủ",
  "Đại Cao Thủ",
  "Thách Đấu",
];

function UserEditor({
  user,
  onClose,
}: {
  user?: AdminUser;
  onClose: () => void;
}) {
  const { session, refresh, notify } = useApp(),
    [role, setRole] = useState<AdminUser["role"]>(user?.role || "member"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [resetOpen, setResetOpen] = useState(false);
  const editing = !!user,
    self = user?.id === session.user.id,
    existingCoach = user?.coach,
    needsCoachProvision = role === "coach" && !existingCoach;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    const data = new FormData(event.currentTarget),
      image = data.get("image");
    if (image instanceof File && image.size === 0) data.delete("image");
    if (self) data.delete("role");
    try {
      await api(
        editing ? `/admin/users/${user.id}` : "/admin/users",
        editing ? "PATCH" : "POST",
        data,
      );
      await refresh();
      notify(editing ? "Đã cập nhật tài khoản." : "Đã tạo tài khoản mới.");
      onClose();
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form),
      password = String(data.get("password") || ""),
      confirmation = String(data.get("confirmation") || "");
    if (password !== confirmation) {
      setError(new Error("Mật khẩu xác nhận chưa khớp."));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await api(`/admin/users/${user!.id}/reset-password`, "POST", {
        password,
      });
      await refresh();
      notify("Đã đặt lại mật khẩu và thu hồi các phiên đăng nhập cũ.");
      setResetOpen(false);
      form.reset();
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-user-editor">
      <form className="panel" onSubmit={save}>
        <div className="section-heading">
          <div>
            <h2>{editing ? "Chỉnh sửa tài khoản" : "Tạo tài khoản"}</h2>
            <p>
              {editing
                ? `${user.displayName} · ${user.email}`
                : "Thông tin đăng nhập và hồ sơ cơ bản."}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Đóng form tài khoản"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <ErrorBox error={error} />
        <div className="form-grid">
          <label>
            Tên hiển thị
            <input
              name="displayName"
              defaultValue={user?.displayName || ""}
              required
              minLength={2}
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              defaultValue={user?.email || ""}
              required
            />
          </label>
        </div>
        {!editing && (
          <label>
            Mật khẩu khởi tạo
            <input
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={100}
              autoComplete="new-password"
            />
          </label>
        )}
        <div className="form-grid">
          <label>
            Vai trò
            <select
              name="role"
              value={role}
              disabled={self}
              onChange={(event) =>
                setRole(event.target.value as AdminUser["role"])
              }
            >
              <option value="member">Hội viên</option>
              <option value="coach">Coach</option>
              <option value="admin">Quản trị viên</option>
            </select>
            {self && (
              <span className="form-hint">
                Không thể tự thay đổi vai trò quản trị.
              </span>
            )}
          </label>
          <label>
            Riot ID
            <input name="riotId" defaultValue={user?.riotId || ""} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Hạng hiện tại
            <select name="rank" defaultValue={user?.rank || "Kim Cương"}>
              {ranks.map((rank) => (
                <option key={rank}>{rank}</option>
              ))}
            </select>
          </label>
          <label>
            Múi giờ
            <select
              name="timezone"
              defaultValue={user?.timezone || "Asia/Ho_Chi_Minh"}
            >
              <option value="Asia/Ho_Chi_Minh">Việt Nam (UTC+7)</option>
              <option value="Asia/Bangkok">Bangkok (UTC+7)</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
        </div>

        {role === "coach" && (
          <div className="coach-fields">
            <div className="panel-divider" />
            <h3>Hồ sơ coach công khai</h3>
            <div className="form-grid">
              <label>
                Slug
                <input
                  name="slug"
                  defaultValue={existingCoach?.slug || ""}
                  readOnly={!!existingCoach}
                  disabled={!!existingCoach}
                  required={needsCoachProvision}
                  minLength={2}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="coach-nguyen-van-a"
                />
              </label>
              <label>
                Chuyên môn
                <input
                  name="specialty"
                  defaultValue={existingCoach?.specialty || ""}
                  required
                  minLength={2}
                />
              </label>
            </div>
            <label>
              Tiêu đề hồ sơ
              <input
                name="headline"
                defaultValue={existingCoach?.headline || ""}
                required
                minLength={2}
              />
            </label>
            <label>
              Giới thiệu
              <textarea
                name="bio"
                defaultValue={existingCoach?.bio || ""}
                required
                minLength={20}
                maxLength={3000}
                rows={4}
              />
            </label>
            <label>
              Thành tích nổi bật
              <input
                name="achievement"
                defaultValue={existingCoach?.achievements[0]?.title || ""}
                required
                minLength={2}
              />
            </label>
            <ImageInput
              current={existingCoach?.image}
              required={needsCoachProvision}
            />
          </div>
        )}
        <div className="actions">
          <Button type="submit" disabled={busy}>
            {busy ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo tài khoản"}
          </Button>
          <Button secondary onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          {editing && (
            <Button
              secondary
              onClick={() => setResetOpen(!resetOpen)}
              disabled={busy}
            >
              <KeyRound size={16} /> Đặt lại mật khẩu
            </Button>
          )}
        </div>
      </form>
      {editing && resetOpen && (
        <form className="panel password-reset" onSubmit={resetPassword}>
          <h3>Đặt lại mật khẩu</h3>
          <p>Tất cả phiên đăng nhập hiện tại của user sẽ bị thu hồi.</p>
          <div className="form-grid">
            <label>
              Mật khẩu mới
              <input
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={100}
                autoComplete="new-password"
              />
            </label>
            <label>
              Xác nhận mật khẩu
              <input
                name="confirmation"
                type="password"
                required
                minLength={8}
                maxLength={100}
                autoComplete="new-password"
              />
            </label>
          </div>
          <Button type="submit" disabled={busy}>
            Xác nhận đặt lại
          </Button>
        </form>
      )}
    </div>
  );
}

export function AdminUsers() {
  const { session, refresh, notify } = useApp(),
    [searchInput, setSearchInput] = useState(""),
    [search, setSearch] = useState(""),
    [role, setRole] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<string | "new" | null>(null),
    [confirming, setConfirming] = useState(""),
    [busy, setBusy] = useState(""),
    [error, setError] = useState<unknown>();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const params = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (search) params.set("search", search);
  if (role) params.set("role", role);
  if (status) params.set("status", status);

  const users = useQuery({
      queryKey: ["admin-users", params.toString()],
      queryFn: () => api(`/admin/users?${params}`),
    }),
    detail = useQuery<AdminUser>({
      queryKey: ["admin-user", selected],
      queryFn: () => api(`/admin/users/${selected}`),
      enabled: !!selected && selected !== "new",
    });

  async function changeStatus(user: AdminUser, next: "active" | "disabled") {
    setBusy(user.id);
    setError(undefined);
    try {
      if (next === "disabled")
        await api(`/admin/users/${user.id}`, "DELETE", {});
      else await api(`/admin/users/${user.id}`, "PATCH", { status: "active" });
      setConfirming("");
      if (selected === user.id) setSelected(null);
      await refresh();
      notify(
        next === "disabled"
          ? "Đã vô hiệu hóa tài khoản và thu hồi phiên đăng nhập."
          : "Đã khôi phục tài khoản.",
      );
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy("");
    }
  }

  const pageCount = Math.max(1, Math.ceil((users.data?.total || 0) / 10));

  return (
    <section className="admin-users">
      <div className="admin-user-toolbar">
        <label className="search-field">
          <Search size={17} />
          <span className="sr-only">Tìm tài khoản</span>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm theo tên hoặc email…"
          />
        </label>
        <label>
          <span className="sr-only">Lọc vai trò</span>
          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Mọi vai trò</option>
            <option value="member">Hội viên</option>
            <option value="coach">Coach</option>
            <option value="admin">Quản trị viên</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Lọc trạng thái</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Mọi trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="disabled">Đã vô hiệu hóa</option>
          </select>
        </label>
        <Button onClick={() => setSelected("new")}>
          <Plus size={16} /> Tạo tài khoản
        </Button>
      </div>

      <ErrorBox error={error || users.error || detail.error} />
      {selected === "new" && (
        <UserEditor key="new" onClose={() => setSelected(null)} />
      )}
      {selected &&
        selected !== "new" &&
        (detail.isLoading ? (
          <Loading />
        ) : detail.data ? (
          <UserEditor
            key={`${detail.data.id}-${detail.data.updatedAt || ""}`}
            user={detail.data}
            onClose={() => setSelected(null)}
          />
        ) : null)}

      {users.isLoading ? (
        <Loading />
      ) : users.data?.items.length ? (
        <div className="panel admin-user-list">
          <div className="section-heading">
            <h2>Tài khoản hệ thống</h2>
            <span className="muted">{users.data.total} tài khoản</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((user: AdminUser) => {
                  const self = user.id === session.user.id;
                  return (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.displayName}</strong>
                        <small>{user.email}</small>
                      </td>
                      <td>
                        <span className={`role-pill role-${user.role}`}>
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td>
                        <Status value={user.status} />
                      </td>
                      <td>{date(user.createdAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="text-button"
                            onClick={() => setSelected(user.id)}
                          >
                            <Pencil size={15} /> Sửa
                          </button>
                          {user.status === "disabled" ? (
                            <button
                              className="text-button"
                              disabled={busy === user.id}
                              onClick={() => changeStatus(user, "active")}
                            >
                              <RotateCcw size={15} /> Khôi phục
                            </button>
                          ) : !self && confirming !== user.id ? (
                            <button
                              className="text-button danger-text"
                              onClick={() => setConfirming(user.id)}
                            >
                              <Trash2 size={15} /> Vô hiệu hóa
                            </button>
                          ) : confirming === user.id ? (
                            <span className="inline-confirm">
                              <button
                                className="text-button danger-text"
                                disabled={busy === user.id}
                                onClick={() => changeStatus(user, "disabled")}
                              >
                                Xác nhận
                              </button>
                              <button
                                className="text-button"
                                onClick={() => setConfirming("")}
                              >
                                Hủy
                              </button>
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="pagination">
              <button
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Trang trước
              </button>
              <span>
                Trang {page} / {pageCount}
              </span>
              <button
                disabled={page >= pageCount}
                onClick={() => setPage((value) => value + 1)}
              >
                Trang sau
              </button>
            </div>
          )}
        </div>
      ) : (
        <Empty
          title="Không tìm thấy tài khoản"
          description="Thử thay đổi từ khóa hoặc bộ lọc hiện tại."
        />
      )}
    </section>
  );
}
