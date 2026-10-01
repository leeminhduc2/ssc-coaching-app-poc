import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Save } from "lucide-react";
import { api } from "./api";
import { ImageInput } from "./image-input";
import { Button, Empty, ErrorBox, Loading, PageTitle, useApp } from "./main";

export function CoachProfile() {
  const { session, refresh, notify } = useApp(),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false),
    allowed = session.user.role === "coach";
  const profile = useQuery({
    queryKey: ["coach-profile", session.user.id],
    queryFn: () => api("/coach/profile"),
    enabled: allowed,
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form),
      image = data.get("image");
    if (image instanceof File && image.size === 0) data.delete("image");
    setBusy(true);
    setError(undefined);
    try {
      await api("/coach/profile", "PATCH", data);
      await refresh();
      const fileInput = form.elements.namedItem("image") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      notify("Đã cập nhật hồ sơ coach công khai.");
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  if (!allowed)
    return (
      <Empty
        title="Khu vực dành cho coach"
        description="Tài khoản hiện tại không có hồ sơ coach để chỉnh sửa."
      />
    );
  if (profile.isLoading) return <Loading />;
  if (!profile.data) return <ErrorBox error={profile.error} />;
  const coach = profile.data;

  return (
    <>
      <PageTitle
        eyebrow="HỒ SƠ COACH"
        title="Hồ sơ công khai"
        description="Thông tin này xuất hiện trên trang đội ngũ coach và giúp học viên hiểu cách bạn đồng hành cùng họ."
        action={
          <Button to={`/coaches/${coach.id}`} secondary>
            Xem trang công khai <ExternalLink size={16} />
          </Button>
        }
      />
      <ErrorBox error={error || profile.error} />
      <form className="coach-profile-layout" onSubmit={save}>
        <aside className="panel coach-profile-image-panel">
          <ImageInput current={coach.image} />
          <p>
            Ảnh được hiển thị công khai. Hãy chọn ảnh rõ nét và bạn có quyền sử
            dụng.
          </p>
        </aside>
        <section className="panel coach-profile-form">
          <h2>Thông tin hiển thị</h2>
          <label>
            Tên coach
            <input
              name="displayName"
              defaultValue={coach.user.displayName}
              required
              minLength={2}
            />
          </label>
          <label>
            Tiêu đề hồ sơ
            <input
              name="headline"
              defaultValue={coach.headline}
              required
              minLength={2}
            />
          </label>
          <label>
            Chuyên môn
            <input
              name="specialty"
              defaultValue={coach.specialty}
              required
              minLength={2}
            />
          </label>
          <label>
            Giới thiệu
            <textarea
              name="bio"
              defaultValue={coach.bio}
              required
              minLength={20}
              maxLength={3000}
              rows={7}
            />
          </label>
          <label>
            Thành tích nổi bật
            <input
              name="achievement"
              defaultValue={coach.achievements[0]?.title || ""}
              required
              minLength={2}
            />
          </label>
          <Button type="submit" disabled={busy}>
            <Save size={16} /> {busy ? "Đang lưu…" : "Lưu hồ sơ công khai"}
          </Button>
        </section>
      </form>
    </>
  );
}
