import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFn, ANON_KEY } from "../_shared/test-helpers.ts";

Deno.test("backup-to-hostinger rejects request without any auth", async () => {
  const { status, body } = await callFn("backup-to-hostinger", { method: "POST" });
  assertEquals(status, 401);
  assert(body?.error);
});

Deno.test("backup-to-hostinger rejects invalid X-Cron-Secret with no user auth", async () => {
  const { status, body } = await callFn("backup-to-hostinger", {
    method: "POST",
    headers: { "X-Cron-Secret": "not-real" },
  });
  assertEquals(status, 401);
  assert(body?.error);
});

Deno.test("backup-to-hostinger rejects anon session (not super_admin)", async () => {
  const { status, body } = await callFn("backup-to-hostinger", {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON_KEY}` },
  });
  assert(status === 401 || status === 403, `unexpected status ${status}`);
  assert(body?.error);
});