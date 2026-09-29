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
@ApiTags("Auth")
@Controller("api/v1")
class AuthController extends BaseController {
  constructor(@Inject(AppService) s: AppService) {
    super(s);
  }
  @Get("auth/session") async session(@Req() r: Request) {
    return this.s.session(await this.u(r));
  }
  @Post("auth/login") async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const b = auth.parse(body),
      result = await this.s.login(b.email, b.password);
    this.cookie(res, result.token);
    return result.user;
  }
  @Post("auth/register") async register(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const b = auth
        .extend({ displayName: text, consent: z.literal(true) })
        .parse(body),
      result = await this.s.register(b.email, b.password, b.displayName);
    this.cookie(res, result.token);
    return result.user;
  }
  @Post("auth/logout") async logout(
    @Req() r: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (r.cookies.ssc_session)
      await this.s.db.authSession.deleteMany({
        where: { tokenHash: hash(r.cookies.ssc_session) },
      });
    res.clearCookie("ssc_session", { path: "/" });
    return { ok: true };
  }
  @Post("demo/login") async demo(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (process.env.DEMO_MODE !== "true")
      fail("Chế độ trải nghiệm đã tắt.", 404);
    const b = z
      .object({
        account: z.enum([
          "diamond",
          "master",
          "grandmaster",
          "challenger",
          "coach-1",
          "coach-2",
          "admin",
        ]),
      })
      .parse(body);
    const id = b.account.startsWith("coach") ? b.account : `demo-${b.account}`;
    const u = await this.s.db.user.findUniqueOrThrow({ where: { id } });
    const result = await this.s.newSession(u);
    this.cookie(res, result.token);
    return result.user;
  }
  @Post("auth/password/forgot") async forgot(@Body() body: unknown) {
    const { email } = z.object({ email: z.string().email() }).parse(body);
    const u = await this.s.db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    let demoToken;
    if (u) {
      const token = randomBytes(24).toString("hex");
      await this.s.db.authToken.create({
        data: {
          userId: u.id,
          kind: "reset",
          tokenHash: hash(token),
          expiresAt: new Date(Date.now() + 1800000),
        },
      });
      if (process.env.DEMO_MODE === "true") demoToken = token;
    }
    return {
      message: "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.",
      demoToken,
    };
  }
  @Post("auth/password/reset") async reset(@Body() body: unknown) {
    const b = z
      .object({ token: z.string(), password: z.string().min(8).max(100) })
      .parse(body);
    return this.s.db.$transaction(async (tx) => {
      const token = await tx.authToken.findUnique({
        where: { tokenHash: hash(b.token) },
      });
      if (!token || token.kind !== "reset" || token.expiresAt < new Date())
        fail("Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      await tx.authToken.delete({ where: { id: token!.id } });
      await tx.user.update({
        where: { id: token!.userId },
        data: { passwordHash: hashSync(b.password, 12) },
      });
      await tx.authSession.deleteMany({ where: { userId: token!.userId } });
      return { ok: true };
    });
  }
  @Post("auth/email/verify") async verify(@Req() r: Request) {
    if (process.env.DEMO_MODE !== "true")
      fail("Cần cấu hình nhà cung cấp email.", 503);
    const u = await this.member(r);
    await this.s.db.user.update({
      where: { id: u.id },
      data: { verified: true },
    });
    return { ok: true };
  }
}
@Module({ imports: [CoreModule], controllers: [AuthController] })
export class AuthModule {}
