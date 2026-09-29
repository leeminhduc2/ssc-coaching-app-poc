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
@ApiTags("System")
@Controller("api/v1")
class SystemController extends BaseController {
  constructor(@Inject(AppService) s: AppService) {
    super(s);
  }
  @Get("health") health() {
    return { status: "ok" };
  }
  @Get("ready") async ready() {
    await this.s.db.$queryRaw`SELECT 1`;
    return { status: "ok", database: "postgresql" };
  }
}
@Module({ imports: [CoreModule], controllers: [SystemController] })
export class SystemModule {}
