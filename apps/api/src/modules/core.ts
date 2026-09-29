import { Module, Inject } from "@nestjs/common";
import { Request, Response } from "express";
import { z } from "zod";
import { AppService } from "../service";
export const auth = z.object({
    email: z.string().email().max(200),
    password: z.string().min(8).max(100),
  }),
  text = z.string().trim().min(2).max(200),
  key = (r: Request) => r.header("Idempotency-Key");
export class BaseController {
  constructor(@Inject(AppService) protected s: AppService) {}
  async u(r: Request) {
    return this.s.user(r.cookies?.ssc_session);
  }
  async member(r: Request) {
    return this.s.require(await this.u(r));
  }
  cookie(res: Response, token: string) {
    res.cookie("ssc_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 86400000,
      path: "/",
    });
  }
}
@Module({ providers: [AppService], exports: [AppService] })
export class CoreModule {}
