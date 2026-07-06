import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function db(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_activities",
  title: "List activities",
  description: "List CorePlan marketing activities the signed-in user can see. Optionally filter by client, status, or date range.",
  inputSchema: {
    client_id: z.string().uuid().optional().describe("Filter by client UUID."),
    status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
    start_from: z.string().optional().describe("ISO date; include activities starting on or after this date."),
    start_to: z.string().optional().describe("ISO date; include activities starting on or before this date."),
    limit: z.number().int().min(1).max(500).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = db(ctx).from("activities")
      .select("id,name,client_id,status,channel,campaign_type,start_date,end_date,price,note")
      .is("deleted_at", null)
      .order("start_date", { ascending: false })
      .limit(input.limit ?? 100);
    if (input.client_id) q = q.eq("client_id", input.client_id);
    if (input.status) q = q.eq("status", input.status);
    if (input.start_from) q = q.gte("start_date", input.start_from);
    if (input.start_to) q = q.lte("start_date", input.start_to);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { activities: data ?? [] } };
  },
});