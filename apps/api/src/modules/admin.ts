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
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { hashSync } from "bcryptjs";
import { z } from "zod";
import { AppService, fail } from "../service";
import { hash, ACADEMY } from "../domain";
import { CoreModule, BaseController, auth, text, key } from "./core";
@ApiTags("Admin")
@Controller("api/v1")
class AdminController extends BaseController {
  constructor(@Inject(AppService) s: AppService) {
    super(s);
  }
  @Get("admin/catalog") async catalog(@Req() r: Request) {
    this.s.role(await this.u(r), ["admin"]);
    return {
      videos: await this.s.db.video.findMany({
        where: { visibility: { not: "private" } },
        orderBy: { publishedAt: "desc" },
      }),
      coaches: await this.s.db.coach.findMany({
        include: {
          user: { select: { displayName: true } },
          achievements: true,
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
      if (!(await tx.coach.findUnique({ where: { id: b.coachId } })))
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
      const c = await tx.coach.update({
        where: { id },
        data: {
          headline: b.headline,
          bio: b.bio,
          specialty: b.specialty,
          user: { update: { displayName: b.displayName } },
        },
      });
      const a = await tx.achievement.findFirst({ where: { coachId: id } });
      if (a)
        await tx.achievement.update({
          where: { id: a.id },
          data: { title: b.achievement },
        });
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
        select: { id: true, displayName: true, email: true, role: true },
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
