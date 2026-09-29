import { useState, FormEvent } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Gem,
  ShieldCheck,
  GraduationCap,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ExternalLink,
  CalendarDays,
  Target,
  BookOpen,
} from "lucide-react";
import { api, money, date, rights, labels } from "./api";
import {
  useApp,
  Button,
  Badge,
  PageTitle,
  Loading,
  ErrorBox,
  Empty,
  DemoSwitch,
  Status,
} from "./main";
export function Membership() {
  const q = useQuery({
      queryKey: ["plans"],
      queryFn: () => api("/membership/plans"),
    }),
    { session } = useApp();
  return (
    <div className="public-section membership-page">
      <div className="center-intro">
        <Badge>
          <Gem size={14} /> MỘT HÀNH TRÌNH, BỐN CẤP ĐỘ
        </Badge>
        <h1>
          Đầu tư vào <em>tư duy của bạn.</em>
        </h1>
        <p>
          Chọn sự đồng hành phù hợp. Mỗi cấp độ mở thêm cơ hội,
          <br />
          và giữ trọn quyền lợi của những cấp độ trước.
        </p>
        <span className="billing-label">
          <i className="live-dot" /> Theo chu kỳ 30 ngày · Giá minh họa · Không
          thu tiền thật
        </span>
      </div>
      <ErrorBox error={q.error} />
      {q.isLoading ? (
        <Loading />
      ) : (
        <div className="plans-grid">
          {q.data?.map((p: any) => (
            <article
              key={p.id}
              className={`plan-card ${p.id === "master" ? "featured" : ""}`}
              style={{ "--tier": p.color } as React.CSSProperties}
            >
              {p.id === "master" && (
                <div className="plan-recommend">
                  CÂN BẰNG GIỮA HỌC & THỰC HÀNH
                </div>
              )}
              <div className="tier-symbol">
                <Gem size={35} />
                {p.order > 1 && <span />}
              </div>
              <h2>{p.name}</h2>
              <p>{p.description}</p>
              <div className="plan-price">
                {money(p.prices[0]?.amount || 0)}
                <span>/ chu kỳ</span>
              </div>
              <Button
                to={p.inviteOnly ? "/app/academy" : `/checkout/${p.id}`}
                secondary={p.id !== "master"}
              >
                {p.inviteOnly
                  ? "Ứng tuyển Academy"
                  : session?.subscription?.plan.id === p.id
                    ? "Xem gói hiện tại"
                    : `Chọn ${p.name}`}
                <ArrowUpRight size={16} />
              </Button>
              <div className="plan-divider" />
              <strong className="small-label">
                {p.parentId
                  ? "KẾ THỪA MỌI QUYỀN LỢI TRƯỚC ĐÓ"
                  : "NỀN TẢNG CHO HÀNH TRÌNH CỦA BẠN"}
              </strong>
              <ul>
                {p.effective.map((e: string) => (
                  <li key={e}>
                    <Check size={16} />
                    {rights[e]}
                  </li>
                ))}
                <li>
                  <Check size={16} />
                  Theo dõi tiến độ & lưu bài học
                </li>
              </ul>
              {p.inviteOnly && <small>4 suất minh họa · Đang nhận hồ sơ</small>}
            </article>
          ))}
        </div>
      )}
      <div className="membership-note">
        <ShieldCheck size={22} />
        <p>
          Tự do khám phá toàn bộ quyền lợi trong bản trải nghiệm. Dữ liệu cá
          nhân và VOD được phân quyền riêng.
        </p>
        <DemoSwitch compact />
      </div>
      <section className="comparison">
        <h2>So sánh quyền lợi</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Quyền lợi</th>
                {q.data?.map((p: any) => (
                  <th key={p.id}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(rights).map(([code, label]) => (
                <tr key={code}>
                  <td>{label}</td>
                  {q.data?.map((p: any) => (
                    <td key={p.id}>
                      {p.effective.includes(code) ? (
                        <Check size={18} aria-label="Bao gồm" />
                      ) : (
                        <span aria-label="Không bao gồm">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="faq-layout">
        <div>
          <div className="eyebrow">GIẢI ĐÁP TRƯỚC KHI BẮT ĐẦU</div>
          <h2>Bạn có thể đang thắc mắc.</h2>
          <p>
            Mọi bước đều rõ ràng, từ chọn gói
            <br />
            đến buổi học đầu tiên.
          </p>
        </div>
        <div>
          {[
            [
              "Tôi nên bắt đầu với gói nào?",
              "Kim Cương phù hợp nếu bạn muốn tự học. Cao Thủ bổ sung phản hồi VOD cá nhân. Đại Cao Thủ dành cho người cần trao đổi trực tiếp. Thách Đấu có lộ trình Academy sau khi xét duyệt.",
            ],
            [
              "Lượt VOD và coaching được cấp như thế nào?",
              "Mỗi chu kỳ 30 ngày cấp một lượt theo quyền lợi. Lượt chưa dùng không cộng dồn. Khi coach chưa tiếp nhận, bạn có thể hủy yêu cầu hợp lệ để nhận lại lượt.",
            ],
            [
              "Tôi có mất VOD cá nhân khi hạ gói?",
              "Không. Những review cá nhân đã hoàn thành vẫn thuộc thư viện của bạn. Quyền gửi yêu cầu mới phụ thuộc vào gói đang hoạt động.",
            ],
            [
              "Đây có phải giao dịch thật không?",
              "Không. SSC Academy hiện là bản PoC miễn phí. Thanh toán, lịch hẹn, kiểm tra Drive và video đều có phần mô phỏng để bạn thử quy trình.",
            ],
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
export function Coaches() {
  const q = useQuery({ queryKey: ["coaches"], queryFn: () => api("/coaches") });
  return (
    <div className="public-section">
      <div className="center-intro">
        <Badge>
          <Target size={14} /> NGƯỜI ĐỒNG HÀNH CỦA BẠN
        </Badge>
        <h1>
          Học tư duy.
          <br />
          <em>Không chỉ học đội hình.</em>
        </h1>
        <p>
          Coach cùng bạn tìm ra lý do đằng sau mỗi quyết định.
          <br />
          Hồ sơ và thành tích dưới đây là dữ liệu minh họa.
        </p>
      </div>
      <ErrorBox error={q.error} />
      {q.isLoading ? (
        <Loading />
      ) : (
        <div className="coach-grid">
          {q.data?.map((c: any) => (
            <article key={c.id} className="coach-card">
              <img
                className="coach-portrait"
                src={c.image}
                alt={`Ảnh minh họa nhân vật Riot cho hồ sơ ${c.user.displayName}`}
              />
              <div>
                <Badge color="#e6c779">THÁCH ĐẤU · HỒ SƠ MẪU</Badge>
                <h2>{c.user.displayName}</h2>
                <p>{c.specialty}</p>
                <p>{c.bio}</p>
                <div className="coach-achievements">
                  <span>
                    <strong>1.200</strong> LP minh họa
                  </span>
                  <span>
                    <strong>4</strong> mùa đồng hành
                  </span>
                </div>
                <Button to={`/coaches/${c.id}`} secondary>
                  Xem hồ sơ coach <ArrowUpRight size={17} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
export function CoachDetail() {
  const { id } = useParams(),
    q = useQuery({
      queryKey: ["coach", id],
      queryFn: () => api(`/coaches/${id}`),
    });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const c = q.data;
  return (
    <div className="public-section">
      <Link className="back-link" to="/coaches">
        <ArrowLeft size={16} /> Đội ngũ coach
      </Link>
      <div className="coach-detail">
        <img src={c.image} alt="Hình nhân vật minh họa của Riot Games" />
        <div>
          <Badge>COACH MẪU · KHÔNG PHẢI HỒ SƠ NGƯỜI THẬT</Badge>
          <h1>{c.user.displayName}</h1>
          <h3>{c.headline}</h3>
          <p>{c.bio}</p>
          <p>{c.specialty}</p>
          <Button to="/app/coaching">
            Đặt lịch coaching <CalendarDays size={17} />
          </Button>
        </div>
      </div>
      <section className="panel">
        <h2>Thành tích & phương pháp</h2>
        {c.achievements.map((a: any) => (
          <div key={a.id} className="achievement">
            <Gem />
            <div>
              <h3>{a.title}</h3>
              <p>{a.description}</p>
            </div>
          </div>
        ))}
        <h3>Kênh cộng đồng tham khảo</h3>
        <a
          className="text-link"
          href="https://www.youtube.com/@playtft"
          target="_blank"
          rel="noreferrer"
        >
          Kênh Đấu Trường Chân Lý chính thức <ExternalLink size={16} />
        </a>
        <p className="muted">
          Không gắn mạng xã hội cá nhân cho hồ sơ coach giả lập.
        </p>
      </section>
    </div>
  );
}
export function Auth() {
  const loc = useLocation(),
    nav = useNavigate(),
    [params] = useSearchParams(),
    { refresh, notify } = useApp();
  const isRegister = loc.pathname === "/register",
    forgot = loc.pathname === "/forgot-password";
  const [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [token, setToken] = useState(""),
    [sent, setSent] = useState(false);
  const next = params.get("next") || "/app";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      if (forgot) {
        if (token) {
          await api("/auth/password/reset", "POST", {
            token,
            password: f.get("password"),
          });
          notify("Đã đặt lại mật khẩu. Vui lòng đăng nhập.");
          nav("/login");
        } else {
          const result = await api("/auth/password/forgot", "POST", {
            email: f.get("email"),
          });
          setSent(true);
          if (result.demoToken) setToken(result.demoToken);
        }
      } else {
        await api(isRegister ? "/auth/register" : "/auth/login", "POST", {
          email: f.get("email"),
          password: f.get("password"),
          ...(isRegister
            ? {
                displayName: f.get("displayName"),
                consent: f.get("consent") === "on",
              }
            : {}),
        });
        await refresh();
        nav(next.startsWith("/") && !next.startsWith("//") ? next : "/app");
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-art">
        <div className="eyebrow">SSC ACADEMY</div>
        <h2>
          Trận đấu tiếp theo.
          <br />
          <em>
            Phiên bản tốt hơn
            <br />
            của bạn.
          </em>
        </h2>
        <p>Hiểu điều mình làm. Tin vào điều mình học.</p>
      </div>
      <div className="auth-panel">
        <Badge>
          <Gem size={14} /> HÀNH TRÌNH BẮT ĐẦU TỪ ĐÂY
        </Badge>
        <h1>
          {forgot
            ? "Tìm lại quyền truy cập"
            : isRegister
              ? "Bắt đầu hành trình"
              : "Chào mừng bạn trở lại"}
        </h1>
        <p>
          {forgot
            ? "Chúng tôi sẽ giúp bạn đặt lại mật khẩu."
            : isRegister
              ? "Tạo tài khoản để lưu tiến độ và đồng hành cùng coach."
              : "Đăng nhập để tiếp tục những bài học còn dang dở."}
        </p>
        <form onSubmit={submit}>
          <ErrorBox error={error} />
          {sent && (
            <div className="notice">
              Nếu email tồn tại, hướng dẫn đã được tạo.{" "}
              {token
                ? "Trong PoC, bạn có thể đặt mật khẩu mới ngay bên dưới."
                : "Email thật chưa được tích hợp trong bản PoC."}
            </div>
          )}
          {isRegister && (
            <label>
              Tên hiển thị
              <input
                name="displayName"
                autoComplete="name"
                required
                minLength={2}
              />
            </label>
          )}
          {!token && (
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ban@example.com"
                required
              />
            </label>
          )}
          {(!forgot || token) && (
            <label>
              {token ? "Mật khẩu mới" : "Mật khẩu"}
              <div className="password-input">
                <input
                  name="password"
                  aria-label={token ? "Mật khẩu mới" : "Mật khẩu"}
                  type={show ? "text" : "password"}
                  autoComplete={
                    isRegister || token ? "new-password" : "current-password"
                  }
                  minLength={8}
                  maxLength={100}
                  required
                />
                <button
                  type="button"
                  aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <small>Ít nhất 8 ký tự.</small>
            </label>
          )}
          {isRegister && (
            <label className="checkbox-row">
              <input name="consent" type="checkbox" required />
              <span>
                Tôi đồng ý với <Link to="/terms">điều khoản</Link> và{" "}
                <Link to="/privacy">chính sách bảo mật</Link>.
              </span>
            </label>
          )}
          {!forgot && !isRegister && (
            <Link className="text-link auth-forgot" to="/forgot-password">
              Quên mật khẩu?
            </Link>
          )}
          <Button type="submit" disabled={busy}>
            {busy
              ? "Đang xử lý…"
              : forgot
                ? token
                  ? "Lưu mật khẩu mới"
                  : "Gửi hướng dẫn"
                : isRegister
                  ? "Tạo tài khoản"
                  : "Đăng nhập"}
            <ArrowRight size={17} />
          </Button>
        </form>
        <p className="auth-bottom">
          {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
          <Link
            to={`${isRegister ? "/login" : "/register"}?next=${encodeURIComponent(next)}`}
          >
            {isRegister ? "Đăng nhập" : "Đăng ký miễn phí"}
          </Link>
        </p>
        <div className="auth-demo">
          <span>HOẶC KHÁM PHÁ BẰNG TÀI KHOẢN MẪU</span>
          <DemoSwitch />
        </div>
      </div>
    </div>
  );
}
export function Checkout() {
  const { planId } = useParams(),
    { session, refresh } = useApp(),
    nav = useNavigate();
  const q = useQuery({
    queryKey: ["plans"],
    queryFn: () => api("/membership/plans"),
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [result, setResult] = useState("");
  const plan = q.data?.find((p: any) => p.id === planId);
  async function pay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session?.user) {
      nav(`/login?next=/checkout/${planId}`);
      return;
    }
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const p = await api("/payments/checkout-session", "POST", {
        planId,
        outcome: f.get("outcome"),
        coupon: f.get("coupon") || undefined,
        consent: true,
      });
      await refresh();
      setResult(p.status);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  if (!plan)
    return (
      <Empty
        title="Không tìm thấy gói hội viên"
        action={<Button to="/membership">Chọn lại gói</Button>}
      />
    );
  if (plan.inviteOnly)
    return (
      <Empty
        title="Academy cần được xét duyệt"
        action={<Button to="/app/academy">Gửi đơn ứng tuyển</Button>}
      />
    );
  if (result)
    return (
      <div className="result-page">
        <div className={`result-icon ${result}`}>
          {result === "succeeded" ? (
            <CheckCircle2 size={50} />
          ) : (
            <XCircle size={50} />
          )}
        </div>
        <h1>
          {result === "succeeded"
            ? "Hành trình mới đã mở!"
            : result === "failed"
              ? "Thanh toán chưa thành công"
              : "Bạn đã hủy thanh toán"}
        </h1>
        <p>
          {result === "succeeded"
            ? `Gói ${plan.name} đã được kích hoạt trong bản trải nghiệm. Chu kỳ kết thúc ${date(session.subscription.end)}.`
            : "Chưa có quyền lợi mới được kích hoạt. Bạn có thể thử lại bất cứ lúc nào."}
        </p>
        {result === "succeeded" && (
          <ul>
            {plan.effective.map((c: string) => (
              <li key={c}>
                <Check size={16} />
                {rights[c]}
              </li>
            ))}
          </ul>
        )}
        <div className="actions">
          {result === "succeeded" ? (
            <Button to="/app">
              Vào không gian học tập <ArrowRight size={17} />
            </Button>
          ) : (
            <Button onClick={() => setResult("")}>Thử thanh toán lại</Button>
          )}
          <Button secondary to="/membership">
            Xem các gói
          </Button>
        </div>
        <small>Giao dịch mô phỏng · Không phát sinh chi phí</small>
      </div>
    );
  return (
    <div className="public-section checkout-layout">
      <div>
        <Link className="back-link" to="/membership">
          <ArrowLeft size={16} /> Quay lại chọn gói
        </Link>
        <PageTitle
          title="Bước tiếp theo của bạn"
          description="Kiểm tra quyền lợi trước khi bắt đầu chu kỳ học tập."
        />
        <form onSubmit={pay} className="panel">
          <h2>Thông tin đăng ký</h2>
          <p>
            {session?.user
              ? session.user.email
              : "Bạn cần đăng nhập trước khi hoàn tất."}
          </p>
          <label>
            Mã ưu đãi
            <input name="coupon" placeholder="Thử mã SSC10" />
          </label>
          <label>
            Kịch bản thanh toán mô phỏng
            <select name="outcome">
              <option value="succeeded">Thành công</option>
              <option value="failed">Thất bại</option>
              <option value="cancelled">Hủy thanh toán</option>
            </select>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" required />
            <span>
              Tôi đã đọc chính sách chu kỳ, gia hạn và hủy gói trong{" "}
              <Link to="/terms">điều khoản sử dụng</Link>.
            </span>
          </label>
          <ErrorBox error={error} />
          <Button type="submit" disabled={busy}>
            {busy
              ? "Đang xác nhận…"
              : session?.user
                ? "Xác nhận thanh toán mô phỏng"
                : "Đăng nhập để tiếp tục"}
            <ArrowRight size={18} />
          </Button>
          <p className="form-hint">
            <ShieldCheck size={16} /> Không cần nhập thông tin thẻ. Không thu
            tiền thật.
          </p>
        </form>
      </div>
      <aside className="checkout-summary">
        <div className="tier-symbol" style={{ color: plan.color }}>
          <Gem size={36} />
        </div>
        <h2>{plan.name}</h2>
        <p>{plan.description}</p>
        <div className="plan-price">
          {money(plan.prices[0].amount)}
          <span>/ chu kỳ 30 ngày</span>
        </div>
        <ul>
          {plan.effective.map((c: string) => (
            <li key={c}>
              <Check size={17} />
              {rights[c]}
            </li>
          ))}
        </ul>
        <div className="notice">
          Giá chỉ dùng để trình diễn. Tất cả tính năng hiện được thử miễn phí.
        </div>
      </aside>
    </div>
  );
}
export function Account() {
  const { session: s, refresh, notify } = useApp(),
    [tab, setTab] = useState("profile"),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["payments", s.user.id],
    queryFn: () => api("/users/me/payments"),
  });
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api("/users/me", "PATCH", Object.fromEntries(f));
      await refresh();
      notify("Đã lưu thông tin tài khoản.");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Tài khoản & hội viên"
        description="Thông tin của bạn, quyền lợi của bạn. Luôn rõ ràng và dễ quản lý."
      />
      <div className="tabs">
        {[
          ["profile", "Hồ sơ cá nhân"],
          ["membership", "Gói hội viên"],
          ["payments", "Lịch sử thanh toán"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <ErrorBox error={error} />
      {tab === "profile" && (
        <form className="panel form-width" onSubmit={save}>
          <h2>Thông tin cá nhân</h2>
          <label>
            Tên hiển thị
            <input
              name="displayName"
              defaultValue={s.user.displayName}
              required
              minLength={2}
            />
          </label>
          <label>
            Email
            <input value={s.user.email} disabled readOnly />
          </label>
          <label>
            Riot ID
            <input
              name="riotId"
              defaultValue={s.user.riotId}
              placeholder="TênNgườiChơi#VN2"
            />
          </label>
          <div className="form-grid">
            <label>
              Hạng hiện tại
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
              Múi giờ
              <select name="timezone" defaultValue={s.user.timezone}>
                <option value="Asia/Ho_Chi_Minh">Việt Nam (UTC+7)</option>
                <option value="Asia/Bangkok">Bangkok (UTC+7)</option>
                <option value="UTC">UTC</option>
              </select>
            </label>
          </div>
          <Button disabled={busy} type="submit">
            {busy ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
          <div className="panel-divider" />
          <h3>Bảo mật tài khoản</h3>
          <p>
            Trạng thái email:{" "}
            {s.user.verified ? "Đã xác minh" : "Chưa xác minh"}
          </p>
          {!s.user.verified && (
            <Button
              secondary
              onClick={async () => {
                try {
                  await api("/auth/email/verify", "POST", {});
                  await refresh();
                  notify("Đã xác minh email trong chế độ demo.");
                } catch (e) {
                  setError(e);
                }
              }}
            >
              Xác minh email mẫu
            </Button>
          )}
          <Link className="text-link" to="/forgot-password">
            Đặt lại mật khẩu <ArrowRight size={16} />
          </Link>
        </form>
      )}
      {tab === "membership" && (
        <div className="panel form-width">
          {s.subscription ? (
            <>
              <Badge color={s.subscription.plan.color}>
                <Gem size={15} />
                {s.subscription.plan.name}
              </Badge>
              <h2>Tiếp tục hành trình của bạn</h2>
              <p>
                Chu kỳ: {date(s.subscription.start)} –{" "}
                {date(s.subscription.end)}
              </p>
              <Status value="active" />
              <ul className="benefit-list">
                {s.entitlements.map((c: string) => (
                  <li key={c}>
                    <Check size={16} />
                    {rights[c]}{" "}
                    {s.benefits.find((b: any) => b.code === c) && (
                      <strong>
                        Còn{" "}
                        {s.benefits.find((b: any) => b.code === c).remaining}{" "}
                        lượt
                      </strong>
                    )}
                  </li>
                ))}
              </ul>
              <div className="actions">
                <Button to="/membership">Xem các gói hội viên</Button>
                <Button
                  secondary
                  disabled={s.subscription.cancelAtEnd}
                  onClick={async () => {
                    try {
                      await api("/membership/cancel", "POST", {});
                      await refresh();
                      notify("Đã tắt gia hạn. Quyền lợi giữ đến cuối chu kỳ.");
                    } catch (e) {
                      setError(e);
                    }
                  }}
                >
                  {s.subscription.cancelAtEnd
                    ? "Đã tắt gia hạn"
                    : "Tắt gia hạn"}
                </Button>
              </div>
              {s.subscription.plan.order > 0 && (
                <div className="downgrade">
                  <p>
                    Hạ xuống Kim Cương trong demo có hiệu lực ngay. VOD đã hoàn
                    thành vẫn được giữ.
                  </p>
                  <Button
                    secondary
                    onClick={async () => {
                      try {
                        await api("/membership/change-plan", "POST", {
                          planId: "diamond",
                        });
                        await refresh();
                        notify("Đã hạ gói. VOD cá nhân cũ vẫn được giữ.");
                      } catch (e) {
                        setError(e);
                      }
                    }}
                  >
                    Hạ xuống Kim Cương
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Empty
              title="Chưa có gói hội viên"
              action={<Button to="/membership">Khám phá quyền lợi</Button>}
            />
          )}
        </div>
      )}
      {tab === "payments" && (
        <div className="panel">
          <h2>Lịch sử giao dịch mô phỏng</h2>
          <ErrorBox error={q.error} />
          {q.isLoading ? (
            <Loading />
          ) : q.data?.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Ngày giao dịch</th>
                    <th>Gói hội viên</th>
                    <th>Số tiền minh họa</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.map((p: any) => (
                    <tr key={p.id}>
                      <td>{date(p.createdAt)}</td>
                      <td>{p.subscription.price.plan.name}</td>
                      <td>{money(p.amount)}</td>
                      <td>
                        <Status value={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Chưa có giao dịch" />
          )}
        </div>
      )}
    </>
  );
}
export function Legal() {
  const path = useLocation().pathname;
  return (
    <article className="public-section prose">
      <PageTitle
        title={
          path === "/privacy"
            ? "Chính sách bảo mật"
            : path === "/terms"
              ? "Điều khoản sử dụng"
              : "Tài nguyên & bản quyền"
        }
        description="SSC Academy · Bản trải nghiệm miễn phí"
      />
      {path === "/privacy" ? (
        <>
          <h2>Dữ liệu trong bản trải nghiệm</h2>
          <p>
            Ứng dụng lưu hồ sơ tài khoản, tiến độ học, yêu thích, yêu cầu
            review, lịch coaching và giao dịch mô phỏng trong PostgreSQL. Không
            sử dụng thông tin cá nhân hoặc video nhạy cảm để thử nghiệm.
          </p>
          <h2>Quyền riêng tư của VOD</h2>
          <p>
            Liên kết nguồn Google Drive được mã hóa tại máy chủ. Chỉ chủ sở hữu,
            coach phụ trách và quản trị viên được xem nguồn. Video phản hồi cá
            nhân có quyền truy cập riêng và được giữ khi hạ gói.
          </p>
          <h2>Phiên đăng nhập</h2>
          <p>
            Cookie phiên chỉ chứa mã ngẫu nhiên, có thời hạn 7 ngày và không thể
            đọc bằng JavaScript. Đăng xuất sẽ thu hồi phiên. Mật khẩu được băm
            trước khi lưu.
          </p>
          <h2>Lưu trữ và xóa dữ liệu</h2>
          <p>
            PoC chạy trong môi trường cục bộ. Đơn vị vận hành có thể xóa dữ liệu
            thử nghiệm bằng cách khởi tạo cơ sở dữ liệu mới. Trước triển khai
            thật cần bổ sung quy trình yêu cầu xóa, thời hạn lưu trữ và thông
            tin liên hệ bảo mật.
          </p>
        </>
      ) : path === "/terms" ? (
        <>
          <h2>Phạm vi bản trải nghiệm</h2>
          <p>
            Đây là bản minh họa quy trình coaching. Mọi giá, thành tích, hồ sơ
            coach và giao dịch là dữ liệu mẫu. Không có thanh toán thật, cam kết
            thứ hạng hay dịch vụ coaching thật được cung cấp.
          </p>
          <h2>Chu kỳ, nâng cấp và hủy</h2>
          <p>
            Chu kỳ mẫu kéo dài 30 ngày. Lượt chưa dùng không cộng dồn. Tắt gia
            hạn vẫn giữ quyền lợi đến cuối chu kỳ. Hạ gói trong demo có hiệu lực
            ngay nhưng không xóa VOD cá nhân đã hoàn thành.
          </p>
          <h2>Gửi video và coaching</h2>
          <p>
            Chỉ gửi video bạn có quyền chia sẻ. Yêu cầu thiếu quyền Drive có thể
            được kiểm tra lại. Lượt được hoàn khi hủy trước khi coach tiếp nhận;
            sau đó cần quản trị viên xử lý. Đổi hoặc hủy lịch coaching trước ít
            nhất 24 giờ.
          </p>
          <h2>Academy</h2>
          <p>
            Thách Đấu yêu cầu gửi hồ sơ và được quản trị viên xét duyệt. Nút ứng
            tuyển không tạo giao dịch thanh toán.
          </p>
          <h2>Quyền sử dụng nội dung</h2>
          <p>
            Không chia sẻ VOD cá nhân của người khác. Nội dung bài học mô phỏng
            không được trình bày như chiến thuật cập nhật hoặc tư vấn trong thời
            gian trận đấu đang diễn ra.
          </p>
        </>
      ) : (
        <>
          <h2>Dự án cộng đồng độc lập</h2>
          <p>
            SSC Academy được tạo theo chính sách “Legal Jibber Jabber” của Riot
            Games và sử dụng tài nguyên thuộc sở hữu của Riot Games. Riot Games
            không bảo trợ hoặc tài trợ dự án này.
          </p>
          <h2>Nguồn hình ảnh</h2>
          <p>
            Hình nhân vật từ Riot Data Dragon và hình sân đấu từ trang giới
            thiệu Into the Arcane chính thức. Tên SSC Academy, biểu tượng, bố
            cục và nội dung hướng dẫn do dự án tạo. Không dùng logo Riot Games
            làm nhận diện ứng dụng.
          </p>
          <ul>
            <li>
              <a
                href="https://www.riotgames.com/en/legal"
                target="_blank"
                rel="noreferrer"
              >
                Legal Jibber Jabber
              </a>
            </li>
            <li>
              <a
                href="https://developer.riotgames.com/docs/tft"
                target="_blank"
                rel="noreferrer"
              >
                Riot Developer Portal · TFT & Data Dragon
              </a>
            </li>
            <li>
              <a
                href="https://teamfighttactics.leagueoflegends.com/en-au/set-overview/teamfight-tactics-into-the-arcane/"
                target="_blank"
                rel="noreferrer"
              >
                Into the Arcane · Nguồn tài nguyên
              </a>
            </li>
          </ul>
          <h2>Giới hạn của PoC</h2>
          <p>
            Đây là bản thử nghiệm cục bộ miễn phí. Việc đưa sản phẩm ra công
            chúng hoặc thu tiền cần được đánh giá theo chính sách hiện hành và
            quy trình đăng ký/cho phép của Riot. Một dòng ghi nguồn không thay
            thế sự chấp thuận thương mại.
          </p>
          <h2>Nội dung minh họa</h2>
          <p>
            Video trình diễn thao tác do dự án tạo. Các hồ sơ coach, thành tích
            và nhận xét là giả lập, không hàm ý chứng thực của người chơi hoặc
            Riot Games.
          </p>
        </>
      )}
    </article>
  );
}
