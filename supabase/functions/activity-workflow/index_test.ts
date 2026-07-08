import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFn, ANON_KEY } from "../_shared/test-helpers.ts";

Deno.test("activity-workflow handles CORS preflight", async () => {
  const { status, text } = await callFn("activity-workflow", { method: "OPTIONS" });
  await Promise.resolve(text);
  assertEquals(status, 200);
});

Deno.test("activity-workflow rejects request without Authorization", async () => {
  const { status, body } = await callFn("activity-workflow", {
    method: "POST",
    body: JSON.stringify({ action: "check" }),
  });
  assert(status === 401, `expected 401, got ${status}`);
  assert(body?.error);
});

Deno.test("activity-workflow rejects wrong workflow secret", async () => {
  const { status, body } = await callFn("activity-workflow", {
    method: "POST",
    headers: { "x-workflow-secret": "bogus-secret-value" },
    body: JSON.stringify({ action: "check" }),
  });
  assert(status === 401, `expected 401, got ${status}`);
  assert(body?.error);
});

Deno.test("activity-workflow rejects anon-only session (not admin)", async () => {
  const { status, body } = await callFn("activity-workflow", {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ action: "check" }),
  });
  assert(status >= 400, `expected error status, got ${status}`);
  assert(body?.error);
});