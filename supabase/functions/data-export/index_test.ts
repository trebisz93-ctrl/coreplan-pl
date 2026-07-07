import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFn, ANON_KEY } from "../_shared/test-helpers.ts";

Deno.test("data-export rejects request without Authorization", async () => {
  const { status, body } = await callFn("data-export", { method: "GET" });
  assertEquals(status, 401);
  assert(body?.error);
});

Deno.test("data-export rejects anon session (no admin role)", async () => {
  const { status, body } = await callFn("data-export", {
    method: "GET",
    headers: { Authorization: `Bearer ${ANON_KEY}` },
  });
  assert(status === 401 || status === 403, `unexpected status ${status}`);
  assert(body?.error);
});