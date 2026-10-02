import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SscController, SystemModule } from "../../apps/api/src/modules/system";

describe("SSC endpoint", () => {
  test("returns the requested payload", () => {
    expect(new SscController().ssc()).toEqual({
      status: "ok",
      data: "ssc qua dang cap",
    });
  });
});

describe("system HTTP routes", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(SystemModule, {
      logger: false,
      abortOnError: false,
    });
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
  });

  test("GET /ssc returns HTTP 200 and the exact JSON without authentication", async () => {
    const response = await fetch(`${baseUrl}/ssc`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({
      status: "ok",
      data: "ssc qua dang cap",
    });
  });

  test("POST /ssc is not registered", async () => {
    const response = await fetch(`${baseUrl}/ssc`, { method: "POST" });

    expect(response.status).toBe(404);
  });

  test("GET /api/v1/health retains its existing response", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
