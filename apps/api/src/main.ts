import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(__dirname, "../../../.env") });
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
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import {
  SwaggerModule,
  DocumentBuilder,
  ApiTags,
  ApiOperation,
} from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Request, Response } from "express";
import { randomUUID, randomBytes } from "node:crypto";
import { hashSync } from "bcryptjs";
import { z, ZodError } from "zod";
import { AppService, fail } from "./service";
import { hash, ACADEMY } from "./domain";
import { describeBodies } from "./openapi";
const auth = z.object({
    email: z.string().email().max(200),
    password: z.string().min(8).max(100),
  }),
  text = z.string().trim().min(2).max(200),
  key = (r: Request) => r.header("Idempotency-Key");
@Catch()
class Errors implements ExceptionFilter {
  catch(e: unknown, h: ArgumentsHost) {
    const res = h.switchToHttp().getResponse<Response>(),
      req = h.switchToHttp().getRequest<Request>();
    let status = 500,
      message = "Có lỗi hệ thống. Vui lòng thử lại.",
      code = "INTERNAL_ERROR";
    if (e instanceof ZodError) {
      status = 400;
      const fields: Record<string, string> = {
        email: "Email",
        password: "Mật khẩu",
        displayName: "Tên hiển thị",
        title: "Tiêu đề",
        url: "Liên kết",
        goal: "Mục tiêu",
        summary: "Tổng kết",
        consent: "Xác nhận điều khoản",
        rank: "Hạng",
        focus: "Chủ đề",
        amount: "Giá",
        reason: "Lý do",
        role: "Vai trò",
        status: "Trạng thái",
        slug: "Slug coach",
        headline: "Tiêu đề hồ sơ",
        bio: "Giới thiệu coach",
        specialty: "Chuyên môn",
        achievement: "Thành tích",
        image: "Ảnh coach",
      };
      message = e.issues
        .map(
          (x) =>
            `${fields[String(x.path[0])] || "Thông tin"}: ${x.code === "too_small" ? `cần ít nhất ${x.minimum} ${x.type === "string" ? "ký tự" : "đơn vị"}` : x.code === "too_big" ? `không được vượt quá ${x.maximum}` : "chưa hợp lệ, vui lòng kiểm tra lại"}.`,
        )
        .join(" ");
      code = "VALIDATION_ERROR";
    } else if (e instanceof HttpException) {
      status = e.getStatus();
      const body = e.getResponse();
      message =
        typeof body === "string" ? body : (body as { message: string }).message;
      code =
        (typeof body === "object" && (body as { code?: string }).code) ||
        (status === 403 ? "FORBIDDEN" : "REQUEST_FAILED");
    }
    res
      .status(status)
      .json({ message, code, requestId: res.getHeader("X-Request-Id") });
    if (status === 500)
      console.error(
        JSON.stringify({
          level: "error",
          path: req.path,
          requestId: res.getHeader("X-Request-Id"),
          type: e instanceof Error ? e.name : "unknown",
        }),
      );
  }
}
import { SystemModule } from "./modules/system";
import { AuthModule } from "./modules/auth";
import { MembershipModule } from "./modules/membership";
import { CatalogModule } from "./modules/catalog";
import { CoachingModule } from "./modules/coaching";
import { AcademyModule } from "./modules/academy";
import { AdminModule } from "./modules/admin";
import { CoachProfileModule } from "./modules/coach-profile";
import { ensureUploadRoot, uploadRoot } from "./media";
@Module({
  imports: [
    SystemModule,
    AuthModule,
    MembershipModule,
    CatalogModule,
    CoachingModule,
    AcademyModule,
    AdminModule,
    CoachProfileModule,
  ],
})
class AppModule {}

async function main() {
  if (
    !process.env.DATABASE_URL ||
    !/^[a-fA-F0-9]{64}$/.test(process.env.FIELD_ENCRYPTION_KEY || "") ||
    !process.env.PAYMENT_WEBHOOK_SECRET
  )
    throw new Error("Thiếu cấu hình. Xem .env.example.");
  await ensureUploadRoot();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: ["error", "warn", "log"],
  });
  app.use(helmet());
  app.useStaticAssets(uploadRoot(), {
    prefix: "/api/uploads/",
    setHeaders: (response) =>
      response.setHeader(
        "Cache-Control",
        "public, max-age=31536000, immutable",
      ),
  });
  app.use(cookieParser());
  app.useGlobalFilters(new Errors());
  const origins = [
    process.env.APP_BASE_URL || "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
  app.enableCors({ origin: origins, credentials: true });
  const limits = new Map<string, { count: number; at: number }>();
  app.use((req: Request, res: Response, next: () => void) => {
    res.setHeader("X-Request-Id", randomUUID());
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      !req.path.includes("/webhooks/")
    ) {
      if (
        req.header("X-SSC-Request") !== "1" ||
        (req.headers.origin && !origins.includes(req.headers.origin))
      )
        return res.status(403).json({
          code: "CSRF_REJECTED",
          message: "Yêu cầu không hợp lệ. Vui lòng tải lại trang.",
        });
    }
    if (req.path.includes("/auth/") || req.path.includes("/demo/login")) {
      const id = req.ip || "local",
        old = limits.get(id),
        now = Date.now();
      const entry = old && now - old.at < 60000 ? old : { count: 0, at: now };
      entry.count++;
      limits.set(id, entry);
      if (entry.count > 100)
        return res.status(429).json({
          code: "RATE_LIMIT",
          message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút.",
        });
      if (limits.size > 10000) limits.clear();
    }
    next();
  });
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("SSC Academy API")
      .setDescription(
        "API PoC tiếng Việt; session cookie, quyền lợi và dữ liệu cá nhân được kiểm tra phía máy chủ.",
      )
      .setVersion("1.0")
      .addCookieAuth("ssc_session")
      .build(),
  );
  SwaggerModule.setup("api/docs", app, describeBodies(doc));
  await app.listen(Number(process.env.PORT) || 3001, "127.0.0.1");
  console.log("SSC API: http://localhost:3001/api/docs");
}
main();
