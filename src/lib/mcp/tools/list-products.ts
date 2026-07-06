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
  name: "list_products",
  title: "List products",
  description: "List products from the CorePlan catalog accessible to the signed-in user.",
  inputSchema: {
    search: z.string().optional().describe("Optional name substring filter."),
    category: z.string().optional(),
    client_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = db(ctx).from("products")
      .select("id,name,category,subcategory,brand,ean,client_id")
      .is("deleted_at", null)
      .order("name")
      .limit(input.limit ?? 100);
    if (input.search) q = q.ilike("name", `%${input.search}%`);
    if (input.category) q = q.eq("category", input.category);
    if (input.client_id) q = q.eq("client_id", input.client_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { products: data ?? [] } };
  },
});