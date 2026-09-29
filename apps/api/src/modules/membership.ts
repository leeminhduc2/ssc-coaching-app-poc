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
@ApiTags("Membership")
@Controller("api/v1")
class MembershipController extends BaseController {
  constructor(@Inject(AppService) s: AppService) {
    super(s);
  }
  @Get("users/me/stats") async stats(@Req() r: Request) {
    const u = await this.member(r);
    const completed = await this.s.db.progress.count({
      where: { userId: u.id, completed: true },
    });
    return { completed };
  }
  @Get("membership/plans") plans() {
    return this.s.plans();
  }
  @Post("payments/checkout-session") async checkout(
    @Req() r: Request,
    @Body() body: unknown,
  ) {
    if (process.env.DEMO_MODE !== "true")
      fail("Chưa cấu hình thanh toán thật.", 503);
    const b = z
      .object({
        planId: text,
        outcome: z.enum(["succeeded", "failed", "cancelled"]),
        coupon: z.string().max(20).optional(),
        consent: z.literal(true),
      })
      .parse(body);
    return this.s.checkout(await this.member(r), b, key(r));
  }
  @Post("payments/webhooks/mock") async webhook(
    @Req() r: Request,
    @Body() body: unknown,
  ) {
    const raw = (r as Request & { rawBody: Buffer }).rawBody;
    if (
      !raw ||
      !this.s.verifySignature(raw, r.header("X-Payment-Signature") || "")
    )
      fail("Chữ ký webhook không hợp lệ.", 403);
    const b = z
      .object({
        eventId: text,
        userId: text,
        planId: text,
        outcome: z.enum(["succeeded", "failed", "cancelled"]),
      })
      .parse(body);
    const u = await this.s.db.user.findUnique({ where: { id: b.userId } });
    if (!u) fail("Không tìm thấy tài khoản.", 404);
    return this.s.checkout(u!, b, b.eventId);
  }
  @Get("users/me/payments") async payments(@Req() r: Request) {
    const u = await this.member(r);
    return this.s.db.payment.findMany({
      where: { subscription: { userId: u.id } },
      include: {
        subscription: { include: { price: { include: { plan: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  @Patch("users/me") async profile(@Req() r: Request, @Body() body: unknown) {
    const u = await this.member(r),
      b = z
        .object({
          displayName: text,
          riotId: z.string().max(100),
          rank: text,
          timezone: z.enum(["Asia/Ho_Chi_Minh", "Asia/Bangkok", "UTC"]),
        })
        .parse(body);
    return this.s.safe(
      await this.s.db.user.update({ where: { id: u.id }, data: b }),
    );
  }
  @Post("membership/cancel") async cancel(@Req() r: Request) {
    const u = await this.member(r);
    await this.s.db.subscription.updateMany({
      where: { userId: u.id, status: "active" },
      data: { cancelAtEnd: true },
    });
    return { ok: true };
  }
  @Post("membership/change-plan") async change(
    @Req() r: Request,
    @Body() body: unknown,
  ) {
    const u = await this.member(r),
      b = z.object({ planId: text }).parse(body);
    return this.s.transaction(u.id, key(r), "downgrade", async (tx) => {
      const m = await this.s.membership(u.id, tx),
        p = (await this.s.plans(tx)).find((x) => x.id === b.planId);
      if (!m.subscription || !p || p.order >= m.subscription.plan.order)
        fail("Chỉ dùng thao tác này để hạ gói. Nâng gói qua trang hội viên.");
      return this.s.activate(tx, u, b.planId);
    });
  }
  @Get("notifications") async notifications(@Req() r: Request) {
    const u = await this.member(r);
    return this.s.db.notification.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
  }
  @Post("notifications/read") async read(@Req() r: Request) {
    const u = await this.member(r);
    return this.s.db.notification.updateMany({
      where: { userId: u.id },
      data: { read: true },
    });
  }
}
@Module({ imports: [CoreModule], controllers: [MembershipController] })
export class MembershipModule {}
