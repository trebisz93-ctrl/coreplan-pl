import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFn } from "../_shared/test-helpers.ts";

Deno.test("scheduled-backup rejects request without X-Cron-Secret", async () => {
  const { status, body } = await callFn("scheduled-backup", { method: "POST" });
  assertEquals(status, 401);
  assert(body?.error);
});

Deno.test("scheduled-backup rejects invalid X-Cron-Secret", async () => {
  const { status, body } = await callFn("scheduled-backup", {
    method: "POST",
    headers: { "X-Cron-Secret": "not-the-real-secret" },
  });
  assertEquals(status, 401);
  assert(body?.error);
});