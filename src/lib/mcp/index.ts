import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listClientsTool from "./tools/list-clients";
import listActivitiesTool from "./tools/list-activities";
import listProductsTool from "./tools/list-products";
import createActivityTool from "./tools/create-activity";

// Supabase project ref is inlined by Vite at build time (import-safe).
// The fallback keeps the issuer well-formed during the manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "coreplan-mcp",
  title: "CorePlan",
  version: "0.1.0",
  instructions:
    "Tools for CorePlan — a marketing media-plan platform. Use `list_clients`, `list_activities`, and `list_products` to read the signed-in user's workspace, and `create_activity` to add a new activity for a client.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listClientsTool, listActivitiesTool, listProductsTool, createActivityTool],
});