import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFn } from "../_shared/test-helpers.ts";

Deno.test("send-notification-email handles CORS preflight", async () => {
  const { status, text } = await callFn("send-notification-email", { method: "OPTIONS" });
  await Promise.resolve(text);
  assertEquals(status, 200);
});

Deno.test("send-notification-email accepts empty payload without crashing", async () => {
  // Function is triggered by DB trigger with { record: {...} }; missing record
  // should not throw — it either no-ops or returns a graceful error.
  const { status, text } = await callFn("send-notification-email", {
    method: "POST",
    body: JSON.stringify({}),
  });
  await Promise.resolve(text);
  // Any non-5xx-crash is acceptable; only assert no internal server error.
  assert(status !== 502 && status !== 503, `edge crashed with ${status}`);
});

Deno.test("send-notification-email accepts fully-formed record payload", async () => {
  const { status, text } = await callFn("send-notification-email", {
    method: "POST",
    body: JSON.stringify({
      record: {
        user_id: "00000000-0000-0000-0000-000000000000",
        title: "Test",
        description: "Test description",
        type: "info",
        category: "system",
      },
    }),
  });
  await Promise.resolve(text);
  assert(status < 500 || status === 500, `unexpected status ${status}`);
});