import "https://deno.land/std@0.224.0/dotenv/load.ts";

export const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
export const ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;

export function fnUrl(name: string): string {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

export async function callFn(
  name: string,
  init: RequestInit = {},
): Promise<{ status: number; body: Record<string, unknown> | null; text: string }> {
  const headers = new Headers(init.headers);
  if (!headers.has("apikey")) headers.set("apikey", ANON_KEY);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(fnUrl(name), { ...init, headers });
  const text = await res.text();
  let body: Record<string, unknown> | null = null;
  try { body = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, body, text };
}