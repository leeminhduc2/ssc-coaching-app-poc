import { useState, FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { Button, ErrorBox, Loading, useApp } from "./main";
export function AdminContent() {
  const q = useQuery({
      queryKey: ["admin-catalog"],
      queryFn: () => api("/admin/catalog"),
    }),
    { refresh, notify } = useApp();
  const [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false),
    [mode, setMode] = useState("videos");
  async function save(
    e: FormEvent<HTMLFormElement>,
    path: string,
    method: string,
  ) {
    e.preventDefault();
    setBusy(true);
    const data: any = Object.fromEntries(new FormData(e.currentTarget));
    if (data.duration) data.duration = Number(data.duration);
    try {
      await api(path, method, data);
      await refresh();
      notify("Đã lưu nội dung và ghi nhật ký vận hành.");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  if (q.isLoading) return <Loading />;
  return (
    <>
      <div className="actions">
        <Button secondary onClick={() => setMode("videos")}>
          Bài học
        </Button>
        <Button secondary onClick={() => setMode("new")}>
          Tạo bài học
        </Button>
        <Button secondary onClick={() => setMode("coaches")}>
          Hồ sơ coach
        </Button>
      </div>
      <ErrorBox error={error || q.error} />
      {mode === "coaches"
        ? q.data?.coaches.map((c: any) => (
            <form
              className="panel"
              key={c.id}
              onSubmit={(e) => save(e, `/admin/coaches/${c.id}`, "PATCH")}
            >
              <h2>{c.user.displayName}</h2>
              <div className="form-grid">
                <label>
                  Tên coach
                  <input
                    name="displayName"
                    defaultValue={c.user.displayName}
                    required
                    minLength={2}
                  />
                </label>
                <label>
                  Chuyên môn
                  <input
                    name="specialty"
                    defaultValue={c.specialty}
                    required
                    minLength={2}
                  />
                </label>
              </div>
              <label>
                Tiêu đề hồ sơ
                <input
                  name="headline"
                  defaultValue={c.headline}
                  required
                  minLength={2}
                />
              </label>
              <label>
                Giới thiệu
                <textarea
                  name="bio"
                  defaultValue={c.bio}
                  required
                  minLength={20}
                  rows={4}
                />
              </label>
              <label>
                Thành tích mẫu nổi bật
                <input
                  name="achievement"
                  defaultValue={c.achievements[0]?.title}
                  required
                  minLength={2}
                />
              </label>
              <Button type="submit" disabled={busy}>
                Lưu hồ sơ coach
              </Button>
            </form>
          ))
        : (mode === "new"
            ? [
                {
                  id: "new",
                  title: "",
                  description: "",
                  topic: "Kinh tế",
                  patch: "14.23",
                  visibility: "membership",
                },
              ]
            : q.data?.videos || []
          ).map((v: any) => (
            <form
              className="panel"
              key={v.id}
              onSubmit={(e) =>
                save(
                  e,
                  v.id === "new" ? "/admin/videos" : `/admin/videos/${v.id}`,
                  v.id === "new" ? "POST" : "PATCH",
                )
              }
            >
              <h2>{v.id === "new" ? "Tạo bài học mẫu" : v.title}</h2>
              <label>
                Tiêu đề
                <input
                  name="title"
                  defaultValue={v.title}
                  required
                  minLength={2}
                />
              </label>
              <label>
                Mô tả
                <textarea
                  name="description"
                  defaultValue={v.description}
                  required
                  minLength={10}
                  rows={3}
                />
              </label>
              <div className="form-grid">
                <label>
                  Chủ đề
                  <input
                    name="topic"
                    defaultValue={v.topic}
                    required
                    minLength={2}
                  />
                </label>
                <label>
                  Phiên bản
                  <input
                    name="patch"
                    defaultValue={v.patch}
                    required
                    minLength={2}
                  />
                </label>
              </div>
              <label>
                Quyền xem
                <select name="visibility" defaultValue={v.visibility}>
                  <option value="public">Miễn phí</option>
                  <option value="membership">Hội viên</option>
                </select>
              </label>
              {v.id === "new" && (
                <>
                  <div className="form-grid">
                    <label>
                      Coach
                      <select name="coachId">
                        {q.data.coaches.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.user.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Trình độ
                      <select name="level">
                        <option>Cơ bản</option>
                        <option>Nâng cao</option>
                      </select>
                    </label>
                  </div>
                  <div className="form-grid">
                    <label>
                      Thời lượng mẫu (giây)
                      <input
                        name="duration"
                        type="number"
                        min={60}
                        max={14400}
                        defaultValue={1200}
                      />
                    </label>
                    <label>
                      Ảnh minh họa
                      <select name="image">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <option key={i} value={`/assets/video-${i}.jpg`}>
                            Ảnh Riot số {i}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </>
              )}
              <Button type="submit" disabled={busy}>
                {busy ? "Đang lưu…" : "Lưu bài học"}
              </Button>
            </form>
          ))}
    </>
  );
}
