import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFn, ANON_KEY } from "../_shared/test-helpers.ts";

Deno.test("process-email-queue rejects request without Authorization", async () => {
  // Function has verify_jwt=true, so the gateway may respond with 401 before
  // the function runs (body can be plain text). We only assert the auth block.
  const { status, text } = await callFn("process-email-queue", {
    method: "POST",
    body: JSON.stringify({}),
  });
  await Promise.resolve(text);
  assert([400, 401, 403].includes(status), `expected 4xx auth error, got ${status}`);
});

Deno.test("process-email-queue rejects anon token (not service_role)", async () => {
  const { status, body } = await callFn("process-email-queue", {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({}),
  });
  // Either 403 (anon claim), 401 (rejected upstream), or 400 — never a crash.
  assert([400, 401, 403].includes(status), `unexpected status ${status}`);
  assert(body?.error);
});

Deno.test("process-email-queue rejects malformed bearer token", async () => {
  const { status, text } = await callFn("process-email-queue", {
    method: "POST",
    headers: { Authorization: "Bearer not-a-jwt" },
    body: JSON.stringify({}),
  });
  await Promise.resolve(text);
  assert([400, 401, 403].includes(status), `unexpected status ${status}`);
});