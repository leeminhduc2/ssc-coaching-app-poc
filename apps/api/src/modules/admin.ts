import {
  Module,
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Req,
  Res,
  Body,
  Param,
  Query,
  Inject,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { randomBytes, randomUUID } from "node:crypto";
import { hashSync } from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { AppService, fail, Tx } from "../service";
import { hash, ACADEMY } from "../domain";
import { CoreModule, BaseController, auth, text, key } from "./core";
import {
  deleteManagedCoachImage,
  MAX_COACH_IMAGE_SIZE,
  storeCoachImage,
  UploadFile,
  validateCoachImage,
} from "../media";

const role = z.enum(["member", "coach", "admin"]),
  userStatus = z.enum(["active", "disabled"]),
  timezone = z.enum(["Asia/Ho_Chi_Minh", "Asia/Bangkok", "UTC"]),
  slug = z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  coachFields = {
    slug: slug.optional(),
    headline: text.optional(),
    bio: z.string().trim().min(20).max(3000).optional(),
    specialty: text.optional(),
    achievement: text.optional(),
  },
  createUser = z
    .object({
      email: z.string().trim().email().max(200),
      password: z.string().min(8).max(100),
      displayName: text,
      role,
      riotId: z.string().trim().max(100).default(""),
      rank: text.default("Kim Cương"),
      timezone: timezone.default("Asia/Ho_Chi_Minh"),
      status: userStatus.default("active"),
      ...coachFields,
    })
    .strict(),
  patchUser = z
    .object({
      email: z.string().trim().email().max(200).optional(),
      displayName: text.optional(),
      role: role.optional(),
      riotId: z.string().trim().max(100).optional(),
      rank: text.optional(),
      timezone: timezone.optional(),
      status: userStatus.optional(),
      ...coachFields,
    })
    .strict(),
  adminUserSelect = {
    id: true,
    email: true,
    displayName: true,
    role: true,
    riotId: true,
    rank: true,
    timezone: true,
    verified: true,
    status: true,
    disabledAt: true,
    createdAt: true,
    updatedAt: true,
    coach: {
      include: {
        achievements: {
          orderBy: [{ displayOrder: "asc" as const }, { id: "asc" as const }],
        },
      },
    },
  } satisfies Prisma.UserSelect;

function provision(
  body: z.infer<typeof createUser> | z.infer<typeof patchUser>,
) {
  if (
    !body.slug ||
    !body.headline ||
    !body.bio ||
    !body.specialty ||
    !body.achievement
  )
    fail(
      "Tài khoản coach cần slug, tiêu đề, giới thiệu, chuyên môn và thành tích.",
    );
  return {
    slug: body.slug!,
    headline: body.headline!,
    bio: body.bio!,
    specialty: body.specialty!,
    achievement: body.achievement!,
  };
}

function throwUserConflict(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    fail("Email hoặc slug đã được sử dụng.", 409, "DUPLICATE_USER_FIELD");
  throw error;
}
@ApiTags("Admin")
@Controller("api/v1")
class AdminController extends BaseController {
  constructor(@Inject(AppService) s: AppService) {
    super(s);
  }

  private async lockAndCheckActor(tx: Tx, actorId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('admin-user-guard'))`;
    const actor = await tx.user.findUnique({ where: { id: actorId } });
    if (!actor || actor.role !== "admin" || actor.status !== "active")
      fail("Phiên quản trị không còn hợp lệ.", 403, "FORBIDDEN_ROLE");
    return actor;
  }

  private async protectAdminChange(
    tx: Tx,
    actorId: string,
    target: { id: string; role: string; status: string },
    nextRole: string,
    nextStatus: string,
  ) {
    if (
      target.id === actorId &&
      (nextRole !== target.role || nextStatus !== "active")
    )
      fail(
        "Bạn không thể tự hạ quyền hoặc vô hiệu hóa tài khoản của mình.",
        409,
        "ADMIN_SELF_PROTECTED",
      );
    if (
      target.role === "admin" &&
      target.status === "active" &&
      (nextRole !== "admin" || nextStatus !== "active")
    ) {
      const remaining = await tx.user.count({
        where: {
          id: { not: target.id },
          role: "admin",
          status: "active",
        },
      });
      if (remaining < 1)
        fail(
          "Hệ thống phải luôn còn ít nhất một quản trị viên hoạt động.",
          409,
          "LAST_ADMIN_PROTECTED",
        );
    }
  }

  @Get("admin/users")
  async users(@Req() request: Request, @Query() rawQuery: unknown) {
    this.s.role(await this.u(request), ["admin"]);
    const query = z
      .object({
        search: z.string().trim().max(200).optional(),
        role: role.optional(),
        status: userStatus.optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(rawQuery);
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: "insensitive" } },
              {
                displayName: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.s.db.$transaction([
      this.s.db.user.findMany({
        where,
        select: adminUserSelect,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.s.db.user.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  @Get("admin/users/:id")
  async user(@Req() request: Request, @Param("id") id: string) {
    this.s.role(await this.u(request), ["admin"]);
    const user = await this.s.db.user.findUnique({
      where: { id },
      select: adminUserSelect,
    });
    if (!user) fail("Không tìm thấy tài khoản.", 404, "USER_NOT_FOUND");
    return user;
  }

  @Post("admin/users")
  @UseInterceptors(
    FileInterceptor("image", { limits: { fileSize: MAX_COACH_IMAGE_SIZE } }),
  )
  async createUser(
    @Req() request: Request,
    @Body() body: unknown,
    @UploadedFile() file?: UploadFile,
  ) {
    const actor = this.s.role(await this.u(request), ["admin"]);
    const input = createUser.parse(body);
    const coach = input.role === "coach" ? provision(input) : null;
    if (coach && !file) fail("Tài khoản coach cần có ảnh hồ sơ.");
    if (!coach && file) fail("Chỉ tài khoản coach mới nhận ảnh hồ sơ.");
    if (file) validateCoachImage(file);

    let newImage: string | undefined;
    try {
      return await this.s.transaction(
        actor.id,
        key(request),
        "create-user",
        async (tx) => {
          await this.lockAndCheckActor(tx, actor.id);
          if (file) newImage = await storeCoachImage(file);
          const created = await tx.user.create({
            data: {
              email: input.email.toLowerCase(),
              passwordHash: hashSync(input.password, 12),
              displayName: input.displayName,
              role: input.role,
              riotId: input.riotId,
              rank: input.rank,
              timezone: input.timezone,
              status: input.status,
              disabledAt: input.status === "disabled" ? new Date() : null,
              ...(coach
                ? {
                    coach: {
                      create: {
                        id: randomUUID(),
                        slug: coach.slug,
                        headline: coach.headline,
                        bio: coach.bio,
                        specialty: coach.specialty,
                        image: newImage!,
                        achievements: {
                          create: {
                            title: coach.achievement,
                            description:
                              "Thành tích nổi bật do quản trị viên khởi tạo.",
                            displayOrder: 0,
                          },
                        },
                      },
                    },
                  }
                : {}),
            },
          });
          await tx.audit.create({
            data: {
              actorId: actor.id,
              action: "create-user",
              targetId: created.id,
              reason: "Quản trị viên tạo tài khoản",
            },
          });
          return tx.user.findUniqueOrThrow({
            where: { id: created.id },
            select: adminUserSelect,
          });
        },
      );
    } catch (error) {
      if (newImage) await deleteManagedCoachImage(newImage);
      throwUserConflict(error);
    }
  }

  @Patch("admin/users/:id")
  @UseInterceptors(
    FileInterceptor("image", { limits: { fileSize: MAX_COACH_IMAGE_SIZE } }),
  )
  async editUser(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() body: unknown,
    @UploadedFile() file?: UploadFile,
  ) {
    const actor = this.s.role(await this.u(request), ["admin"]);
    const input = patchUser.parse(body);
    if (!file && Object.keys(input).length === 0)
      fail("Vui lòng cung cấp ít nhất một thay đổi.");
    if (file) validateCoachImage(file);

    let newImage: string | undefined, oldImage: string | undefined, result;
    try {
      result = await this.s.transaction(
        actor.id,
        key(request),
        `edit-user-${id}`,
        async (tx) => {
          await this.lockAndCheckActor(tx, actor.id);
          const target = await tx.user.findUnique({
            where: { id },
            include: { coach: true },
          });
          if (!target) fail("Không tìm thấy tài khoản.", 404, "USER_NOT_FOUND");
          const nextRole = input.role ?? target!.role,
            nextStatus = input.status ?? target!.status;
          await this.protectAdminChange(
            tx,
            actor.id,
            target!,
            nextRole,
            nextStatus,
          );

          const hasCoachFields =
            input.slug !== undefined ||
            input.headline !== undefined ||
            input.bio !== undefined ||
            input.specialty !== undefined ||
            input.achievement !== undefined;
          if (nextRole !== "coach" && (hasCoachFields || file))
            fail("Chỉ role coach mới có thể cập nhật hồ sơ coach.");
          if (target!.coach && input.slug && input.slug !== target!.coach.slug)
            fail("Không thể đổi slug của hồ sơ coach đã tồn tại.", 409);

          const newCoach = nextRole === "coach" && !target!.coach;
          const requiredProfile = newCoach ? provision(input) : null;
          if (newCoach && !file) fail("Tài khoản coach cần có ảnh hồ sơ.");
          if (file) {
            oldImage = target!.coach?.image;
            newImage = await storeCoachImage(file);
          }

          const roleOrStatusChanged =
            nextRole !== target!.role || nextStatus !== target!.status;
          await tx.user.update({
            where: { id },
            data: {
              ...(input.email !== undefined
                ? { email: input.email.toLowerCase() }
                : {}),
              ...(input.displayName !== undefined
                ? { displayName: input.displayName }
                : {}),
              ...(input.role !== undefined ? { role: input.role } : {}),
              ...(input.riotId !== undefined ? { riotId: input.riotId } : {}),
              ...(input.rank !== undefined ? { rank: input.rank } : {}),
              ...(input.timezone !== undefined
                ? { timezone: input.timezone }
                : {}),
              ...(input.status !== undefined
                ? {
                    status: input.status,
                    disabledAt: input.status === "disabled" ? new Date() : null,
                  }
                : {}),
            },
          });

          if (newCoach) {
            await tx.coach.create({
              data: {
                id: randomUUID(),
                userId: id,
                slug: requiredProfile!.slug,
                headline: requiredProfile!.headline,
                bio: requiredProfile!.bio,
                specialty: requiredProfile!.specialty,
                image: newImage!,
                achievements: {
                  create: {
                    title: requiredProfile!.achievement,
                    description:
                      "Thành tích nổi bật do quản trị viên khởi tạo.",
                    displayOrder: 0,
                  },
                },
              },
            });
          } else if (nextRole === "coach" && target!.coach) {
            await this.s.updateCoachProfile(tx, target!.coach.id, {
              ...(input.headline !== undefined
                ? { headline: input.headline }
                : {}),
              ...(input.bio !== undefined ? { bio: input.bio } : {}),
              ...(input.specialty !== undefined
                ? { specialty: input.specialty }
                : {}),
              ...(input.achievement !== undefined
                ? { achievement: input.achievement }
                : {}),
              ...(newImage ? { image: newImage } : {}),
            });
          }
          if (roleOrStatusChanged)
            await tx.authSession.deleteMany({ where: { userId: id } });
          await tx.audit.create({
            data: {
              actorId: actor.id,
              action: "edit-user",
              targetId: id,
              reason: "Quản trị viên cập nhật tài khoản",
            },
          });
          return tx.user.findUniqueOrThrow({
            where: { id },
            select: adminUserSelect,
          });
        },
      );
    } catch (error) {
      if (newImage) await deleteManagedCoachImage(newImage);
      throwUserConflict(error);
    }
    if (newImage && oldImage) {
      try {
        await deleteManagedCoachImage(oldImage);
      } catch {
        console.warn("Không thể dọn ảnh coach cũ sau khi cập nhật.");
      }
    }
    return result;
  }

  @Delete("admin/users/:id")
  async deleteUser(@Req() request: Request, @Param("id") id: string) {
    const actor = this.s.role(await this.u(request), ["admin"]);
    return this.s.transaction(
      actor.id,
      key(request),
      `disable-user-${id}`,
      async (tx) => {
        await this.lockAndCheckActor(tx, actor.id);
        const target = await tx.user.findUnique({ where: { id } });
        if (!target) fail("Không tìm thấy tài khoản.", 404, "USER_NOT_FOUND");
        await this.protectAdminChange(
          tx,
          actor.id,
          target!,
          target!.role,
          "disabled",
        );
        if (target!.status === "disabled") return { ok: true };
        await tx.user.update({
          where: { id },
          data: { status: "disabled", disabledAt: new Date() },
        });
        await tx.authSession.deleteMany({ where: { userId: id } });
        await tx.audit.create({
          data: {
            actorId: actor.id,
            action: "disable-user",
            targetId: id,
            reason: "Quản trị viên vô hiệu hóa tài khoản",
          },
        });
        return { ok: true };
      },
    );
  }

  @Post("admin/users/:id/reset-password")
  async resetUserPassword(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const actor = this.s.role(await this.u(request), ["admin"]);
    const { password } = z
      .object({ password: z.string().min(8).max(100) })
      .strict()
      .parse(body);
    return this.s.transaction(
      actor.id,
      key(request),
      `reset-user-password-${id}`,
      async (tx) => {
        await this.lockAndCheckActor(tx, actor.id);
        if (
          !(await tx.user.findUnique({ where: { id }, select: { id: true } }))
        )
          fail("Không tìm thấy tài khoản.", 404, "USER_NOT_FOUND");
        await tx.user.update({
          where: { id },
          data: { passwordHash: hashSync(password, 12) },
        });
        await tx.authSession.deleteMany({ where: { userId: id } });
        await tx.audit.create({
          data: {
            actorId: actor.id,
            action: "reset-user-password",
            targetId: id,
            reason: "Quản trị viên đặt lại mật khẩu",
          },
        });
        return { ok: true };
      },
    );
  }

  @Get("admin/catalog") async catalog(@Req() r: Request) {
    this.s.role(await this.u(r), ["admin"]);
    return {
      videos: await this.s.db.video.findMany({
        where: { visibility: { not: "private" } },
        orderBy: { publishedAt: "desc" },
      }),
      coaches: await this.s.db.coach.findMany({
        where: { user: { role: "coach", status: "active" } },
        include: {
          user: { select: { displayName: true } },
          achievements: {
            orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
          },
        },
      }),
    };
  }
  @Post("admin/videos") async createVideo(
    @Req() r: Request,
    @Body() body: unknown,
  ) {
    const u = this.s.role(await this.u(r), ["admin"]);
    const b = z
      .object({
        title: text,
        description: z.string().min(10).max(3000),
        coachId: text,
        patch: text,
        topic: text,
        level: z.enum(["Cơ bản", "Nâng cao"]),
        duration: z.number().int().min(60).max(14400),
        visibility: z.enum(["public", "membership"]),
        image: z.enum([
          "/assets/video-1.jpg",
          "/assets/video-2.jpg",
          "/assets/video-3.jpg",
          "/assets/video-4.jpg",
          "/assets/video-5.jpg",
          "/assets/video-6.jpg",
        ]),
      })
      .parse(body);
    return this.s.transaction(u.id, key(r), "create-video", async (tx) => {
      if (
        !(await tx.coach.findFirst({
          where: {
            id: b.coachId,
            user: { role: "coach", status: "active" },
          },
        }))
      )
        fail("Không tìm thấy coach.");
      const v = await tx.video.create({ data: b });
      await tx.audit.create({
        data: {
          actorId: u.id,
          action: "create-video",
          targetId: v.id,
          reason: "Tạo nội dung bài học mẫu",
        },
      });
      return v;
    });
  }
  @Patch("admin/videos/:id") async editVideo(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const u = this.s.role(await this.u(r), ["admin"]);
    const b = z
      .object({
        title: text,
        description: z.string().min(10).max(3000),
        topic: text,
        patch: text,
        visibility: z.enum(["public", "membership"]),
      })
      .parse(body);
    return this.s.transaction(u.id, key(r), `edit-video-${id}`, async (tx) => {
      const old = await tx.video.findUnique({ where: { id } });
      if (!old || old.visibility === "private")
        fail("Không sửa quyền riêng tư của kết quả review tại đây.", 403);
      const v = await tx.video.update({ where: { id }, data: b });
      await tx.audit.create({
        data: {
          actorId: u.id,
          action: "edit-video",
          targetId: id,
          reason: "Cập nhật nội dung thư viện",
        },
      });
      return v;
    });
  }
  @Patch("admin/coaches/:id") async editCoach(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const u = this.s.role(await this.u(r), ["admin"]);
    const b = z
      .object({
        displayName: text,
        headline: text,
        bio: z.string().min(20).max(3000),
        specialty: text,
        achievement: text,
      })
      .parse(body);
    return this.s.transaction(u.id, key(r), `edit-coach-${id}`, async (tx) => {
      const c = await this.s.updateCoachProfile(tx, id, b);
      await tx.audit.create({
        data: {
          actorId: u.id,
          action: "edit-coach",
          targetId: id,
          reason: "Cập nhật hồ sơ và thành tích mẫu",
        },
      });
      return c;
    });
  }
  @Get("admin/overview") async admin(@Req() r: Request) {
    this.s.role(await this.u(r), ["admin"]);
    const [users, payments, enrollments, audits] = await Promise.all([
      this.s.db.user.findMany({
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
          status: true,
        },
      }),
      this.s.db.payment.findMany({ take: 30, orderBy: { createdAt: "desc" } }),
      this.s.db.enrollment.findMany({
        include: { user: { select: { displayName: true } } },
      }),
      this.s.db.audit.findMany({ take: 30, orderBy: { createdAt: "desc" } }),
    ]);
    return { users, payments, enrollments, audits };
  }
  @Post("admin/enrollments/:id/approve") async approve(
    @Req() r: Request,
    @Param("id") id: string,
  ) {
    const admin = this.s.role(await this.u(r), ["admin"]);
    return this.s.transaction(admin.id, key(r), `approve-${id}`, async (tx) => {
      const e = await tx.enrollment.findUnique({
        where: { id },
        include: { user: true },
      });
      if (!e || e.status !== "pending")
        fail("Hồ sơ không ở trạng thái chờ duyệt.", 409);
      await this.s.activate(tx, e!.user, "challenger");
      await tx.audit.create({
        data: {
          actorId: admin.id,
          action: "approve",
          targetId: id,
          reason: "Duyệt ghi danh Academy",
        },
      });
      return tx.enrollment.update({
        where: { id },
        data: {
          status: "active",
          tasks: {
            create: [
              "Xem bài học về kinh tế",
              "Phân tích 3 trận gần nhất",
              "Check-in với coach",
            ].map((title) => ({ title })),
          },
        },
      });
    });
  }
  @Patch("admin/plans/:id") async planEdit(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const u = this.s.role(await this.u(r), ["admin"]),
      b = z
        .object({
          name: text,
          description: text,
          amount: z.number().int().min(0).max(100000000),
          active: z.boolean(),
        })
        .parse(body);
    return this.s.db.$transaction(async (tx) => {
      const p = await tx.plan.update({
        where: { id },
        data: { name: b.name, description: b.description, active: b.active },
      });
      await tx.price.updateMany({
        where: { planId: id },
        data: { active: false },
      });
      await tx.price.create({ data: { planId: id, amount: b.amount } });
      await tx.audit.create({
        data: {
          actorId: u.id,
          action: "edit-plan",
          targetId: id,
          reason: "Cập nhật mô tả, giá và trạng thái mở bán",
        },
      });
      return p;
    });
  }
}
@Module({ imports: [CoreModule], controllers: [AdminController] })
export class AdminModule {}
