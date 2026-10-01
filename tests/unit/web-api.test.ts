import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../../apps/web/src/api";

afterEach(() => vi.unstubAllGlobals());

function mockFetch() {
  const fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("web API request bodies", () => {
  test("serializes JSON and sets its content type", async () => {
    const fetch = mockFetch();
    await api("/example", "POST", { value: 42 });
    const [, options] = fetch.mock.calls[0];
    expect(options.body).toBe(JSON.stringify({ value: 42 }));
    expect(new Headers(options.headers).get("Content-Type")).toBe(
      "application/json",
    );
    expect(new Headers(options.headers).get("Idempotency-Key")).toBeTruthy();
  });

  test("passes FormData through without forcing a multipart boundary", async () => {
    const fetch = mockFetch(),
      form = new FormData();
    form.set("displayName", "Coach Test");
    await api("/coach/profile", "PATCH", form);
    const [, options] = fetch.mock.calls[0];
    expect(options.body).toBe(form);
    expect(new Headers(options.headers).has("Content-Type")).toBe(false);
    expect(new Headers(options.headers).get("X-SSC-Request")).toBe("1");
  });
});
