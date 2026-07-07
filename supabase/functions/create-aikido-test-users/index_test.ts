import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFn, ANON_KEY } from "../_shared/test-helpers.ts";

Deno.test("create-aikido-test-users rejects request without Authorization", async () => {
  const { status, body } = await callFn("create-aikido-test-users", { method: "POST" });
  assert(status === 401 || status === 403, `unexpected status ${status}`);
  assert(body?.error);
});

Deno.test("create-aikido-test-users rejects anon session (not super_admin)", async () => {
  const { status, body } = await callFn("create-aikido-test-users", {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON_KEY}` },
  });
  assert(status >= 400, `unexpected status ${status}`);
  assert(body?.error);
});