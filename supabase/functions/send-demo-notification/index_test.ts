import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFn } from "../_shared/test-helpers.ts";

Deno.test("send-demo-notification handles CORS preflight", async () => {
  const { status, text } = await callFn("send-demo-notification", { method: "OPTIONS" });
  await Promise.resolve(text);
  assertEquals(status, 200);
});

Deno.test("send-demo-notification rejects missing name/email", async () => {
  const { status, body } = await callFn("send-demo-notification", {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert(status >= 400, `unexpected status ${status}`);
  assert(body?.error);
});

Deno.test("send-demo-notification rejects missing email only", async () => {
  const { status, body } = await callFn("send-demo-notification", {
    method: "POST",
    body: JSON.stringify({ name: "Test" }),
  });
  assert(status >= 400, `unexpected status ${status}`);
  assert(body?.error);
});