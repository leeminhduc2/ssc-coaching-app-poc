import { useEffect, useRef, useState, FormEvent } from "react";
import { AdminContent } from "./admin-content";
import { AdminUsers } from "./admin-users";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  SlidersHorizontal,
  ArrowRight,
  ArrowUpRight,
  Play,
  Bookmark,
  Check,
  CheckCircle2,
  Upload,
  Video,
  Link2,
  ShieldCheck,
  Clock3,
  CalendarDays,
  GraduationCap,
  Target,
  ArrowLeft,
  ExternalLink,
  Users,
  Gem,
  RefreshCw,
} from "lucide-react";
import {
  api,
  ApiError,
  VOD,
  COACHING,
  ACADEMY,
  time,
  date,
  money,
  labels,
} from "./api";
import {
  useApp,
  Button,
  Badge,
  Status,
  PageTitle,
  Loading,
  ErrorBox,
  Empty,
  VideoCard,
} from "./main";
export function LibraryPage() {
  const { session: s } = useApp(),
    [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(params.get("search") || "");
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== (params.get("search") || "")) {
        const p = new URLSearchParams(params);
        if (search) p.set("search", search);
        else p.delete("search");
        p.delete("page");
        setParams(p, { replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, params, setParams]);
  const q = useQuery({
      queryKey: ["videos", params.toString(), s?.user?.id],
      queryFn: () => api(`/videos?${params}`),
    }),
    coaches = useQuery({
      queryKey: ["coaches"],
      queryFn: () => api("/coaches"),
    });
  function filter(k: string, v: string) {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.delete("page");
    setParams(p);
  }
  const tabs = [
    ["", "Tất cả bài học"],
    ["public_review", "VOD công khai"],
    ...(s?.hasPersonal || s?.entitlements?.includes(VOD)
      ? [["mine", "VOD của tôi"]]
      : []),
    ...(s?.user
      ? [
          ["watching", "Đang xem"],
          ["saved", "Đã lưu"],
        ]
      : []),
  ];
  return (
    <div className={!s?.user ? "public-section" : ""}>
      <PageTitle
        eyebrow="HỌC ĐÚNG ĐIỀU BẠN CẦN"
        title="Thư viện VOD"
        description="Từng góc nhìn mới. Từng quyết định tốt hơn. Khám phá bài học dành cho bạn."
        action={
          <Badge>
            <BookIcon /> {q.data?.total ?? "…"} bài học
          </Badge>
        }
      />
      <div className="library-banner">
        <div>
          <span className="eyebrow">BẮT ĐẦU TỪ TƯ DUY</span>
          <h2>
            Hiểu bản chất.
            <br />
            Linh hoạt mọi thế trận.
          </h2>
          <p>Học cách đọc nhịp độ và xây dựng nền kinh tế của bạn.</p>
          <Link
            to={`${s?.user ? "/app" : ""}/watch/video-1`}
            className="text-link"
          >
            Xem bài học miễn phí <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
      <div className="tabs library-tabs">
        {tabs.map(([v, label]) => (
          <button
            key={v}
            className={(params.get("tab") || "") === v ? "active" : ""}
            onClick={() => filter("tab", v)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="filters">
        <label className="search-input">
          <Search size={18} />
          <input
            aria-label="Tìm kiếm bài học"
            placeholder="Tìm bài học, kỹ năng bạn muốn cải thiện…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="filter-label">
          <span>Chủ đề</span>
          <select
            aria-label="Lọc theo chủ đề"
            value={params.get("topic") || ""}
            onChange={(e) => filter("topic", e.target.value)}
          >
            <option value="">Tất cả chủ đề</option>
            {[
              "Kinh tế",
              "Xếp đội hình",
              "Xoay bài",
              "Lõi nâng cấp",
              "Trang bị",
              "Tư duy",
              "Cá nhân",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="filter-label">
          <span>Coach</span>
          <select
            aria-label="Lọc theo coach"
            value={params.get("coach") || ""}
            onChange={(e) => filter("coach", e.target.value)}
          >
            <option value="">Tất cả coach</option>
            {coaches.data?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.user.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-label">
          <span>Phiên bản</span>
          <select
            aria-label="Lọc theo phiên bản"
            value={params.get("patch") || ""}
            onChange={(e) => filter("patch", e.target.value)}
          >
            <option value="">Mọi phiên bản</option>
            <option>14.23</option>
            <option>14.24</option>
          </select>
        </label>
      </div>
      <div className="library-result-line">
        <span>
          {q.data?.total || 0} bài học{" "}
          <span className="muted">
            · Nội dung mẫu, không phải meta hiện tại
          </span>
        </span>
        <div className="inline-filters">
          <select
            aria-label="Lọc theo trình độ"
            value={params.get("level") || ""}
            onChange={(e) => filter("level", e.target.value)}
          >
            <option value="">Mọi trình độ</option>
            <option>Cơ bản</option>
            <option>Nâng cao</option>
          </select>
          <select
            aria-label="Sắp xếp bài học"
            value={params.get("sort") || ""}
            onChange={(e) => filter("sort", e.target.value)}
          >
            <option value="">Mới nhất</option>
            <option value="popular">Được lưu nhiều nhất</option>
          </select>
        </div>
      </div>
      <ErrorBox error={q.error} />
      {q.isLoading ? (
        <Loading />
      ) : q.data?.items.length ? (
        <>
          <div className="video-grid">
            {q.data.items.map((v: any) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
          {q.data.total > q.data.limit && (
            <div className="pagination">
              <Button
                secondary
                disabled={q.data.page === 1}
                onClick={() => filter("page", String(q.data.page - 1))}
              >
                Trang trước
              </Button>
              <span>
                Trang {q.data.page} / {Math.ceil(q.data.total / q.data.limit)}
              </span>
              <Button
                secondary
                disabled={q.data.page * q.data.limit >= q.data.total}
                onClick={() => filter("page", String(q.data.page + 1))}
              >
                Trang tiếp
              </Button>
            </div>
          )}
        </>
      ) : (
        <Empty
          title="Chưa tìm thấy bài học phù hợp"
          description="Thử từ khóa khác hoặc bỏ bớt bộ lọc để khám phá thêm."
          action={
            <Button
              secondary
              onClick={() => {
                setSearch("");
                setParams({});
              }}
            >
              Xóa bộ lọc
            </Button>
          }
        />
      )}
    </div>
  );
}
function BookIcon() {
  return <Video size={14} />;
}
export function Watch() {
  const { id } = useParams(),
    { session: s, refresh, notify } = useApp(),
    [playback, setPlayback] = useState<any>(),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  const ref = useRef<HTMLVideoElement>(null),
    last = useRef(0);
  const q = useQuery({
    queryKey: ["video", id, s?.user?.id],
    queryFn: () => api(`/videos/${id}`),
    retry: false,
  });
  const related = useQuery({
    queryKey: ["related", id],
    queryFn: () => api("/videos?limit=3"),
  });
  useEffect(() => {
    setPlayback(undefined);
    setError(null);
  }, [id, s?.user?.id]);
  async function start() {
    setBusy(true);
    try {
      setPlayback(await api(`/videos/${id}/playback-descriptor`, "POST", {}));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function progress(completed = false) {
    if (!s?.user || !q.data) return;
    const current = ref.current;
    const position = completed
      ? q.data.duration
      : Math.round(((current?.currentTime || 0) / 60) * q.data.duration);
    try {
      await api(`/videos/${id}/progress`, "PUT", { position, completed });
      if (completed) {
        await refresh();
        notify("Đã đánh dấu hoàn thành bài học.");
      }
    } catch (e) {
      setError(e);
    }
  }
  if (q.isLoading) return <Loading />;
  if (q.error) {
    const locked =
      q.error instanceof ApiError && q.error.code === "MISSING_ENTITLEMENT";
    return (
      <div className="panel">
        <Empty
          title={
            locked
              ? "Bài học đang chờ bạn mở khóa"
              : "Bạn chưa thể xem video này"
          }
          description={q.error.message}
          action={
            <Button
              to={
                locked ? "/membership" : s?.user ? "/app/library" : "/library"
              }
            >
              {locked ? "Khám phá gói hội viên" : "Về thư viện"}
            </Button>
          }
        />
      </div>
    );
  }
  const v = q.data;
  return (
    <div className={!s?.user ? "public-section" : ""}>
      <Link className="back-link" to={s?.user ? "/app/library" : "/library"}>
        <ArrowLeft size={16} /> Trở lại thư viện
      </Link>
      <div className="watch-grid">
        <div>
          <div className="player">
            {playback ? (
              <video
                ref={ref}
                src={playback.url}
                poster={v.image}
                controls
                autoPlay
                playsInline
                onLoadedMetadata={() => {
                  if (ref.current)
                    ref.current.currentTime = Math.min(
                      59,
                      (v.position / v.duration) * 60,
                    );
                }}
                onTimeUpdate={() => {
                  const now = Date.now();
                  if (now - last.current > 5000) {
                    last.current = now;
                    void progress();
                  }
                }}
                onPause={() => void progress()}
                onEnded={() => void progress(true)}
                onError={() =>
                  setError(
                    new Error("Không thể tải video. Vui lòng thử phát lại."),
                  )
                }
              />
            ) : (
              <>
                <img src={v.image} alt="Hình minh họa bài học" />
                <button
                  className="player-start"
                  onClick={start}
                  disabled={busy}
                >
                  <Play size={28} fill="currentColor" />
                  <span>
                    {busy ? "Đang mở bài học…" : "Phát video minh họa"}
                  </span>
                </button>
              </>
            )}
          </div>
          <div className="player-notice">
            <ShieldCheck size={15} /> Video minh họa thao tác học tập dài 60
            giây · Bài giảng thật chưa được tích hợp
          </div>
          <ErrorBox error={error} />
          <div className="watch-heading">
            <div>
              <div className="card-meta">
                <Badge>{v.topic}</Badge>
                <span>Phiên bản {v.patch}</span>
                <span>{Math.floor(v.duration / 60)} phút · Thời lượng mẫu</span>
              </div>
              <h1>{v.title}</h1>
            </div>
          </div>
          <div className="watch-actions">
            <Link to={`/coaches/${v.coachId}`} className="video-coach">
              <img src={v.coach.image} alt="" />
              <strong>{v.coach.user.displayName}</strong>
            </Link>
            {s?.user && (
              <div className="actions">
                <Button
                  secondary
                  onClick={async () => {
                    try {
                      await api(
                        `/videos/${id}/favorite`,
                        v.saved ? "DELETE" : "POST",
                        {},
                      );
                      await refresh();
                    } catch (e) {
                      setError(e);
                    }
                  }}
                >
                  <Bookmark
                    size={17}
                    fill={v.saved ? "currentColor" : "none"}
                  />
                  {v.saved ? "Đã lưu" : "Lưu bài học"}
                </Button>
                <Button secondary onClick={() => void progress(true)}>
                  <CheckCircle2 size={17} />
                  {v.completed ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
                </Button>
              </div>
            )}
          </div>
          <div className="panel">
            <h2>Về bài học này</h2>
            <p>{v.description}</p>
            <h3>Bạn sẽ luyện tập điều gì?</h3>
            <ul className="learning-list">
              <li>
                <Check size={17} />
                Nhận diện tình huống trước khi ra quyết định.
              </li>
              <li>
                <Check size={17} />
                Đánh giá sự đánh đổi giữa tài nguyên và sức mạnh.
              </li>
              <li>
                <Check size={17} />
                Ghi lại một điểm cần cải thiện sau trận đấu.
              </li>
            </ul>
            {v.result && (
              <div className="coach-feedback">
                <Badge>PHẢN HỒI DÀNH RIÊNG CHO BẠN</Badge>
                <h3>Tổng kết từ coach</h3>
                <p>{v.result.summary}</p>
              </div>
            )}
          </div>
        </div>
        <aside>
          <h2>Bài học tiếp theo</h2>
          <div className="related-videos">
            {related.data?.items
              .filter((x: any) => x.id !== id)
              .map((v: any) => (
                <VideoCard key={v.id} video={v} />
              ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
export function SubmitVod() {
  const { session: s, refresh, notify } = useApp(),
    nav = useNavigate(),
    q = useQuery({ queryKey: ["coaches"], queryFn: () => api("/coaches") });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [access, setAccess] = useState("accessible");
  const benefit = s.benefits.find((b: any) => b.code === VOD);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api("/vod-reviews", "POST", {
        title: f.get("title"),
        url: f.get("url"),
        rank: f.get("rank"),
        focus: f.get("focus"),
        notes: f.get("notes"),
        coachId: f.get("coachId") || undefined,
        access,
        consent: f.get("consent") === "on",
      });
      await refresh();
      notify(
        access === "permission_required"
          ? "Đã giữ lượt. Bạn cần cấp quyền Drive để coach xem video."
          : access === "not_found"
            ? "Không tìm thấy tệp. Lượt đã được hoàn."
            : "Đã gửi VOD. Coach sẽ tiếp nhận yêu cầu của bạn.",
      );
      nav("/app/my-vods");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (!s.entitlements.includes(VOD))
    return (
      <Empty
        title="Thêm một góc nhìn từ coach"
        description="Gói Cao Thủ trở lên mở quyền gửi VOD Review cá nhân."
        action={<Button to="/membership">Khám phá quyền lợi</Button>}
      />
    );
  return (
    <>
      <PageTitle
        eyebrow="HIỂU TRẬN ĐẤU CỦA CHÍNH BẠN"
        title="Gửi VOD Review"
        description="Một trận đấu, nhiều điều để học. Hãy để coach cùng bạn nhìn lại."
        action={
          <Badge color="#bf9cff">
            <Video size={15} /> Còn {benefit?.remaining || 0} / 1 lượt
          </Badge>
        }
      />
      <div className="form-aside-layout">
        <form className="panel" onSubmit={submit}>
          <h2>Chia sẻ trận đấu của bạn</h2>
          <p>Thông tin cụ thể giúp coach tập trung đúng vấn đề bạn cần.</p>
          <ErrorBox error={error} />
          {!benefit?.remaining && (
            <div className="notice">
              Bạn đã dùng hoặc giữ hết lượt trong chu kỳ này. Xem yêu cầu đang
              xử lý trong VOD của tôi.
            </div>
          )}
          <label>
            Tiêu đề trận đấu
            <input
              name="title"
              placeholder="Ví dụ: Mất lợi thế sau khi lên cấp 8"
              required
              minLength={2}
              maxLength={200}
            />
          </label>
          <label>
            Liên kết Google Drive
            <div className="input-icon">
              <Link2 size={18} />
              <input
                name="url"
                type="url"
                placeholder="https://drive.google.com/file/d/…/view"
                required
              />
            </div>
            <small>Chỉ nhận liên kết tệp Google Drive qua HTTPS.</small>
          </label>
          <div className="form-grid">
            <label>
              Hạng khi chơi trận này
              <select name="rank" defaultValue={s.user.rank}>
                {[
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
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Vấn đề muốn tập trung
              <select name="focus">
                <option>Kinh tế</option>
                <option>Xếp đội hình</option>
                <option>Xoay bài</option>
                <option>Lõi nâng cấp</option>
                <option>Khác</option>
              </select>
            </label>
          </div>
          <label>
            Coach mong muốn
            <select name="coachId">
              <option value="">Để đội ngũ sắp xếp</option>
              {q.data?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.user.displayName} · {c.specialty}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ghi chú cho coach
            <textarea
              name="notes"
              rows={4}
              maxLength={2000}
              placeholder="Bạn phân vân ở vòng nào? Bạn muốn cải thiện điều gì?"
            />
          </label>
          <label>
            Kết quả kiểm tra Drive mô phỏng
            <select value={access} onChange={(e) => setAccess(e.target.value)}>
              <option value="accessible">Coach có quyền xem</option>
              <option value="permission_required">
                Coach chưa được cấp quyền
              </option>
              <option value="not_found">Không tìm thấy tệp</option>
            </select>
          </label>
          <label className="checkbox-row">
            <input name="consent" type="checkbox" required />
            <span>
              Tôi có quyền chia sẻ video này và đồng ý để coach phụ trách truy
              cập, phân tích nội dung.
            </span>
          </label>
          <Button type="submit" disabled={busy || !benefit?.remaining}>
            {busy ? "Đang gửi yêu cầu…" : "Gửi VOD cho coach"}
            <Upload size={17} />
          </Button>
          <p className="form-hint">Một lượt sẽ được giữ khi bạn gửi yêu cầu.</p>
        </form>
        <aside>
          <div className="panel help-panel">
            <ShieldCheck size={28} />
            <h3>Video của bạn luôn riêng tư</h3>
            <p>
              Chỉ bạn, coach phụ trách và quản trị viên được truy cập nguồn
              video.
            </p>
            <div className="panel-divider" />
            <h3>Chuẩn bị trước khi gửi</h3>
            <ol>
              <li>Tải trận đấu đầy đủ lên Google Drive.</li>
              <li>
                Trong bản thật, chia sẻ trực tiếp cho tài khoản xử lý do đơn vị
                vận hành cung cấp.
              </li>
              <li>Ghi rõ mốc thời gian và điều muốn coach tập trung.</li>
            </ol>
            <div className="notice">
              Bản PoC chỉ mô phỏng quyền Drive. Không cần chia sẻ tệp thật hoặc
              dùng chế độ công khai.
            </div>
          </div>
          <div className="panel">
            <h3>Sau khi gửi thì sao?</h3>
            <div className="vertical-steps">
              {[
                "Kiểm tra quyền truy cập",
                "Coach tiếp nhận & phân tích",
                "Nhận video phản hồi riêng",
                "Luyện tập theo gợi ý",
              ].map((x, i) => (
                <div key={x}>
                  <span>{i + 1}</span>
                  {x}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
export function MyVods() {
  const { session: s, refresh, notify } = useApp();
  const q = useQuery({
      queryKey: ["reviews", s.user.id],
      queryFn: () => api("/vod-reviews/mine"),
    }),
    videos = useQuery({
      queryKey: ["personal-videos", s.user.id],
      queryFn: () => api("/videos?tab=mine&limit=50"),
    });
  const [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState("");
  async function action(id: string, action: string) {
    setBusy(id);
    try {
      await api(
        `/vod-reviews/${id}/${action}`,
        "POST",
        action === "recheck-source" ? { access: "accessible" } : {},
      );
      await refresh();
      notify(
        action === "cancel"
          ? "Đã hủy yêu cầu và hoàn lượt."
          : "Đã kiểm tra lại: coach có quyền truy cập trong mô phỏng.",
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageTitle
        title="VOD của tôi"
        description="Từng phản hồi là một cơ hội để tiến bộ. Chỉ bạn và coach phụ trách có quyền xem."
        action={
          s.entitlements.includes(VOD) && (
            <Button to="/app/submit">
              <Upload size={17} />
              Gửi VOD mới
            </Button>
          )
        }
      />
      <ErrorBox error={error || q.error || videos.error} />
      <h2 className="section-title">Yêu cầu của bạn</h2>
      {q.isLoading ? (
        <Loading />
      ) : q.data?.length ? (
        <div className="review-list">
          {q.data.map((r: any) => (
            <article key={r.id} className="review-row">
              <div className="review-icon">
                <Video size={22} />
              </div>
              <div className="review-info">
                <div className="card-meta">
                  <span>{date(r.createdAt)}</span>
                  <span>·</span>
                  <span>{r.focus}</span>
                </div>
                <h3>{r.title}</h3>
                <p>
                  {r.coach?.user.displayName || "Đang chờ phân công"} ·{" "}
                  {labels[r.usage.status]}
                </p>
                {r.status === "needs_permission" && (
                  <div className="inline-warning">
                    Coach chưa có quyền Drive. Trong PoC, nút kiểm tra lại sẽ mô
                    phỏng việc đã cấp quyền.
                  </div>
                )}
              </div>
              <div className="review-actions">
                <Status value={r.status} />
                {r.result && (
                  <Link
                    className="text-link"
                    to={`/app/watch/${r.result.videoId}`}
                  >
                    Xem phản hồi <ArrowRight size={15} />
                  </Link>
                )}
                {r.status === "needs_permission" && (
                  <Button
                    secondary
                    disabled={busy === r.id}
                    onClick={() => action(r.id, "recheck-source")}
                  >
                    Kiểm tra lại quyền
                  </Button>
                )}
                {["queued", "needs_permission"].includes(r.status) &&
                  r.usage.status === "reserved" && (
                    <button
                      className="text-button"
                      disabled={busy === r.id}
                      onClick={() => action(r.id, "cancel")}
                    >
                      Hủy & hoàn lượt
                    </button>
                  )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Chưa có yêu cầu VOD"
          description="Bắt đầu bằng một trận đấu mà bạn muốn hiểu rõ hơn."
          action={
            s.entitlements.includes(VOD) && (
              <Button to="/app/submit">Gửi VOD đầu tiên</Button>
            )
          }
        />
      )}
      <h2 className="section-title">Phản hồi dành riêng cho bạn</h2>
      {videos.data?.items.length ? (
        <div className="video-grid">
          {videos.data.items.map((v: any) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      ) : (
        <Empty
          title="Phản hồi sẽ xuất hiện ở đây"
          description="Khi coach hoàn thành, bạn sẽ nhận thông báo và xem lại video trong mục này."
        />
      )}
    </>
  );
}
export function Coaching() {
  const { session: s, refresh, notify } = useApp(),
    coaches = useQuery({
      queryKey: ["coaches"],
      queryFn: () => api("/coaches"),
    }),
    sessions = useQuery({
      queryKey: ["bookings", s.user.id],
      queryFn: () => api("/coaching/sessions/mine"),
    });
  const [coachId, setCoachId] = useState("coach-1"),
    [slot, setSlot] = useState(""),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false),
    [reschedule, setReschedule] = useState<any>(null);
  const available = useQuery({
    queryKey: ["availability", coachId],
    queryFn: () => api(`/coaches/${coachId}/availability`),
  });
  const allowed = s.entitlements.includes(COACHING),
    credit = s.benefits.find((b: any) => b.code === COACHING)?.remaining || 0;
  async function book(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!slot) {
      setError(new Error("Vui lòng chọn khung giờ còn trống."));
      return;
    }
    setBusy(true);
    try {
      if (reschedule)
        await api(`/coaching/sessions/${reschedule.id}/reschedule`, "POST", {
          start: slot,
        });
      else
        await api("/coaching/sessions", "POST", {
          coachId,
          start: slot,
          goal: f.get("goal"),
        });
      setSlot("");
      setReschedule(null);
      await refresh();
      notify("Đã xác nhận lịch coaching của bạn.");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="ĐỒNG HÀNH CÙNG COACH"
        title="Coaching 1-1"
        description="Một giờ tập trung vào bạn. Cùng coach tháo gỡ điểm nghẽn và xây kế hoạch luyện tập."
        action={
          <Badge color="#e6c779">
            <CalendarDays size={15} />
            Còn {credit} / 1 buổi
          </Badge>
        }
      />
      <ErrorBox error={error || sessions.error} />
      <div className="form-aside-layout">
        <div>
          {allowed ? (
            <form className="panel" onSubmit={book}>
              <h2>
                {reschedule ? "Đổi lịch buổi học" : "Chọn thời gian đồng hành"}
              </h2>
              <label>
                Coach của bạn
                <select
                  value={coachId}
                  disabled={!!reschedule}
                  onChange={(e) => {
                    setCoachId(e.target.value);
                    setSlot("");
                  }}
                >
                  {coaches.data?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.user.displayName} · {c.specialty}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="slot-fieldset">
                <legend>Khung giờ còn trống</legend>
                <p className="muted">
                  Múi giờ Việt Nam · UTC+7 · Mỗi buổi 60 phút
                </p>
                <ErrorBox error={available.error} />
                <div className="slots">
                  {available.data?.map((a: any) => (
                    <button
                      key={a.start}
                      type="button"
                      disabled={!a.available}
                      aria-pressed={slot === a.start}
                      className={slot === a.start ? "selected" : ""}
                      onClick={() => setSlot(a.start)}
                    >
                      <CalendarDays size={17} />
                      {time(a.start)}
                      {!a.available && <small>Đã được đặt</small>}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label>
                Mục tiêu buổi học
                <textarea
                  name="goal"
                  key={reschedule?.id || "new"}
                  defaultValue={reschedule?.goal || ""}
                  rows={4}
                  required
                  minLength={10}
                  maxLength={2000}
                  placeholder="Bạn muốn cải thiện điều gì sau buổi coaching?"
                />
              </label>
              <div className="actions">
                <Button
                  type="submit"
                  disabled={busy || (!credit && !reschedule)}
                >
                  {busy
                    ? "Đang xác nhận…"
                    : reschedule
                      ? "Xác nhận đổi lịch"
                      : "Xác nhận đặt lịch"}
                  <ArrowRight size={17} />
                </Button>
                {reschedule && (
                  <Button
                    secondary
                    onClick={() => {
                      setReschedule(null);
                      setSlot("");
                    }}
                  >
                    Quay lại
                  </Button>
                )}
              </div>
              {!credit && !reschedule && (
                <p className="form-hint">
                  Bạn đã dùng hoặc giữ lượt trong chu kỳ này.
                </p>
              )}
            </form>
          ) : (
            <div className="panel">
              <Empty
                title="Gặp coach, mở góc nhìn mới"
                description="Gói Đại Cao Thủ trở lên có một buổi coaching 1-1 mỗi chu kỳ."
                action={<Button to="/membership">Xem gói phù hợp</Button>}
              />
            </div>
          )}
          <h2 className="section-title">Lịch của tôi</h2>
          {sessions.data?.length ? (
            sessions.data.map((b: any) => (
              <article className="panel booking-card" key={b.id}>
                <div className="section-heading">
                  <Badge>
                    <CalendarDays size={14} />
                    {time(b.start)}
                  </Badge>
                  <Status value={b.status} />
                </div>
                <h3>{b.coach.user.displayName} · 60 phút</h3>
                <p>{b.goal}</p>
                {b.summary && (
                  <div className="coach-feedback">
                    <h4>Tổng kết & kế hoạch luyện tập</h4>
                    <p>{b.summary}</p>
                  </div>
                )}
                {b.status === "scheduled" && (
                  <div className="actions">
                    <Button
                      secondary
                      onClick={() => {
                        setReschedule(b);
                        setCoachId(b.coachId);
                        setSlot("");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Đổi lịch
                    </Button>
                    <button
                      className="text-button"
                      onClick={async () => {
                        try {
                          await api(
                            `/coaching/sessions/${b.id}/cancel`,
                            "POST",
                            {},
                          );
                          await refresh();
                          notify("Đã hủy lịch và hoàn lượt coaching.");
                        } catch (e) {
                          setError(e);
                        }
                      }}
                    >
                      Hủy lịch & hoàn lượt
                    </button>
                  </div>
                )}
              </article>
            ))
          ) : (
            <Empty
              title="Chưa có lịch coaching"
              description="Chọn coach và khung giờ để bắt đầu."
            />
          )}
        </div>
        <aside>
          <div className="panel help-panel">
            <Target size={29} />
            <h3>Một buổi học hiệu quả bắt đầu từ sự chuẩn bị.</h3>
            <ul className="learning-list">
              <li>
                <Check size={17} />
                Chọn 1–2 mục tiêu cụ thể.
              </li>
              <li>
                <Check size={17} />
                Chuẩn bị VOD hoặc tình huống cần thảo luận.
              </li>
              <li>
                <Check size={17} />
                Ghi lại câu hỏi trước buổi học.
              </li>
              <li>
                <Check size={17} />
                Dành thời gian luyện tập sau buổi học.
              </li>
            </ul>
            <div className="notice">
              Đổi hoặc hủy lịch trước ít nhất 24 giờ. Lịch trong PoC chỉ là mô
              phỏng, chưa tạo cuộc họp thật.
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
export function Academy() {
  const { session: s, refresh, notify } = useApp(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const e = s.enrollment,
    active = e?.status === "active" && s.entitlements.includes(ACADEMY);
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api("/academy/apply", "POST", { goal: f.get("goal") });
      await refresh();
      notify("Đã nhận hồ sơ ứng tuyển. Quản trị viên sẽ xét duyệt.");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  if (!active)
    return (
      <>
        <PageTitle
          eyebrow="SSC CHALLENGER ACADEMY"
          title="Một hành trình sâu hơn."
          description="Dành cho người chơi nghiêm túc với mục tiêu dài hạn và tư duy thi đấu."
        />
        <div className="academy-hero">
          <GraduationCap size={50} />
          <h2>
            Không chỉ lên hạng.
            <br />
            <em>Phát triển bản lĩnh thi đấu.</em>
          </h2>
          <p>Kế hoạch tuần · Bài tập thực chiến · Check-in cùng coach</p>
          <Badge color="#e6c779">4 suất minh họa · Đang nhận hồ sơ</Badge>
        </div>
        <ErrorBox error={error} />
        {e ? (
          <div className="panel">
            <Status value={e.status} />
            <h2>
              {e.status === "pending"
                ? "Hồ sơ đang chờ xét duyệt"
                : "Quyền Academy hiện chưa có hiệu lực"}
            </h2>
            <p>{e.goal}</p>
            <p>
              {e.status === "pending"
                ? "Bạn sẽ được mở workspace sau khi quản trị viên duyệt hồ sơ trong bản demo."
                : "Nội dung Academy yêu cầu gói Thách Đấu và ghi danh đang hoạt động."}
            </p>
          </div>
        ) : (
          <form className="panel form-width" onSubmit={apply}>
            <h2>Chia sẻ mục tiêu của bạn</h2>
            <label>
              Vì sao bạn muốn tham gia Academy?
              <textarea
                name="goal"
                rows={5}
                required
                minLength={20}
                maxLength={2000}
                placeholder="Hạng hiện tại, mục tiêu trong 3 tháng và thời gian bạn có thể dành để luyện tập…"
              />
            </label>
            <p>
              Ứng tuyển không tạo giao dịch thanh toán. Hồ sơ sẽ được quản trị
              viên xét duyệt.
            </p>
            <Button type="submit" disabled={busy}>
              {busy ? "Đang gửi hồ sơ…" : "Gửi đơn ứng tuyển"}
              <ArrowRight size={17} />
            </Button>
          </form>
        )}
      </>
    );
  const done = e.tasks.filter((t: any) => t.completed).length;
  return (
    <>
      <PageTitle
        eyebrow="CHALLENGER ACADEMY · TUẦN 01"
        title="Kế hoạch của người tiến xa."
        description={e.goal}
        action={
          <Badge color="#e6c779">
            <GraduationCap size={16} />
            Đã ghi danh
          </Badge>
        }
      />
      <div className="academy-hero">
        <div className="eyebrow">MỤC TIÊU TUẦN NÀY</div>
        <h2>
          Ổn định kinh tế.
          <br />
          <em>Chủ động nhịp độ.</em>
        </h2>
        <p>
          Phân tích quyết định ở vòng 3. Ưu tiên tính nhất quán thay vì thứ hạng
          từng trận.
        </p>
        <div className="academy-progress">
          <div className="progress-track">
            <i style={{ width: `${(done / e.tasks.length) * 100}%` }} />
          </div>
          <span>
            {done}/{e.tasks.length} nhiệm vụ hoàn thành
          </span>
        </div>
      </div>
      <ErrorBox error={error} />
      <div className="form-aside-layout">
        <section className="panel">
          <h2>Từng bước trong tuần</h2>
          <div className="task-list">
            {e.tasks.map((t: any, i: number) => (
              <label key={t.id} className={t.completed ? "complete" : ""}>
                <input
                  type="checkbox"
                  checked={t.completed}
                  onChange={async (ev) => {
                    try {
                      await api(`/academy/tasks/${t.id}`, "POST", {
                        completed: ev.target.checked,
                      });
                      await refresh();
                    } catch (err) {
                      setError(err);
                    }
                  }}
                />
                <span>
                  <small>NHIỆM VỤ {String(i + 1).padStart(2, "0")}</small>
                  <strong>{t.title}</strong>
                </span>
                {t.completed && <CheckCircle2 size={20} />}
              </label>
            ))}
          </div>
        </section>
        <aside className="panel">
          <Target size={27} />
          <h3>Check-in cùng coach</h3>
          <p>
            Ghi lại một quyết định bạn tự hào và một tình huống còn phân vân.
            Mang theo chúng vào buổi coaching tiếp theo.
          </p>
          <Button secondary to="/app/coaching">
            Xem lịch của tôi <ArrowRight size={16} />
          </Button>
          <div className="panel-divider" />
          <Link className="text-link" to="/app/submit">
            Gửi VOD tuần này <Upload size={16} />
          </Link>
        </aside>
      </div>
    </>
  );
}
export function Operations() {
  const { session: s, refresh, notify } = useApp(),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(""),
    [summary, setSummary] = useState<Record<string, string>>({});
  const allowed = ["coach", "admin"].includes(s.user.role);
  const q = useQuery({
      queryKey: ["queue", s.user.id],
      queryFn: () => api("/coach/vod-reviews/queue"),
      enabled: allowed,
    }),
    b = useQuery({
      queryKey: ["coach-sessions", s.user.id],
      queryFn: () => api("/coach/coaching/sessions"),
      enabled: allowed,
    });
  async function action(id: string, a: string) {
    setBusy(id);
    try {
      await api(`/coach/vod-reviews/${id}/${a}`, "POST", {
        coachId: "coach-1",
        summary: summary[id],
      });
      await refresh();
      notify("Đã cập nhật yêu cầu coaching.");
    } catch (e) {
      setError(e);
    } finally {
      setBusy("");
    }
  }
  if (!allowed)
    return (
      <Empty
        title="Khu vực dành cho coach"
        description="Tài khoản hiện tại không có quyền vận hành."
      />
    );
  return (
    <>
      <PageTitle
        title="Không gian của coach"
        description="Theo dõi yêu cầu, phân tích trận đấu và đồng hành cùng học viên."
      />
      <ErrorBox error={error || q.error || b.error} />
      <h2 className="section-title">Hàng đợi VOD Review</h2>
      {q.isLoading ? (
        <Loading />
      ) : q.data?.length ? (
        q.data.map((r: any) => (
          <article className="panel operation-card" key={r.id}>
            <div className="section-heading">
              <h3>{r.title}</h3>
              <Status value={r.status} />
            </div>
            <p>
              {r.rank} · {r.focus} ·{" "}
              {r.coach?.user.displayName || "Chưa phân công"}
            </p>
            <p>{r.notes || "Học viên chưa thêm ghi chú."}</p>
            <div className="actions">
              {["queued", "assigned"].includes(r.status) && (
                <Button
                  secondary
                  disabled={busy === r.id}
                  onClick={() =>
                    action(r.id, r.status === "queued" ? "assign" : "start")
                  }
                >
                  {r.status === "queued"
                    ? "Tiếp nhận yêu cầu"
                    : "Bắt đầu phân tích"}
                </Button>
              )}
              {r.coachId && (
                <button
                  className="text-button"
                  onClick={async () => {
                    try {
                      const source = await api(`/vod-reviews/${r.id}/source`);
                      notify(
                        `Nguồn Drive được phép truy cập: …/${new URL(source.url).pathname.split("/")[3]?.slice(-6)}`,
                      );
                    } catch (e) {
                      setError(e);
                    }
                  }}
                >
                  <ShieldCheck size={15} />
                  Kiểm tra quyền nguồn VOD
                </button>
              )}
            </div>
            {r.status === "in_review" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(r.id, "complete");
                }}
              >
                <label>
                  Tổng kết & kế hoạch cải thiện
                  <textarea
                    rows={4}
                    required
                    minLength={20}
                    value={summary[r.id] || ""}
                    onChange={(e) =>
                      setSummary({ ...summary, [r.id]: e.target.value })
                    }
                    placeholder="Điểm mạnh, quyết định cần cải thiện và bài tập cho chu kỳ tiếp theo…"
                  />
                </label>
                <p className="form-hint">
                  Video kết quả sử dụng nội dung minh họa của PoC và chỉ cấp
                  quyền cho học viên.
                </p>
                <Button type="submit" disabled={busy === r.id}>
                  Hoàn thành & gửi phản hồi <Check size={17} />
                </Button>
              </form>
            )}
            {r.result && <p className="coach-feedback">{r.result.summary}</p>}
          </article>
        ))
      ) : (
        <Empty
          title="Chưa có VOD cần xử lý"
          description="Yêu cầu chưa phân công hoặc được giao cho bạn sẽ xuất hiện tại đây."
        />
      )}
      <h2 className="section-title">Lịch coaching được phân công</h2>
      {b.data?.length ? (
        b.data.map((x: any) => (
          <form
            className="panel"
            key={x.id}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await api(`/coaching/sessions/${x.id}/complete`, "POST", {
                  summary: f.get("summary"),
                });
                await refresh();
                notify("Đã gửi tổng kết buổi học.");
              } catch (e) {
                setError(e);
              }
            }}
          >
            <div className="section-heading">
              <h3>
                {x.user.displayName} · {time(x.start)}
              </h3>
              <Status value={x.status} />
            </div>
            <p>Mục tiêu: {x.goal}</p>
            {x.status === "scheduled" ? (
              <>
                <label>
                  Tổng kết buổi học mẫu
                  <textarea name="summary" minLength={20} required rows={3} />
                </label>
                <Button type="submit">Hoàn thành buổi học mô phỏng</Button>
              </>
            ) : (
              <p>{x.summary}</p>
            )}
          </form>
        ))
      ) : (
        <Empty title="Chưa có lịch coaching được phân công" />
      )}
    </>
  );
}
export function Admin() {
  const { session: s, refresh, notify } = useApp(),
    [tab, setTab] = useState("overview"),
    [error, setError] = useState<unknown>();
  const allowed = s.user.role === "admin";
  const q = useQuery({
      queryKey: ["admin"],
      queryFn: () => api("/admin/overview"),
      enabled: allowed,
    }),
    plans = useQuery({
      queryKey: ["plans"],
      queryFn: () => api("/membership/plans"),
      enabled: allowed,
    }),
    reviews = useQuery({
      queryKey: ["admin-reviews"],
      queryFn: () => api("/coach/vod-reviews/queue"),
      enabled: allowed,
    });
  if (!allowed) return <Empty title="Bạn không có quyền quản trị" />;
  return (
    <>
      <PageTitle
        title="Quản trị nền tảng"
        description="Theo dõi học viên, gói hội viên, giao dịch và các quyết định vận hành."
      />
      <div className="tabs">
        {[
          ["overview", "Tổng quan"],
          ["users", "Tài khoản"],
          ["plans", "Gói & giá"],
          ["content", "Nội dung & coach"],
          ["academy", "Duyệt Academy"],
          ["credits", "VOD & hoàn lượt"],
          ["audit", "Nhật ký vận hành"],
        ].map(([k, l]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>
      <ErrorBox error={error || q.error} />
      {tab === "users" && <AdminUsers />}
      {tab === "content" && <AdminContent />}
      {q.isLoading ? (
        <Loading />
      ) : tab === "overview" ? (
        <>
          <div className="stats-grid">
            <div className="stat">
              <Users />
              <div>
                <span>Tài khoản</span>
                <strong>{q.data.users.length}</strong>
              </div>
            </div>
            <div className="stat">
              <Gem />
              <div>
                <span>Giao dịch mô phỏng</span>
                <strong>{q.data.payments.length}</strong>
              </div>
            </div>
            <div className="stat">
              <GraduationCap />
              <div>
                <span>Hồ sơ chờ duyệt</span>
                <strong>
                  {
                    q.data.enrollments.filter(
                      (x: any) => x.status === "pending",
                    ).length
                  }
                </strong>
              </div>
            </div>
          </div>
          <div className="panel">
            <h2>Tài khoản hệ thống</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Học viên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.users.map((u: any) => (
                    <tr key={u.id}>
                      <td>{u.displayName}</td>
                      <td>{u.email}</td>
                      <td>
                        {u.role === "admin"
                          ? "Quản trị"
                          : u.role === "coach"
                            ? "Coach"
                            : "Hội viên"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel">
            <h2>Giao dịch gần đây</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Số tiền mẫu</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.payments.map((p: any) => (
                    <tr key={p.id}>
                      <td>{date(p.createdAt)}</td>
                      <td>{money(p.amount)}</td>
                      <td>
                        <Status value={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
      {tab === "plans" &&
        plans.data?.map((p: any) => (
          <form
            key={p.id}
            className="panel"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await api(`/admin/plans/${p.id}`, "PATCH", {
                  name: f.get("name"),
                  description: f.get("description"),
                  amount: Number(f.get("amount")),
                  active: f.get("active") === "on",
                });
                await refresh();
                notify("Đã lưu cấu hình gói. Giá lịch sử được giữ nguyên.");
              } catch (e) {
                setError(e);
              }
            }}
          >
            <h2>{p.name}</h2>
            <div className="form-grid">
              <label>
                Tên gói
                <input
                  name="name"
                  defaultValue={p.name}
                  required
                  minLength={2}
                />
              </label>
              <label>
                Giá mỗi chu kỳ (VND)
                <input
                  name="amount"
                  type="number"
                  min={0}
                  max={100000000}
                  defaultValue={p.prices[0]?.amount}
                  required
                />
              </label>
            </div>
            <label>
              Mô tả
              <input
                name="description"
                defaultValue={p.description}
                required
                minLength={2}
              />
            </label>
            <label className="checkbox-row">
              <input name="active" type="checkbox" defaultChecked={p.active} />
              Đang mở đăng ký
            </label>
            <Button type="submit" secondary>
              Lưu cấu hình
            </Button>
          </form>
        ))}
      {tab === "academy" && (
        <div>
          {q.data?.enrollments.map((e: any) => (
            <article className="panel" key={e.id}>
              <div className="section-heading">
                <h3>{e.user.displayName}</h3>
                <Status value={e.status} />
              </div>
              <p>{e.goal}</p>
              {e.status === "pending" && (
                <Button
                  onClick={async () => {
                    try {
                      await api(
                        `/admin/enrollments/${e.id}/approve`,
                        "POST",
                        {},
                      );
                      await refresh();
                      notify("Đã duyệt ghi danh và mở gói Thách Đấu.");
                    } catch (e) {
                      setError(e);
                    }
                  }}
                >
                  Duyệt & mở workspace
                </Button>
              )}
            </article>
          ))}
        </div>
      )}
      {tab === "credits" &&
        reviews.data?.map((r: any) => (
          <form
            className="panel"
            key={r.id}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await api(`/coach/vod-reviews/${r.id}/release`, "POST", {
                  reason: f.get("reason"),
                });
                await refresh();
                notify("Đã hoàn lượt, từ chối yêu cầu và ghi nhật ký.");
              } catch (e) {
                setError(e);
              }
            }}
          >
            <div className="section-heading">
              <h3>{r.title}</h3>
              <Status value={r.status} />
            </div>
            <p>
              {r.coach?.user.displayName || "Chưa phân công"} ·{" "}
              {labels[r.usage.status]}
            </p>
            {r.status !== "completed" && r.usage.status !== "released" && (
              <>
                <label>
                  Lý do hoàn lượt
                  <input
                    name="reason"
                    minLength={10}
                    required
                    placeholder="Lý do vận hành, ít nhất 10 ký tự"
                  />
                </label>
                <Button secondary type="submit">
                  Hoàn lượt ngoại lệ
                </Button>
              </>
            )}
          </form>
        ))}
      {tab === "audit" && (
        <div className="panel">
          <h2>Nhật ký thao tác</h2>
          {q.data?.audits.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Thao tác</th>
                    <th>Lý do</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.audits.map((a: any) => (
                    <tr key={a.id}>
                      <td>{time(a.createdAt)}</td>
                      <td>
                        {{
                          assign: "Phân công",
                          start: "Bắt đầu review",
                          complete: "Hoàn thành",
                          release: "Hoàn lượt",
                          approve: "Duyệt Academy",
                          "edit-plan": "Sửa gói",
                          "create-video": "Tạo bài học",
                          "edit-video": "Sửa bài học",
                          "edit-coach": "Sửa hồ sơ coach",
                          "create-user": "Tạo tài khoản",
                          "edit-user": "Sửa tài khoản",
                          "disable-user": "Vô hiệu hóa tài khoản",
                          "reset-user-password": "Đặt lại mật khẩu",
                          "edit-own-coach-profile": "Coach sửa hồ sơ",
                          cancel: "Hủy yêu cầu",
                        }[a.action as string] || a.action}
                      </td>
                      <td>{a.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Chưa có thao tác vận hành" />
          )}
        </div>
      )}
    </>
  );
}
