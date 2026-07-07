import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFn, ANON_KEY } from "../_shared/test-helpers.ts";

Deno.test("data-import rejects request without Authorization", async () => {
  const { status, body } = await callFn("data-import", {
    method: "POST",
    body: JSON.stringify({}),
  });
  assertEquals(status, 401);
  assert(body?.error);
});

Deno.test("data-import rejects anon session (no admin role)", async () => {
  const { status, body } = await callFn("data-import", {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({}),
  });
  assert(status === 401 || status === 403, `unexpected status ${status}`);
  assert(body?.error);
});