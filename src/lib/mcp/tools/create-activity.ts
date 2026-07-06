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
  name: "create_activity",
  title: "Create activity",
  description: "Create a new marketing activity in CorePlan for a given client.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Activity name."),
    client_id: z.string().uuid().describe("Target client UUID."),
    start_date: z.string().describe("ISO start date (YYYY-MM-DD)."),
    end_date: z.string().describe("ISO end date (YYYY-MM-DD); must be >= start_date."),
    price: z.number().min(0).optional().describe("Budget/price for the activity (>= 0)."),
    channel: z.string().optional(),
    campaign_type: z.string().optional(),
    status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
    note: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    if (input.end_date < input.start_date) {
      return { content: [{ type: "text", text: "end_date must be on or after start_date" }], isError: true };
    }
    const { data, error } = await db(ctx).from("activities").insert({
      user_id: ctx.getUserId()!,
      name: input.name,
      client_id: input.client_id,
      start_date: input.start_date,
      end_date: input.end_date,
      price: input.price ?? 0,
      channel: input.channel ?? "",
      campaign_type: input.campaign_type ?? "",
      status: input.status ?? "planned",
      note: input.note,
    }).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Activity created: ${data.id}` }], structuredContent: { activity: data } };
  },
});