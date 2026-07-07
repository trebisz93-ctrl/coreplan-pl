import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callFn, ANON_KEY } from "../_shared/test-helpers.ts";

Deno.test("delete-user-completely rejects request without Authorization", async () => {
  const { status, body } = await callFn("delete-user-completely", {
    method: "POST",
    body: JSON.stringify({ email: "nobody@example.com" }),
  });
  assertEquals(status, 400);
  assert(String(body?.error ?? "").toLowerCase().includes("autoryzacj"));
});

Deno.test("delete-user-completely rejects invalid bearer token", async () => {
  const { status, body } = await callFn("delete-user-completely", {
    method: "POST",
    headers: { Authorization: "Bearer not-a-real-token" },
    body: JSON.stringify({ email: "nobody@example.com" }),
  });
  assertEquals(status, 400);
  assert(body?.error);
});

Deno.test("delete-user-completely rejects non-super_admin (anon session)", async () => {
  // Anon key IS a JWT, but role='anon' — not super_admin.
  const { status, body } = await callFn("delete-user-completely", {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ email: "nobody@example.com" }),
  });
  assertEquals(status, 400);
  // Either "Nieprawidłowy token" (anon rejected as non-user) or "super_admin".
  assert(body?.error);
});