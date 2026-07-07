import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFn } from "../_shared/test-helpers.ts";

Deno.test("auth-email-hook rejects unsigned webhook", async () => {
  const { status, body, text } = await callFn("auth-email-hook", {
    method: "POST",
    body: JSON.stringify({ user: { email: "x@y.z" }, email_data: { token: "t", token_hash: "h", email_action_type: "signup" } }),
  });
  // No x-lovable-signature / x-lovable-timestamp headers → webhook verification must fail
  assert(status >= 400, `unexpected status ${status}: ${text}`);
  assert(body?.error || text.length > 0);
});

Deno.test("auth-email-hook rejects invalid signature", async () => {
  const { status, text } = await callFn("auth-email-hook", {
    method: "POST",
    headers: {
      "x-lovable-signature": "invalid",
      "x-lovable-timestamp": String(Date.now()),
    },
    body: JSON.stringify({ user: { email: "x@y.z" }, email_data: { token: "t", token_hash: "h", email_action_type: "signup" } }),
  });
  assert(status >= 400, `unexpected status ${status}: ${text}`);
});