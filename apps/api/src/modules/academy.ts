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
@ApiTags("Academy")
@Controller("api/v1")
class AcademyController extends BaseController {
  constructor(@Inject(AppService) s: AppService) {
    super(s);
  }
  @Post("academy/apply") async apply(@Req() r: Request, @Body() body: unknown) {
    const u = await this.member(r),
      b = z.object({ goal: z.string().trim().min(20).max(2000) }).parse(body);
    if (await this.s.db.enrollment.findUnique({ where: { userId: u.id } }))
      fail("Bạn đã có hồ sơ ứng tuyển.", 409);
    return this.s.db.enrollment.create({
      data: { userId: u.id, goal: b.goal },
    });
  }
  @Post("academy/tasks/:id") async task(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const u = await this.member(r),
      b = z.object({ completed: z.boolean() }).parse(body),
      m = await this.s.membership(u.id);
    if (!m.entitlements.includes(ACADEMY))
      fail("Gói hiện tại không có quyền Academy.", 403);
    const result = await this.s.db.academyTask.updateMany({
      where: { id, enrollment: { userId: u.id, status: "active" } },
      data: b,
    });
    if (!result.count) fail("Không có quyền sửa bài tập.", 403);
    return { ok: true };
  }
}
@Module({ imports: [CoreModule], controllers: [AcademyController] })
export class AcademyModule {}
