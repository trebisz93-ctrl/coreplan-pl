import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFn } from "../_shared/test-helpers.ts";

Deno.test("purge-trash rejects request without X-Cron-Secret", async () => {
  const { status, body } = await callFn("purge-trash", { method: "POST" });
  assertEquals(status, 401);
  assert(body?.error);
});

Deno.test("purge-trash rejects invalid X-Cron-Secret", async () => {
  const { status, body } = await callFn("purge-trash", {
    method: "POST",
    headers: { "X-Cron-Secret": "definitely-not-the-secret" },
  });
  assertEquals(status, 401);
  assert(body?.error);
});