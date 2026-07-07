import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFn, ANON_KEY } from "../_shared/test-helpers.ts";

Deno.test("resend-user-invite rejects request without Authorization", async () => {
  const { status, body } = await callFn("resend-user-invite", {
    method: "POST",
    body: JSON.stringify({ user_id: "00000000-0000-0000-0000-000000000000" }),
  });
  assert(status >= 400, `unexpected status ${status}`);
  assert(body?.error);
});

Deno.test("resend-user-invite rejects anon session (not super_admin)", async () => {
  const { status, body } = await callFn("resend-user-invite", {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ user_id: "00000000-0000-0000-0000-000000000000" }),
  });
  assert(status >= 400, `unexpected status ${status}`);
  assert(body?.error);
});