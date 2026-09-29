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
@ApiTags("Coaching")
@Controller("api/v1")
class CoachingController extends BaseController {
  constructor(@Inject(AppService) s: AppService) {
    super(s);
  }
  @Get("vod-reviews/mine") async reviews(@Req() r: Request) {
    return this.s.reviewList(await this.member(r));
  }
  @Post("vod-reviews") async submit(@Req() r: Request, @Body() body: unknown) {
    const b = z
      .object({
        title: text,
        url: z.string().max(1000),
        rank: text,
        focus: text,
        notes: z.string().max(2000).default(""),
        coachId: z.string().optional(),
        access: z.enum(["accessible", "permission_required", "not_found"]),
        consent: z.literal(true),
      })
      .parse(body);
    return this.s.submitReview(await this.member(r), b, key(r));
  }
  @Post("vod-reviews/:id/:action") async reviewAction(
    @Req() r: Request,
    @Param("id") id: string,
    @Param("action") action: string,
    @Body() body: unknown,
  ) {
    const b = z
      .object({
        access: z.enum(["accessible", "permission_required"]).optional(),
      })
      .parse(body);
    return this.s.reviewAction(
      await this.member(r),
      id,
      action === "recheck-source" ? "recheck" : action,
      b,
      key(r),
    );
  }
  @Get("vod-reviews/:id/source") async source(
    @Req() r: Request,
    @Param("id") id: string,
  ) {
    return this.s.source(await this.member(r), id);
  }
  @Get("coach/vod-reviews/queue") async queue(@Req() r: Request) {
    return this.s.reviewList(
      this.s.role(await this.u(r), ["coach", "admin"]),
      true,
    );
  }
  @Post("coach/vod-reviews/:id/:action") async operate(
    @Req() r: Request,
    @Param("id") id: string,
    @Param("action") action: string,
    @Body() body: unknown,
  ) {
    const b = z
      .object({
        summary: z.string().max(5000).optional(),
        coachId: z.string().optional(),
        reason: z.string().max(1000).optional(),
      })
      .parse(body);
    return this.s.reviewAction(
      this.s.role(await this.u(r), ["coach", "admin"]),
      id,
      action,
      b,
      key(r),
    );
  }
  @Get("coaching/sessions/mine") async bookings(@Req() r: Request) {
    const u = await this.member(r);
    return this.s.db.booking.findMany({
      where: { userId: u.id },
      include: {
        coach: { include: { user: { select: { displayName: true } } } },
      },
      orderBy: { start: "asc" },
    });
  }
  @Post("coaching/sessions") async book(
    @Req() r: Request,
    @Body() body: unknown,
  ) {
    const b = z
      .object({
        coachId: text,
        start: z.string().datetime(),
        goal: z.string().trim().min(10).max(2000),
      })
      .parse(body);
    return this.s.book(await this.member(r), b, key(r));
  }
  @Post("coaching/sessions/:id/:action") async bookingAction(
    @Req() r: Request,
    @Param("id") id: string,
    @Param("action") action: string,
    @Body() body: unknown,
  ) {
    const b = z
      .object({
        start: z.string().datetime().optional(),
        summary: z.string().max(5000).optional(),
      })
      .parse(body);
    return this.s.bookingAction(await this.member(r), id, action, b, key(r));
  }
  @Get("coach/coaching/sessions") async coachSessions(@Req() r: Request) {
    const u = this.s.role(await this.u(r), ["coach", "admin"]);
    return this.s.db.booking.findMany({
      where: u.role === "admin" ? {} : { coach: { userId: u.id } },
      include: {
        user: { select: { displayName: true } },
        coach: { include: { user: { select: { displayName: true } } } },
      },
    });
  }
}
@Module({ imports: [CoreModule], controllers: [CoachingController] })
export class CoachingModule {}
