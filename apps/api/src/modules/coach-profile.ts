import {
  Body,
  Controller,
  Get,
  Inject,
  Module,
  Patch,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { z } from "zod";
import { AppService, fail } from "../service";
import {
  deleteManagedCoachImage,
  MAX_COACH_IMAGE_SIZE,
  storeCoachImage,
  UploadFile,
  validateCoachImage,
} from "../media";
import { BaseController, CoreModule, key, text } from "./core";

const profilePatch = z
  .object({
    displayName: text.optional(),
    headline: text.optional(),
    bio: z.string().trim().min(20).max(3000).optional(),
    specialty: text.optional(),
    achievement: text.optional(),
  })
  .strict();

@ApiTags("Coach")
@Controller("api/v1")
class CoachProfileController extends BaseController {
  constructor(@Inject(AppService) s: AppService) {
    super(s);
  }

  @Get("coach/profile")
  async profile(@Req() request: Request) {
    const user = this.s.role(await this.u(request), ["coach"]);
    const coach = await this.s.db.coach.findUnique({
      where: { userId: user.id },
      include: {
        user: { select: { displayName: true } },
        achievements: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] },
      },
    });
    if (!coach) fail("Không tìm thấy hồ sơ coach.", 404, "COACH_NOT_FOUND");
    return coach;
  }

  @Patch("coach/profile")
  @UseInterceptors(
    FileInterceptor("image", { limits: { fileSize: MAX_COACH_IMAGE_SIZE } }),
  )
  async editProfile(
    @Req() request: Request,
    @Body() body: unknown,
    @UploadedFile() file?: UploadFile,
  ) {
    const user = this.s.role(await this.u(request), ["coach"]);
    const patch = profilePatch.parse(body);
    if (!file && Object.keys(patch).length === 0)
      fail("Vui lòng cung cấp ít nhất một thay đổi.");
    if (file) validateCoachImage(file);
    let newImage: string | undefined, oldImage: string | undefined, result;
    try {
      result = await this.s.transaction(
        user.id,
        key(request),
        "edit-own-coach-profile",
        async (tx) => {
          const activeUser = await tx.user.findUnique({
            where: { id: user.id },
            select: { role: true, status: true },
          });
          if (
            !activeUser ||
            activeUser.role !== "coach" ||
            activeUser.status !== "active"
          )
            fail("Phiên coach không còn hợp lệ.", 403, "FORBIDDEN_ROLE");
          const existing = await tx.coach.findUnique({
            where: { userId: user.id },
          });
          if (!existing)
            fail("Không tìm thấy hồ sơ coach.", 404, "COACH_NOT_FOUND");
          oldImage = existing!.image;
          if (file) newImage = await storeCoachImage(file);
          const coach = await this.s.updateCoachProfile(tx, existing!.id, {
            ...patch,
            ...(newImage ? { image: newImage } : {}),
          });
          await tx.audit.create({
            data: {
              actorId: user.id,
              action: "edit-own-coach-profile",
              targetId: existing!.id,
              reason: "Coach cập nhật hồ sơ công khai",
            },
          });
          return coach;
        },
      );
    } catch (error) {
      if (newImage) await deleteManagedCoachImage(newImage);
      throw error;
    }
    if (newImage) {
      try {
        await deleteManagedCoachImage(oldImage);
      } catch {
        console.warn("Không thể dọn ảnh coach cũ sau khi cập nhật.");
      }
    }
    return result;
  }
}

@Module({ imports: [CoreModule], controllers: [CoachProfileController] })
export class CoachProfileModule {}
