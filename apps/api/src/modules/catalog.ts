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
@ApiTags("Catalog")
@Controller("api/v1")
class CatalogController extends BaseController {
  constructor(@Inject(AppService) s: AppService) {
    super(s);
  }
  @Get("coaches") coaches() {
    return this.s.db.coach.findMany({
      where: { user: { role: "coach", status: "active" } },
      include: {
        user: { select: { displayName: true } },
        achievements: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] },
      },
    });
  }
  @Get("coaches/:id") async coach(@Param("id") id: string) {
    const c = await this.s.db.coach.findUnique({
      where: { id, user: { role: "coach", status: "active" } },
      include: {
        user: { select: { displayName: true } },
        achievements: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] },
      },
    });
    if (!c) fail("Không tìm thấy coach.", 404);
    return c;
  }
  @Get("coaches/:id/availability") async availability(@Param("id") id: string) {
    if (
      !(await this.s.db.coach.findFirst({
        where: { id, user: { role: "coach", status: "active" } },
        select: { id: true },
      }))
    )
      fail("Không tìm thấy coach.", 404);
    const booked = await this.s.db.booking.findMany({
      where: { coachId: id, status: "scheduled" },
      select: { start: true },
    });
    return this.s.availability().map((start) => ({
      start,
      available: !booked.some((b) => b.start.toISOString() === start),
    }));
  }
  @Get("videos") videos(@Req() r: Request, @Query() q: Record<string, string>) {
    return this.u(r).then((u) => this.s.videos(u, q));
  }
  @Get("videos/:id") async video(@Req() r: Request, @Param("id") id: string) {
    const u = await this.u(r),
      v = await this.s.access(u, id);
    const p = u
      ? await this.s.db.progress.findUnique({
          where: { userId_videoId: { userId: u.id, videoId: id } },
        })
      : null;
    const f = u
      ? await this.s.db.favorite.findUnique({
          where: { userId_videoId: { userId: u.id, videoId: id } },
        })
      : null;
    return {
      ...v,
      position: p?.position || 0,
      completed: p?.completed || false,
      saved: !!f,
    };
  }
  @Post("videos/:id/playback-descriptor") async playback(
    @Req() r: Request,
    @Param("id") id: string,
  ) {
    await this.s.access(await this.u(r), id);
    return {
      mode: "demo",
      duration: 60,
      url: "/assets/demo-lesson.webm",
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      notice:
        "Video minh họa thao tác học tập; bài giảng thật chưa được tích hợp.",
    };
  }
  @Put("videos/:id/progress") async progress(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const u = await this.member(r),
      v = await this.s.access(u, id);
    const b = z
      .object({
        position: z.number().int().min(0),
        completed: z.boolean().optional(),
      })
      .parse(body);
    return this.s.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${u.id + id}))`;
      const old = await tx.progress.findUnique({
        where: { userId_videoId: { userId: u.id, videoId: id } },
      });
      const completed =
        !!old?.completed || !!b.completed || b.position >= v.duration * 0.9;
      const data = {
        position: completed ? v.duration : Math.min(v.duration, b.position),
        completed,
      };
      return tx.progress.upsert({
        where: { userId_videoId: { userId: u.id, videoId: id } },
        create: { userId: u.id, videoId: id, ...data },
        update: data,
      });
    });
  }
  @Post("videos/:id/favorite") async favorite(
    @Req() r: Request,
    @Param("id") id: string,
  ) {
    const u = await this.member(r);
    await this.s.access(u, id);
    return this.s.db.favorite.upsert({
      where: { userId_videoId: { userId: u.id, videoId: id } },
      create: { userId: u.id, videoId: id },
      update: {},
    });
  }
  @Delete("videos/:id/favorite") async unfavorite(
    @Req() r: Request,
    @Param("id") id: string,
  ) {
    const u = await this.member(r);
    return this.s.db.favorite.deleteMany({
      where: { userId: u.id, videoId: id },
    });
  }
}
@Module({ imports: [CoreModule], controllers: [CatalogController] })
export class CatalogModule {}
