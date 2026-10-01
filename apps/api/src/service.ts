import { Injectable, HttpException } from "@nestjs/common";
import { PrismaClient, Prisma, User } from "@prisma/client";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { hashSync, compareSync } from "bcryptjs";
import {
  ACADEMY,
  COACHING,
  LIBRARY,
  VOD,
  hash,
  inherit,
  parseDrive,
  encrypt,
  decrypt,
  remaining,
} from "./domain";
export const fail = (
  message: string,
  status = 400,
  code = "VALIDATION_ERROR",
): never => {
  throw new HttpException({ message, code }, status);
};
export type Tx = Prisma.TransactionClient;
export type CoachProfilePatch = {
  displayName?: string;
  headline?: string;
  bio?: string;
  specialty?: string;
  achievement?: string;
  image?: string;
};
@Injectable()
export class AppService {
  db = new PrismaClient();
  async user(token?: string) {
    if (!token) return null;
    const s = await this.db.authSession.findUnique({
      where: { tokenHash: hash(token) },
      include: { user: true },
    });
    return s && s.expiresAt > new Date() && s.user.status === "active"
      ? s.user
      : null;
  }
  safe(u: User) {
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      riotId: u.riotId,
      rank: u.rank,
      timezone: u.timezone,
      verified: u.verified,
      status: u.status,
      disabledAt: u.disabledAt,
    };
  }
  async login(email: string, password: string) {
    const u = await this.db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!u || u.status !== "active" || !compareSync(password, u.passwordHash))
      fail("Email hoặc mật khẩu chưa đúng.", 401, "INVALID_CREDENTIALS");
    return this.newSession(u!);
  }
  async newSession(u: User) {
    if (u.status !== "active")
      fail("Email hoặc mật khẩu chưa đúng.", 401, "INVALID_CREDENTIALS");
    const token = randomBytes(32).toString("hex");
    await this.db.authSession.create({
      data: {
        userId: u.id,
        tokenHash: hash(token),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    return { token, user: this.safe(u) };
  }
  async register(email: string, password: string, displayName: string) {
    if (
      await this.db.user.findUnique({ where: { email: email.toLowerCase() } })
    )
      fail("Email đã được sử dụng.", 409);
    const u = await this.db.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: hashSync(password, 12),
        displayName,
      },
    });
    return this.newSession(u);
  }
  async updateCoachProfile(tx: Tx, coachId: string, patch: CoachProfilePatch) {
    const coach = await tx.coach.findUnique({ where: { id: coachId } });
    if (!coach) fail("Không tìm thấy coach.", 404, "COACH_NOT_FOUND");
    await tx.coach.update({
      where: { id: coachId },
      data: {
        ...(patch.headline !== undefined ? { headline: patch.headline } : {}),
        ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
        ...(patch.specialty !== undefined
          ? { specialty: patch.specialty }
          : {}),
        ...(patch.image !== undefined ? { image: patch.image } : {}),
        ...(patch.displayName !== undefined
          ? { user: { update: { displayName: patch.displayName } } }
          : {}),
      },
    });
    if (patch.achievement !== undefined) {
      const featured = await tx.achievement.findFirst({
        where: { coachId },
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      });
      if (featured)
        await tx.achievement.update({
          where: { id: featured.id },
          data: { title: patch.achievement },
        });
      else
        await tx.achievement.create({
          data: {
            coachId,
            title: patch.achievement,
            description: "Thành tích nổi bật do coach cập nhật.",
            displayOrder: 0,
          },
        });
    }
    return tx.coach.findUniqueOrThrow({
      where: { id: coachId },
      include: {
        user: { select: { displayName: true } },
        achievements: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] },
      },
    });
  }
  async plans(tx: Tx = this.db) {
    const plans = await tx.plan.findMany({
      include: { prices: { where: { active: true } }, entitlements: true },
      orderBy: { order: "asc" },
    });
    return plans.map((p) => ({ ...p, effective: inherit(p.id, plans) }));
  }
  async membership(userId: string, tx: Tx = this.db) {
    const subscription = await tx.subscription.findFirst({
      where: { userId, status: "active", end: { gt: new Date() } },
      include: {
        price: { include: { plan: true } },
        allocations: { include: { usages: true } },
      },
      orderBy: { start: "desc" },
    });
    const plans = await this.plans(tx),
      entitlements = subscription
        ? plans.find((p) => p.id === subscription.price.planId)?.effective || []
        : [];
    // A plan change keeps the same billing cycle. Count its complete ledger,
    // including reservations on replaced subscriptions, so upgrades cannot mint
    // credits and releasing an earlier reservation restores the current balance.
    const cycleUsages = subscription
      ? await tx.usage.findMany({
          where: {
            allocation: {
              subscription: { userId },
              start: subscription.start,
              end: subscription.end,
            },
          },
          include: { allocation: { select: { code: true } } },
        })
      : [];
    const benefits =
      subscription?.allocations
        .filter((a) => a.start <= new Date() && a.end > new Date())
        .map((a) => ({
          code: a.code,
          remaining: Math.max(
            0,
            remaining(
              a.quantity,
              cycleUsages.filter((u) => u.allocation.code === a.code),
            ),
          ),
          quantity: a.quantity,
          end: a.end,
        })) || [];
    return {
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            start: subscription.start,
            end: subscription.end,
            cancelAtEnd: subscription.cancelAtEnd,
            plan: subscription.price.plan,
            amount: subscription.price.amount,
          }
        : null,
      entitlements,
      benefits,
    };
  }
  async session(u: User | null) {
    if (!u)
      return {
        user: null,
        entitlements: [],
        benefits: [],
        subscription: null,
        demo: process.env.DEMO_MODE === "true",
      };
    return {
      user: this.safe(u),
      ...(await this.membership(u.id)),
      enrollment: await this.db.enrollment.findUnique({
        where: { userId: u.id },
        include: { tasks: true },
      }),
      hasPersonal:
        (await this.db.accessGrant.count({ where: { userId: u.id } })) > 0,
      demo: process.env.DEMO_MODE === "true",
    };
  }
  require(u: User | null): User {
    if (!u)
      fail("Vui lòng đăng nhập để tiếp tục.", 401, "AUTHENTICATION_REQUIRED");
    return u!;
  }
  role(u: User | null, roles: string[]) {
    const user = this.require(u);
    if (!roles.includes(user.role))
      fail("Bạn không có quyền thực hiện thao tác này.", 403, "FORBIDDEN_ROLE");
    return user;
  }
  async transaction<T>(
    userId: string,
    key: string | undefined,
    action: string,
    fn: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    if (!key || key.length > 100)
      fail("Thiếu mã chống gửi lặp. Vui lòng thử lại.");
    return this.db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
        const scoped = `${userId}:${action}:${key}`;
        const existing = await tx.idempotency.findUnique({
          where: { key: scoped },
        });
        if (existing) return existing.response as T;
        const value = await fn(tx);
        await tx.idempotency.create({
          data: { key: scoped, response: JSON.parse(JSON.stringify(value)) },
        });
        return value;
      },
      { timeout: 15000 },
    );
  }
  async reserve(tx: Tx, u: User, code: string) {
    const m = await this.membership(u.id, tx);
    if (!m.entitlements.includes(code))
      fail("Gói hiện tại chưa có quyền lợi này.", 403, "MISSING_ENTITLEMENT");
    const allocation = await tx.allocation.findFirst({
      where: {
        subscriptionId: m.subscription!.id,
        code,
        start: { lte: new Date() },
        end: { gt: new Date() },
      },
      include: { usages: true },
    });
    if (
      !allocation ||
      (m.benefits.find((b) => b.code === code)?.remaining || 0) < 1
    )
      fail(
        "Bạn đã sử dụng hết lượt trong chu kỳ này.",
        409,
        "BENEFIT_EXHAUSTED",
      );
    return tx.usage.create({ data: { allocationId: allocation!.id } });
  }
  async videos(u: User | null, q: Record<string, string>) {
    const mine = q.tab === "mine";
    if (mine && !u) fail("Vui lòng đăng nhập.", 401);
    const where: Prisma.VideoWhereInput = {
      AND: [
        {
          OR: [
            { visibility: { not: "private" } },
            ...(u ? [{ grants: { some: { userId: u.id } } }] : []),
          ],
        },
        ...(q.search
          ? [{ title: { contains: q.search, mode: "insensitive" as const } }]
          : []),
        ...(q.topic ? [{ topic: q.topic }] : []),
        ...(q.patch ? [{ patch: q.patch }] : []),
        ...(q.coach ? [{ coachId: q.coach }] : []),
        ...(q.level ? [{ level: q.level }] : []),
        ...(q.type ? [{ type: q.type }] : []),
        ...(mine
          ? [{ visibility: "private", grants: { some: { userId: u!.id } } }]
          : []),
        ...(q.tab === "saved"
          ? [{ favorites: { some: { userId: u?.id || "none" } } }]
          : []),
        ...(q.tab === "watching"
          ? [
              {
                progress: {
                  some: {
                    userId: u?.id || "none",
                    completed: false,
                    position: { gt: 0 },
                  },
                },
              },
            ]
          : []),
        ...(q.tab === "public_review" ? [{ type: "public_review" }] : []),
      ],
    };
    const limit = Math.min(50, Math.max(1, Number(q.limit) || 12)),
      page = Math.max(1, Number(q.page) || 1);
    const [items, total, m] = await Promise.all([
      this.db.video.findMany({
        where,
        include: {
          coach: { include: { user: { select: { displayName: true } } } },
          progress: { where: { userId: u?.id || "none" } },
          favorites: { where: { userId: u?.id || "none" } },
        },
        orderBy:
          q.sort === "popular"
            ? { favorites: { _count: "desc" } }
            : { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.video.count({ where }),
      u
        ? this.membership(u.id)
        : Promise.resolve({ entitlements: [] as string[] }),
    ]);
    return {
      items: items.map((v) => ({
        ...v,
        locked:
          v.visibility === "membership" && !m.entitlements.includes(LIBRARY),
        saved: !!v.favorites.length,
        position: v.progress[0]?.position || 0,
        completed: v.progress[0]?.completed || false,
        progress: undefined,
        favorites: undefined,
      })),
      total,
      page,
      limit,
    };
  }
  async access(u: User | null, id: string, tx: Tx = this.db) {
    const v = await tx.video.findUnique({
      where: { id },
      include: {
        coach: { include: { user: { select: { displayName: true } } } },
        result: true,
        grants: true,
      },
    });
    if (!v) fail("Không tìm thấy video.", 404);
    if (
      v!.visibility === "private" &&
      !v!.grants.some((g) => g.userId === u?.id) &&
      u?.role !== "admin" &&
      !(u?.role === "coach" && v!.coach.userId === u.id)
    )
      fail(
        "Video này thuộc quyền riêng tư của học viên khác.",
        403,
        "RESOURCE_NOT_OWNED",
      );
    if (
      v!.visibility === "membership" &&
      (!u || !(await this.membership(u.id, tx)).entitlements.includes(LIBRARY))
    )
      fail("Mở gói Kim Cương để xem bài học này.", 403, "MISSING_ENTITLEMENT");
    return { ...v!, grants: undefined };
  }
  async submitReview(
    u: User,
    b: {
      title: string;
      url: string;
      rank: string;
      focus: string;
      notes: string;
      coachId?: string;
      access: string;
    },
    key?: string,
  ) {
    let fileId: string;
    try {
      fileId = parseDrive(b.url);
    } catch (e) {
      return fail((e as Error).message);
    }
    return this.transaction(u.id, key, "review", async (tx) => {
      if (
        b.coachId &&
        !(await tx.coach.findFirst({
          where: {
            id: b.coachId,
            user: { role: "coach", status: "active" },
          },
        }))
      )
        fail("Coach không hợp lệ.");
      const usage = await this.reserve(tx, u, VOD);
      const access = b.access;
      const status =
        access === "accessible"
          ? "queued"
          : access === "permission_required"
            ? "needs_permission"
            : "rejected";
      const review = await tx.review.create({
        data: {
          userId: u.id,
          coachId: b.coachId || null,
          usageId: usage.id,
          title: b.title,
          rank: b.rank,
          focus: b.focus,
          notes: b.notes,
          status,
          source: { create: { encryptedUrl: encrypt(b.url), fileId, access } },
        },
      });
      if (status === "rejected")
        await tx.usage.update({
          where: { id: usage.id },
          data: { status: "released" },
        });
      return review;
    });
  }
  async reviewList(u: User, queue = false) {
    const where: Prisma.ReviewWhereInput = queue
      ? u.role === "admin"
        ? {}
        : {
            OR: [
              { coach: { userId: u.id } },
              { status: "queued", coachId: null },
            ],
          }
      : { userId: u.id };
    const items = await this.db.review.findMany({
      where,
      include: {
        coach: { include: { user: { select: { displayName: true } } } },
        result: true,
        usage: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return items;
  }
  async reviewAction(
    u: User,
    id: string,
    action: string,
    b: { access?: string; summary?: string; coachId?: string; reason?: string },
    key?: string,
  ) {
    return this.transaction(u.id, key, `review-${id}-${action}`, async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const r = await tx.review.findUnique({
        where: { id },
        include: { coach: true, usage: true },
      });
      if (!r) fail("Không tìm thấy yêu cầu.", 404);
      const own = r!.userId === u.id,
        operator =
          u.role === "admin" ||
          (u.role === "coach" && r!.coach?.userId === u.id);
      let status = r!.status;
      if (action === "recheck") {
        if (!own || status !== "needs_permission")
          fail("Không thể kiểm tra lại yêu cầu này.", 403);
        const access =
          b.access === "accessible" ? "accessible" : "permission_required";
        await tx.vodSource.update({
          where: { reviewId: id },
          data: { access },
        });
        status = access === "accessible" ? "queued" : "needs_permission";
      } else if (action === "cancel") {
        if (!own && u.role !== "admin") fail("Bạn không có quyền hủy.", 403);
        if (
          !["queued", "needs_permission", "assigned"].includes(status) ||
          r!.usage.status === "consumed"
        )
          fail("Coach đã tiếp nhận; không thể tự hủy yêu cầu.", 409);
        status = "cancelled";
        await tx.usage.update({
          where: { id: r!.usageId },
          data: { status: "released" },
        });
      } else if (action === "assign") {
        this.role(u, ["coach", "admin"]);
        if (!["queued", "assigned"].includes(status))
          fail("Yêu cầu chưa sẵn sàng phân công.", 409);
        const coachId =
          u.role === "coach"
            ? (await tx.coach.findUnique({ where: { userId: u.id } }))?.id
            : b.coachId;
        if (
          !coachId ||
          !(await tx.coach.findFirst({
            where: {
              id: coachId,
              user: { role: "coach", status: "active" },
            },
          }))
        )
          fail("Vui lòng chọn coach.");
        if (u.role === "coach" && r!.coachId && r!.coach?.userId !== u.id)
          fail("Yêu cầu đã được phân công cho coach khác.", 403);
        await tx.review.update({ where: { id }, data: { coachId } });
        status = "assigned";
        await tx.usage.update({
          where: { id: r!.usageId },
          data: { status: "consumed" },
        });
      } else if (action === "start") {
        if (!operator) fail("Bạn không được phân công yêu cầu này.", 403);
        if (!["assigned", "queued"].includes(status))
          fail("Không thể bắt đầu ở trạng thái này.", 409);
        status = "in_review";
        await tx.usage.update({
          where: { id: r!.usageId },
          data: { status: "consumed" },
        });
      } else if (action === "complete") {
        if (!operator) fail("Bạn không được phân công yêu cầu này.", 403);
        if (
          status !== "in_review" ||
          !r!.coachId ||
          !b.summary ||
          b.summary.length < 20
        )
          fail("Cần bắt đầu review và nhập tổng kết ít nhất 20 ký tự.", 409);
        const video = await tx.video.create({
          data: {
            title: `Review: ${r!.title}`,
            description: b.summary!,
            coachId: r!.coachId!,
            image: "/assets/video-3.jpg",
            duration: 1200,
            patch: "14.23",
            topic: r!.focus,
            level: "Cá nhân",
            visibility: "private",
            type: "personal_review",
            grants: { create: { userId: r!.userId } },
          },
        });
        await tx.reviewResult.create({
          data: { reviewId: id, videoId: video.id, summary: b.summary! },
        });
        await tx.notification.create({
          data: {
            userId: r!.userId,
            message: `Coach đã hoàn thành review “${r!.title}”. Xem trong VOD của tôi.`,
          },
        });
        status = "completed";
      } else if (action === "release") {
        this.role(u, ["admin"]);
        if (!b.reason || b.reason.length < 10)
          fail("Cần lý do hoàn lượt ít nhất 10 ký tự.");
        if (status === "completed")
          fail("Không hoàn lượt cho kết quả đã hoàn thành.", 409);
        await tx.usage.update({
          where: { id: r!.usageId },
          data: { status: "released" },
        });
        status = "rejected";
      } else fail("Thao tác không hợp lệ.");
      await tx.audit.create({
        data: {
          actorId: u.id,
          action,
          targetId: id,
          reason: b.reason || action,
        },
      });
      return tx.review.update({ where: { id }, data: { status } });
    });
  }
  async source(u: User, id: string) {
    const r = await this.db.review.findUnique({
      where: { id },
      include: { coach: true, source: true },
    });
    if (
      !r ||
      !(r.userId === u.id || u.role === "admin" || r.coach?.userId === u.id)
    )
      fail("Không có quyền xem nguồn VOD.", 403);
    return { url: decrypt(r!.source!.encryptedUrl) };
  }
  availability() {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + 1 + Math.floor(i / 2));
      d.setUTCHours(i % 2 ? 13 : 11, 0, 0, 0);
      return d.toISOString();
    });
  }
  async book(
    u: User,
    b: { coachId: string; start: string; goal: string },
    key?: string,
  ) {
    return this.transaction(u.id, key, "booking", async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${b.coachId}))`;
      if (!this.availability().includes(b.start))
        fail("Khung giờ không còn mở. Vui lòng chọn lại.");
      if (
        await tx.booking.findFirst({
          where: {
            coachId: b.coachId,
            start: new Date(b.start),
            status: "scheduled",
          },
        })
      )
        fail("Khung giờ vừa được đặt. Vui lòng chọn giờ khác.", 409);
      if (
        !(await tx.coach.findFirst({
          where: {
            id: b.coachId,
            user: { role: "coach", status: "active" },
          },
        }))
      )
        fail("Không tìm thấy coach.");
      const usage = await this.reserve(tx, u, COACHING);
      return tx.booking.create({
        data: {
          userId: u.id,
          coachId: b.coachId,
          usageId: usage.id,
          start: new Date(b.start),
          goal: b.goal,
        },
      });
    });
  }
  async bookingAction(
    u: User,
    id: string,
    action: string,
    b: { start?: string; summary?: string },
    key?: string,
  ) {
    return this.transaction(
      u.id,
      key,
      `booking-${id}-${action}`,
      async (tx) => {
        const s = await tx.booking.findUnique({
          where: { id },
          include: { coach: true },
        });
        if (!s) fail("Không tìm thấy buổi học.", 404);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${s!.coachId}))`;
        if (s!.status !== "scheduled")
          fail("Buổi học không còn ở trạng thái đã đặt.", 409);
        if (action === "complete") {
          if (u.role !== "admin" && s!.coach.userId !== u.id)
            fail("Không có quyền tổng kết buổi học.", 403);
          if (!b.summary || b.summary.length < 20)
            fail("Tổng kết cần ít nhất 20 ký tự.");
          await tx.usage.update({
            where: { id: s!.usageId },
            data: { status: "consumed" },
          });
          return tx.booking.update({
            where: { id },
            data: { status: "completed", summary: b.summary },
          });
        }
        if (s!.userId !== u.id)
          fail("Buổi học không thuộc tài khoản của bạn.", 403);
        if (s!.start.getTime() - Date.now() < 24 * 3600000)
          fail("Chỉ đổi hoặc hủy lịch trước ít nhất 24 giờ.", 409);
        if (action === "cancel") {
          await tx.usage.update({
            where: { id: s!.usageId },
            data: { status: "released" },
          });
          return tx.booking.update({
            where: { id },
            data: { status: "cancelled" },
          });
        }
        if (
          action === "reschedule" &&
          b.start &&
          this.availability().includes(b.start)
        ) {
          if (
            await tx.booking.findFirst({
              where: {
                coachId: s!.coachId,
                start: new Date(b.start),
                status: "scheduled",
                id: { not: id },
              },
            })
          )
            fail("Khung giờ đã được đặt.", 409);
          return tx.booking.update({
            where: { id },
            data: { start: new Date(b.start) },
          });
        }
        return fail("Vui lòng chọn khung giờ hợp lệ.");
      },
    );
  }
  async activate(tx: Tx, u: User, planId: string) {
    const plan = (await this.plans(tx)).find(
      (p) => p.id === planId && p.active,
    );
    if (!plan || !plan.prices[0]) fail("Gói chưa mở đăng ký.");
    const current = await this.membership(u.id, tx);
    const start = current.subscription?.start || new Date(),
      end = current.subscription?.end || new Date(Date.now() + 30 * 86400000);
    await tx.subscription.updateMany({
      where: { userId: u.id, status: "active" },
      data: { status: "replaced" },
    });
    const sub = await tx.subscription.create({
      data: { userId: u.id, priceId: plan!.prices[0].id, start, end },
    });
    for (const code of plan!.effective.filter((c) =>
      [VOD, COACHING].includes(c),
    )) {
      await tx.allocation.create({
        data: {
          subscriptionId: sub.id,
          code,
          quantity: 1,
          start,
          end,
        },
      });
    }
    return sub;
  }
  async checkout(
    u: User,
    b: { planId: string; outcome: string; coupon?: string },
    key?: string,
  ) {
    return this.transaction(u.id, key, "checkout", async (tx) => {
      const plan = (await this.plans(tx)).find(
        (p) => p.id === b.planId && p.active,
      );
      if (!plan || plan.inviteOnly)
        fail("Gói này cần được xét duyệt qua Academy.");
      if (b.coupon && b.coupon !== "SSC10")
        fail("Mã ưu đãi không hợp lệ. Dùng SSC10 để thử.");
      const amount = Math.round(plan!.prices[0].amount * (b.coupon ? 0.9 : 1));
      let sub;
      if (b.outcome === "succeeded") sub = await this.activate(tx, u, b.planId);
      else
        sub = await tx.subscription.create({
          data: {
            userId: u.id,
            priceId: plan!.prices[0].id,
            status: b.outcome,
            start: new Date(),
            end: new Date(),
          },
        });
      const eventId = `mock-${u.id}-${key}`;
      await tx.webhookEvent.create({ data: { id: eventId } });
      const payment = await tx.payment.create({
        data: { subscriptionId: sub.id, eventId, amount, status: b.outcome },
      });
      return { id: payment.id, status: payment.status };
    });
  }
  verifySignature(raw: Buffer, signature: string) {
    const expected = createHmac("sha256", process.env.PAYMENT_WEBHOOK_SECRET!)
      .update(raw)
      .digest("hex");
    return (
      /^[a-f0-9]{64}$/.test(signature) &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    );
  }
}
