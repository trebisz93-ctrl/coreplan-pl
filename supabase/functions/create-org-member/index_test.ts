import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFn, ANON_KEY } from "../_shared/test-helpers.ts";

Deno.test("create-org-member rejects request without Authorization", async () => {
  const { status, body } = await callFn("create-org-member", {
    method: "POST",
    body: JSON.stringify({ email: "x@y.z", organization_id: "00000000-0000-0000-0000-000000000000" }),
  });
  assert(status >= 400, `unexpected status ${status}`);
  assert(body?.error);
});

Deno.test("create-org-member rejects anon session (no membership)", async () => {
  const { status, body } = await callFn("create-org-member", {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ email: "x@y.z", organization_id: "00000000-0000-0000-0000-000000000000" }),
  });
  assert(status >= 400, `unexpected status ${status}`);
  assert(body?.error);
});