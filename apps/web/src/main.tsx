import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  FormEvent,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  Outlet,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowUpRight,
  ArrowRight,
  LayoutDashboard,
  Library,
  Clock3,
  Bookmark,
  Video,
  Upload,
  CalendarDays,
  GraduationCap,
  Settings,
  Gem,
  Bell,
  Search,
  ChevronRight,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  Users,
  ContactRound,
  Play,
  Check,
  Target,
  Flame,
  TrendingUp,
  Sparkles,
  Command,
  BookOpen,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";
import { api, rights, VOD, COACHING, ACADEMY, date, labels } from "./api";
import {
  Membership,
  Coaches,
  CoachDetail,
  Auth,
  Checkout,
  Account,
  Legal,
} from "./public-pages";
import {
  LibraryPage,
  Watch,
  SubmitVod,
  MyVods,
  Coaching,
  Academy,
  Operations,
  Admin,
} from "./member-pages";
import { CoachProfile } from "./coach-profile";
import "./styles.css";
const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000, refetchOnWindowFocus: false },
  },
});
const Context = createContext<any>(null);
export const useApp = () => useContext(Context);
export function Button({
  children,
  to,
  onClick,
  secondary = false,
  disabled = false,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  to?: string;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const c = `button ${secondary ? "secondary" : ""} ${className}`;
  return to ? (
    <Link className={c} to={to}>
      {children}
    </Link>
  ) : (
    <button type={type} onClick={onClick} disabled={disabled} className={c}>
      {children}
    </button>
  );
}
export function Badge({
  children,
  color,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      className="badge"
      style={
        color
          ? { color, borderColor: `${color}40`, background: `${color}12` }
          : undefined
      }
    >
      {children}
    </span>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <span className={`status status-${value}`}>
      <i />
      {labels[value] || value}
    </span>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <BookOpen size={34} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" /> Đang tải dữ liệu…
    </div>
  );
}
export function ErrorBox({ error }: { error: unknown }) {
  return error ? (
    <div className="error" role="alert">
      <AlertCircle size={18} />
      {error instanceof Error ? error.message : String(error)}
    </div>
  ) : null;
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Footer() {
  return (
    <footer>
      <div>
        <Brand />
        <p>Học có lộ trình. Tiến bộ từng trận.</p>
      </div>
      <div>
        <Link to="/privacy">Chính sách bảo mật</Link>
        <Link to="/terms">Điều khoản sử dụng</Link>
        <Link to="/legal">Tài nguyên & bản quyền</Link>
      </div>
      <p className="legal-note">
        SSC Academy là dự án trải nghiệm miễn phí, sử dụng tài nguyên thuộc Riot
        Games theo chính sách “Legal Jibber Jabber”. Riot Games không bảo trợ
        hay tài trợ dự án này. Mọi giá, hồ sơ coach và thành tích đều là dữ liệu
        minh họa.
      </p>
    </footer>
  );
}
function Brand() {
  return (
    <Link to="/" className="brand" aria-label="SSC Academy — Trang chủ">
      <span className="brand-mark">
        <Command size={22} />
      </span>
      <span>
        SSC<span className="brand-sub">ACADEMY</span>
      </span>
    </Link>
  );
}
function Provider({ children }: { children: ReactNode }) {
  const query = useQuery({
      queryKey: ["session"],
      queryFn: () => api("/auth/session"),
    }),
    [toast, setToast] = useState("");
  const qc = useQueryClient();
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4200);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const refresh = () => qc.invalidateQueries();
  return (
    <Context.Provider
      value={{
        session: query.data,
        sessionLoading: query.isLoading,
        sessionError: query.error,
        refresh,
        notify: setToast,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
    </Context.Provider>
  );
}
export function DemoSwitch({ compact = false }: { compact?: boolean }) {
  const { session, refresh, notify } = useApp(),
    [busy, setBusy] = useState(false);
  const nav = useNavigate();
  if (!session?.demo) return null;
  async function change(account: string) {
    setBusy(true);
    try {
      await api("/demo/login", "POST", { account });
      await refresh();
      nav(
        account.startsWith("coach")
          ? "/app/coach"
          : account === "admin"
            ? "/app/admin"
            : "/app",
      );
      notify("Đã chuyển tài khoản trải nghiệm.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <label className={`demo-switch ${compact ? "compact" : ""}`}>
      <span>
        <Sparkles size={14} />{" "}
        {compact ? "Trải nghiệm" : "TÀI KHOẢN TRẢI NGHIỆM"}
      </span>
      <select
        aria-label="Chuyển tài khoản trải nghiệm"
        disabled={busy}
        value={session.user?.id?.replace("demo-", "") || ""}
        onChange={(e) => change(e.target.value)}
      >
        <option value="" disabled>
          Chọn gói để khám phá
        </option>
        <option value="diamond">Kim Cương</option>
        <option value="master">Cao Thủ</option>
        <option value="grandmaster">Đại Cao Thủ</option>
        <option value="challenger">Thách Đấu</option>
        <option value="coach-1">Coach Hải Đăng</option>
        <option value="coach-2">Coach Minh Khang</option>
        <option value="admin">Quản trị viên</option>
      </select>
    </label>
  );
}
function PublicLayout() {
  const [open, setOpen] = useState(false),
    { session } = useApp();
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  return (
    <>
      <header className="public-header">
        <Brand />
        <nav className={open ? "open" : ""}>
          <NavLink to="/membership">Gói hội viên</NavLink>
          <NavLink to="/coaches">Đội ngũ coach</NavLink>
          <NavLink to="/library">Thư viện VOD</NavLink>
        </nav>
        <div className="header-actions">
          <Link className="login-link" to={session?.user ? "/app" : "/login"}>
            {session?.user ? "Vào học tập" : "Đăng nhập"}
          </Link>
          <Button to="/membership">
            Bắt đầu hành trình <ArrowUpRight size={16} />
          </Button>
          <button
            className="icon-button mobile-menu"
            aria-label="Mở menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main-content" className="public-content">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
function MemberLayout() {
  const { session: s, sessionLoading, sessionError, refresh } = useApp(),
    [open, setOpen] = useState(false),
    [notifications, setNotifications] = useState(false);
  const navigate = useNavigate(),
    loc = useLocation();
  const notices = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api("/notifications"),
    enabled: !!s?.user,
  });
  useEffect(() => setOpen(false), [loc.pathname, s?.user?.id]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", close);
    document.querySelector<HTMLButtonElement>(".sidebar-close")?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  if (sessionLoading) return <Loading />;
  if (sessionError) return <ErrorBox error={sessionError} />;
  if (!s?.user)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(loc.pathname)}`}
        replace
      />
    );
  const has = (code: string) => s.entitlements.includes(code);
  const main = [
    ["/app", "Tổng quan", LayoutDashboard],
    ["/app/library", "Thư viện VOD", Library],
    ["/app/library?tab=watching", "Đang xem", Clock3],
    ["/app/library?tab=saved", "Đã lưu", Bookmark],
  ] as const;
  const personal = [
    ...(has(VOD) || s.hasPersonal
      ? [["/app/my-vods", "VOD của tôi", Video]]
      : []),
    ...(has(VOD) ? [["/app/submit", "Gửi VOD Review", Upload]] : []),
    ...(has(COACHING) ? [["/app/coaching", "Coaching 1-1", CalendarDays]] : []),
    ...(has(ACADEMY) && s.enrollment?.status === "active"
      ? [["/app/academy", "Academy", GraduationCap]]
      : []),
  ];
  const navItem = ([path, title, Icon]: any) => {
    const active = path.includes("?")
      ? loc.pathname + loc.search === path
      : loc.pathname === path && !loc.search;
    return (
      <Link
        key={path}
        className={`nav-item ${active ? "active" : ""}`}
        to={path}
      >
        <Icon size={19} />
        {title}
        {title === "Academy" && <span className="tiny">MỚI</span>}
      </Link>
    );
  };
  return (
    <div className="member-layout">
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Đóng menu"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <button
          className="icon-button sidebar-close"
          aria-label="Đóng menu học tập"
          onClick={() => setOpen(false)}
        >
          <X size={19} />
        </button>
        <Brand />
        <div className="workspace-label">KHÔNG GIAN HỌC TẬP</div>
        <nav>
          {main.map(navItem)}
          {personal.length > 0 && (
            <>
              <div className="nav-caption">PHÁT TRIỂN CÁ NHÂN</div>
              {personal.map(navItem)}
            </>
          )}
          {["coach", "admin"].includes(s.user.role) && (
            <>
              <div className="nav-caption">VẬN HÀNH</div>
              {navItem(["/app/coach", "Hàng đợi coaching", Users])}
              {s.user.role === "coach" &&
                navItem([
                  "/app/coach/profile",
                  "Hồ sơ công khai",
                  ContactRound,
                ])}
              {s.user.role === "admin" &&
                navItem(["/app/admin", "Quản trị", ShieldCheck])}
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-plan">
            <Gem size={23} />
            <div>
              <strong>
                {s.subscription?.plan.name || "Khám phá miễn phí"}
              </strong>
              <span>
                {s.subscription
                  ? "Hội viên đang hoạt động"
                  : "Bắt đầu hành trình của bạn"}
              </span>
            </div>
            <Link to="/membership" aria-label="Xem gói hội viên">
              <ArrowUpRight size={18} />
            </Link>
          </div>
          {navItem(["/app/account", "Tài khoản & hội viên", Settings])}
          <DemoSwitch />
          <button
            className="nav-item logout"
            onClick={async () => {
              await api("/auth/logout", "POST", {});
              await refresh();
              navigate("/");
            }}
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </aside>
      <div className="member-main" inert={open || undefined}>
        <header className="member-header">
          <button
            className="icon-button mobile-menu"
            aria-label="Mở menu học tập"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Không gian học tập <ChevronRight size={14} />
            <span>
              {([
                ...main,
                ...personal,
                ["/app/account", "Tài khoản"],
                ["/app/coach", "Hàng đợi coaching"],
                ["/app/coach/profile", "Hồ sơ công khai"],
                ["/app/admin", "Quản trị"],
              ].find((x) => x[0] === loc.pathname)?.[1] as string) || "Bài học"}
            </span>
          </div>
          <div className="header-actions">
            <Link to="/app/library" className="header-search">
              <Search size={17} />
              <span>Tìm bài học, chủ đề…</span>
              <kbd>/</kbd>
            </Link>
            <div className="notifications">
              <button
                className="icon-button"
                aria-label="Thông báo"
                aria-expanded={notifications}
                onClick={async () => {
                  setNotifications(!notifications);
                  if (!notifications) {
                    await api("/notifications/read", "POST", {});
                    notices.refetch();
                  }
                }}
              >
                <Bell size={19} />
                {notices.data?.some((n: any) => !n.read) && (
                  <i className="notification-dot" />
                )}
              </button>
              {notifications && (
                <div className="notification-panel">
                  <h3>Thông báo của bạn</h3>
                  {notices.data?.length ? (
                    notices.data.map((n: any) => <p key={n.id}>{n.message}</p>)
                  ) : (
                    <p>
                      Chưa có thông báo mới. Coach sẽ báo bạn khi có phản hồi.
                    </p>
                  )}
                </div>
              )}
            </div>
            <Link
              to="/app/account"
              className="user-avatar"
              aria-label="Tài khoản của bạn"
            >
              {s.user.displayName.slice(0, 1)}
            </Link>
          </div>
        </header>
        <main id="main-content" className="app-content">
          <Outlet />
        </main>
        <div className="app-footer">
          <span>© SSC Academy · Bản trải nghiệm miễn phí</span>
          <Link to="/legal">
            Tài nguyên Riot Games · Không được Riot bảo trợ
          </Link>
        </div>
      </div>
    </div>
  );
}
function Landing() {
  const { session } = useApp();
  return (
    <>
      <section className="landing-hero">
        <div className="hero-art" />
        <div className="hero-grain" />
        <div className="landing-copy">
          <div className="eyebrow">
            <span className="live-dot" /> HỌC CÓ LỘ TRÌNH. CHƠI CÓ TƯ DUY.
          </div>
          <h1>
            Mỗi quyết định.
            <br />
            Một bước <em>tiến xa.</em>
          </h1>
          <p>
            Vượt qua giới hạn của chính mình trong Đấu Trường Chân Lý. Học từ
            coach, hiểu từng trận đấu và xây dựng lối chơi của riêng bạn.
          </p>
          <div className="actions">
            <Button to="/membership">
              Khám phá gói hội viên <ArrowUpRight size={19} />
            </Button>
            <Button to="/library" secondary>
              <Play size={16} /> Xem bài học miễn phí
            </Button>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack">
              <img src="/assets/coach-1.jpg" alt="" />
              <img src="/assets/coach-2.jpg" alt="" />
              <span>+2</span>
            </div>
            <div>
              <strong>Đồng hành, không chỉ hướng dẫn</strong>
              <span>VOD chuyên sâu · Phản hồi cá nhân · Coaching 1-1</span>
            </div>
          </div>
        </div>
        <div className="hero-art-label">
          <span>01 / KHỞI ĐẦU HÀNH TRÌNH</span>
          <strong>
            Hiểu trận đấu.
            <br />
            Làm chủ quyết định.
          </strong>
        </div>
      </section>
      <div className="value-strip">
        <div>
          <BookOpen />
          <span>
            Học theo chủ đề<strong>Nền tảng vững chắc</strong>
          </span>
        </div>
        <div>
          <Video />
          <span>
            Phân tích VOD cá nhân<strong>Hiểu đúng điểm cần cải thiện</strong>
          </span>
        </div>
        <div>
          <Target />
          <span>
            Đồng hành cùng coach<strong>Lộ trình dành cho bạn</strong>
          </span>
        </div>
        <div>
          <ShieldCheck />
          <span>
            Tiến bộ bền vững<strong>Tư duy thay vì học thuộc</strong>
          </span>
        </div>
      </div>
      <section className="public-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">MỘT NƠI. MỌI BƯỚC TIẾN.</div>
            <h2>Hành trình lên hạng có người đồng hành.</h2>
          </div>
          <Link className="text-link" to="/coaches">
            Gặp đội ngũ coach <ArrowRight size={18} />
          </Link>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-number">01</span>
            <Library />
            <h3>Học đúng điều bạn cần</h3>
            <p>
              Thư viện bài học theo chủ đề, trình độ và phiên bản. Lưu lại, xem
              tiếp và xây nền tảng theo nhịp của bạn.
            </p>
            <Link to="/library">
              Khám phá thư viện <ArrowUpRight size={18} />
            </Link>
          </article>
          <article className="feature-card">
            <span className="feature-number">02</span>
            <Video />
            <h3>Nhìn lại để tiến xa hơn</h3>
            <p>
              Gửi trận đấu của bạn. Coach phân tích quyết định, chỉ ra điểm
              nghẽn và đưa ra bài tập thực tế.
            </p>
            <Link to="/membership">
              Tìm hiểu VOD Review <ArrowUpRight size={18} />
            </Link>
          </article>
          <article className="feature-card">
            <span className="feature-number">03</span>
            <Target />
            <h3>Một lộ trình, riêng cho bạn</h3>
            <p>
              Trao đổi trực tiếp cùng coach, đặt mục tiêu cụ thể và theo dõi
              từng bước tiến bộ của mình.
            </p>
            <Link to="/membership">
              Khám phá coaching 1-1 <ArrowUpRight size={18} />
            </Link>
          </article>
        </div>
      </section>
      <section className="demo-invite">
        <div>
          <Badge>
            <Sparkles size={14} /> TRẢI NGHIỆM MIỄN PHÍ
          </Badge>
          <h2>Thử hành trình trước khi bắt đầu.</h2>
          <p>
            Khám phá đầy đủ bốn cấp hội viên bằng tài khoản mẫu.
            <br />
            Không cần thẻ. Không phát sinh thanh toán.
          </p>
        </div>
        <DemoSwitch />
      </section>
    </>
  );
}
export function VideoCard({ video: v }: { video: any }) {
  const { session, refresh, notify } = useApp();
  return (
    <article className="video-card">
      <Link
        to={`${session?.user ? "/app" : ""}/watch/${v.id}`}
        className="video-image"
      >
        <img src={v.image} alt="" loading="lazy" />
        <span className="image-shade" />
        <span className="video-top-label">
          {v.visibility === "public"
            ? "MIỄN PHÍ"
            : v.visibility === "private"
              ? "DÀNH RIÊNG CHO BẠN"
              : `PHIÊN BẢN ${v.patch}`}
        </span>
        <span className="play-circle">
          <Play size={20} fill="currentColor" />
        </span>
        <span className="duration">
          {Math.floor(v.duration / 60)}:
          {String(v.duration % 60).padStart(2, "0")}
        </span>
        {v.locked && (
          <span className="locked-tag">
            <Gem size={13} /> Hội viên
          </span>
        )}
        {v.position > 0 && (
          <span className="image-progress">
            <i
              style={{
                width: `${Math.min(100, (v.position / v.duration) * 100)}%`,
              }}
            />
          </span>
        )}
      </Link>
      <div className="video-info">
        <div className="card-meta">
          <span>{v.topic}</span>
          <span>•</span>
          <span>{v.level}</span>
          {v.completed && <Check size={14} />}
        </div>
        <Link to={`${session?.user ? "/app" : ""}/watch/${v.id}`}>
          <h3>{v.title}</h3>
        </Link>
        <div className="video-coach">
          <img src={v.coach.image} alt="" />
          <span>{v.coach.user.displayName}</span>
          {session?.user && (
            <button
              className={`save-button ${v.saved ? "saved" : ""}`}
              aria-label={v.saved ? `Bỏ lưu ${v.title}` : `Lưu ${v.title}`}
              aria-pressed={v.saved}
              onClick={async () => {
                try {
                  await api(
                    `/videos/${v.id}/favorite`,
                    v.saved ? "DELETE" : "POST",
                    {},
                  );
                  await refresh();
                  notify(
                    v.saved
                      ? "Đã bỏ lưu bài học."
                      : "Đã lưu vào danh sách của bạn.",
                  );
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              <Bookmark size={17} fill={v.saved ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
function Dashboard() {
  const { session: s } = useApp(),
    has = (c: string) => s.entitlements.includes(c);
  const q = useQuery({
    queryKey: ["dashboard-videos", s.user.id],
    queryFn: () => api("/videos?limit=6&type=lesson"),
  });
  const stats = useQuery({
    queryKey: ["learning-stats", s.user.id],
    queryFn: () => api("/users/me/stats"),
  });
  const watching = useQuery({
    queryKey: ["watching", s.user.id],
    queryFn: () => api("/videos?tab=watching&limit=1"),
  });
  const bookings = useQuery({
    queryKey: ["bookings", s.user.id],
    queryFn: () => api("/coaching/sessions/mine"),
  });
  const reviews = useQuery({
    queryKey: ["reviews", s.user.id],
    queryFn: () => api("/vod-reviews/mine"),
  });
  const benefit = (c: string) =>
    s.benefits.find((b: any) => b.code === c)?.remaining || 0;
  const enrolled = has(ACADEMY) && s.enrollment?.status === "active";
  const cta = enrolled
    ? ["Xem kế hoạch tuần", "/app/academy"]
    : has(COACHING)
      ? ["Đặt lịch coaching", "/app/coaching"]
      : has(VOD)
        ? ["Gửi VOD tháng này", "/app/submit"]
        : ["Tiếp tục học", "/app/library"];
  const w = watching.data?.items[0];
  const next = bookings.data?.find((b: any) => b.status === "scheduled");
  return (
    <>
      <div className="welcome-line">
        <span>
          <i className="live-dot" /> MỖI NGÀY MỘT BƯỚC TIẾN
        </span>
        <span>
          {new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(
            new Date(),
          )}
        </span>
      </div>
      <PageTitle
        title={`Chào ${s.user.displayName}, cùng tiến bộ nhé!`}
        description="Mỗi trận đấu đều là một bài học. Hành trình hôm nay bắt đầu từ đây."
        action={
          <Badge color={s.subscription?.plan.color}>
            <Gem size={16} />
            {s.subscription?.plan.name || "Khám phá miễn phí"}
          </Badge>
        }
      />
      <section className="dashboard-hero">
        <div>
          <Badge>
            <Sparkles size={14} /> HÀNH TRÌNH CỦA BẠN
          </Badge>
          <h2>
            Chơi có tư duy.
            <br />
            <em>Tiến bộ có lộ trình.</em>
          </h2>
          <p>
            Học cách đưa ra quyết định tốt hơn,
            <br />
            từng vòng đấu, từng trận đấu.
          </p>
          <Button to={cta[1]}>
            {cta[0]} <ArrowUpRight size={18} />
          </Button>
        </div>
        <div className="hero-side-caption">
          <span>SSC / HỌC TẬP & PHÁT TRIỂN</span>
          <strong>
            Nâng tầm
            <br />
            lối chơi của bạn.
          </strong>
        </div>
      </section>
      {enrolled && (
        <div className="academy-banner">
          <GraduationCap size={29} />
          <div>
            <span className="eyebrow">ACADEMY · TUẦN 01</span>
            <h3>Tập trung vào quyết định, thứ hạng sẽ theo sau.</h3>
            <p>
              {s.enrollment.tasks.filter((t: any) => t.completed).length}/
              {s.enrollment.tasks.length} nhiệm vụ đã hoàn thành
            </p>
          </div>
          <Button to="/app/academy" secondary>
            Xem kế hoạch <ArrowRight size={16} />
          </Button>
        </div>
      )}
      <div className="stats-grid">
        <article className="stat">
          <div className="stat-icon mint">
            <BookOpen size={20} />
          </div>
          <div>
            <span>Bài học đã hoàn thành</span>
            <strong>
              {stats.data?.completed || 0}
              <small> bài học</small>
            </strong>
            <p>Mỗi bài học, một góc nhìn mới</p>
          </div>
        </article>
        <article className="stat">
          <div className="stat-icon violet">
            <Video size={20} />
          </div>
          <div>
            <span>
              {has(VOD) ? "Lượt VOD trong chu kỳ" : "Bài học trong thư viện"}
            </span>
            <strong>
              {has(VOD) ? benefit(VOD) : q.data?.total || 12}
              <small>{has(VOD) ? " / 1 lượt" : " bài học"}</small>
            </strong>
            <p>
              {has(VOD)
                ? "Sẵn sàng nhận phản hồi cá nhân"
                : "Từ nền tảng đến nâng cao"}
            </p>
          </div>
        </article>
        <article className="stat">
          <div className="stat-icon gold">
            <Target size={20} />
          </div>
          <div>
            <span>{has(COACHING) ? "Coaching 1-1" : "Mục tiêu của bạn"}</span>
            <strong>
              {has(COACHING) ? benefit(COACHING) : "Top 4"}
              <small>{has(COACHING) ? " / 1 buổi" : " ổn định"}</small>
            </strong>
            <p>
              {has(COACHING)
                ? "Đồng hành cùng coach mỗi chu kỳ"
                : "Cải thiện từng quyết định"}
            </p>
          </div>
        </article>
      </div>
      <div className="dashboard-columns">
        <div>
          <div className="section-heading compact-heading">
            <h2>Tiếp tục hành trình</h2>
            <Link className="text-link" to="/app/library?tab=watching">
              Đang xem <ArrowRight size={16} />
            </Link>
          </div>
          {w ? (
            <Link to={`/app/watch/${w.id}`} className="continue-card">
              <div className="continue-image">
                <img src={w.image} alt="" />
                <span className="play-circle">
                  <Play size={20} fill="currentColor" />
                </span>
              </div>
              <div className="continue-body">
                <span className="eyebrow">
                  {w.topic} · PHIÊN BẢN {w.patch}
                </span>
                <h3>{w.title}</h3>
                <p>
                  {w.coach.user.displayName} <span>·</span>{" "}
                  {Math.floor(w.duration / 60)} phút
                </p>
                <div className="progress-track">
                  <i style={{ width: `${(w.position / w.duration) * 100}%` }} />
                </div>
                <small>
                  Đã xem {Math.round((w.position / w.duration) * 100)}%{" "}
                  <span>
                    Tiếp tục xem <ArrowRight size={14} />
                  </span>
                </small>
              </div>
            </Link>
          ) : (
            <Empty
              title="Sẵn sàng cho bài học đầu tiên?"
              action={<Button to="/app/library">Khám phá thư viện</Button>}
            />
          )}
          <div className="section-heading compact-heading">
            <div>
              <h2>Dành cho bước tiến tiếp theo</h2>
              <p>Những góc nhìn mới để làm chủ trận đấu.</p>
            </div>
            <Link className="text-link" to="/app/library">
              Xem tất cả <ArrowRight size={16} />
            </Link>
          </div>
          <ErrorBox error={q.error} />
          {q.isLoading ? (
            <Loading />
          ) : (
            <div className="video-grid dashboard-videos">
              {q.data?.items.slice(0, 3).map((v: any) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          )}
        </div>
        <aside className="dashboard-aside">
          <div className="section-heading compact-heading">
            <h2>Góc học tập của bạn</h2>
            <Target size={18} />
          </div>
          <article className="focus-card">
            <div className="icon-ring">
              <Flame size={22} />
            </div>
            <Badge>GỢI Ý HÔM NAY</Badge>
            <h3>
              Đừng chỉ nhìn
              <br />
              vào thứ hạng.
            </h3>
            <p>
              Sau mỗi trận, ghi lại một quyết định tốt và một điều bạn muốn làm
              khác đi.
            </p>
            <div className="focus-line" />
            <span>
              <Check size={16} /> Học từ quá trình, không chỉ kết quả
            </span>
          </article>
          {has(VOD) ? (
            <article className="mini-panel">
              <div className="section-heading">
                <Video size={19} />
                <Badge color="#bf9cff">VOD REVIEW</Badge>
              </div>
              <h3>
                {reviews.data?.some((r: any) => r.status === "completed")
                  ? "Coach đã có phản hồi cho bạn"
                  : "Một góc nhìn mới về trận đấu"}
              </h3>
              <p>{benefit(VOD)} lượt còn lại trong chu kỳ này.</p>
              <Link className="text-link" to="/app/my-vods">
                Xem VOD của tôi <ArrowRight size={16} />
              </Link>
            </article>
          ) : (
            <article className="mini-panel upgrade">
              <Gem size={23} />
              <h3>Tiến bộ cùng góc nhìn của coach</h3>
              <p>Mở gói Cao Thủ để nhận phân tích VOD cá nhân mỗi chu kỳ.</p>
              <Link className="text-link" to="/membership">
                Khám phá quyền lợi <ArrowUpRight size={16} />
              </Link>
            </article>
          )}
          {next && (
            <article className="mini-panel">
              <CalendarDays />
              <h3>Buổi coaching sắp tới</h3>
              <p>
                {timeLocal(next.start)} · {next.coach.user.displayName}
              </p>
              <Link to="/app/coaching" className="text-link">
                Chuẩn bị buổi học <ArrowRight size={16} />
              </Link>
            </article>
          )}
        </aside>
      </div>
    </>
  );
}
function timeLocal(s: string) {
  return new Date(s).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}
function RouteReset() {
  const l = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [l.pathname]);
  return null;
}
function NotFound() {
  return (
    <Empty
      title="Trang này chưa có trên hành trình."
      description="Đường dẫn có thể đã thay đổi."
      action={<Button to="/">Về trang chủ</Button>}
    />
  );
}
function App() {
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Provider>
          <a className="skip-link" href="#main-content">
            Bỏ qua điều hướng
          </a>
          <RouteReset />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Landing />} />
              <Route path="membership" element={<Membership />} />
              <Route path="coaches" element={<Coaches />} />
              <Route path="coaches/:id" element={<CoachDetail />} />
              <Route path="library" element={<LibraryPage />} />
              <Route path="watch/:id" element={<Watch />} />
              <Route path="login" element={<Auth />} />
              <Route path="register" element={<Auth />} />
              <Route path="forgot-password" element={<Auth />} />
              <Route path="checkout/:planId" element={<Checkout />} />
              <Route path="privacy" element={<Legal />} />
              <Route path="terms" element={<Legal />} />
              <Route path="legal" element={<Legal />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="app" element={<MemberLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="library" element={<LibraryPage />} />
              <Route path="watch/:id" element={<Watch />} />
              <Route path="submit" element={<SubmitVod />} />
              <Route path="my-vods" element={<MyVods />} />
              <Route path="coaching" element={<Coaching />} />
              <Route path="academy" element={<Academy />} />
              <Route path="account" element={<Account />} />
              <Route path="coach" element={<Operations />} />
              <Route path="coach/profile" element={<CoachProfile />} />
              <Route path="admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
