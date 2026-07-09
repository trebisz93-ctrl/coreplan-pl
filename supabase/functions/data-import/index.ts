import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Determine caller privileges
    const { data: rolesData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const roles = (rolesData ?? []).map((r: { role: string }) => r.role);
    const isSuperAdmin = roles.includes('super_admin');
    const isPlatformAdmin = roles.includes('admin');

    // Fetch caller's organization ids
    const { data: membersData } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id, org_role')
      .eq('user_id', user.id);
    const callerOrgIds = new Set<string>((membersData ?? []).map((m: { organization_id: string }) => m.organization_id));
    const isOrgAdmin = (membersData ?? []).some((m: { org_role: string }) => m.org_role === 'org_admin');

    if (!isSuperAdmin && !isPlatformAdmin && !isOrgAdmin) {
      return new Response(JSON.stringify({ error: 'Only admins can import data' }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { tables, checksum } = body;

    if (!tables || typeof tables !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid backup format' }), { status: 400, headers: corsHeaders });
    }

    // Verify checksum if present
    if (checksum) {
      const tablesJson = JSON.stringify(tables);
      const computedChecksum = await sha256(tablesJson);
      if (computedChecksum !== checksum) {
        return new Response(JSON.stringify({ error: 'Checksum mismatch - backup file may be corrupted or tampered with' }), { status: 400, headers: corsHeaders });
      }
    }

    const results: Record<string, { inserted: number; errors: string[] }> = {};
    
    const importOrder = ['clients', 'products', 'product_clients', 'packages', 'media_plans', 'activities', 'confirmations', 'campaign_types'];

    // Tables that carry organization_id directly
    const orgScopedTables = new Set(['clients', 'products', 'packages', 'media_plans', 'activities', 'campaign_types']);
    // Dependent tables: verify referenced parent belongs to caller
    const dependentRefs: Record<string, Array<{ column: string; table: string }>> = {
      product_clients: [
        { column: 'product_id', table: 'products' },
        { column: 'client_id', table: 'clients' },
      ],
      confirmations: [
        { column: 'activity_id', table: 'activities' },
      ],
    };

    for (const table of importOrder) {
      const rows = tables[table];
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        results[table] = { inserted: 0, errors: [] };
        continue;
      }

      const errors: string[] = [];
      let inserted = 0;

      for (const row of rows) {
        if ('user_id' in row) {
          row.user_id = user.id;
        }

        // Cross-tenant guard for org-scoped tables:
        // Force organization_id to a caller-owned org (never trust client input).
        if (!isSuperAdmin && orgScopedTables.has(table)) {
          const submittedOrgId = row.organization_id as string | null | undefined;
          if (submittedOrgId && callerOrgIds.has(submittedOrgId)) {
            row.organization_id = submittedOrgId;
          } else if (callerOrgIds.size === 1) {
            row.organization_id = Array.from(callerOrgIds)[0];
          } else {
            errors.push(`${row.id}: organization_id not accessible for caller`);
            continue;
          }
        }

        // Existing-row ownership check: prevent hijacking a record that today
        // belongs to a different tenant by re-using its id in an upsert.
        if (!isSuperAdmin && row.id && orgScopedTables.has(table)) {
          const { data: existing } = await supabaseAdmin
            .from(table)
            .select('organization_id')
            .eq('id', row.id)
            .maybeSingle();
          if (existing && existing.organization_id && !callerOrgIds.has(existing.organization_id)) {
            errors.push(`${row.id}: record belongs to another account`);
            continue;
          }
        }

        // Dependent tables: verify each referenced parent belongs to caller
        if (!isSuperAdmin && dependentRefs[table]) {
          let refOk = true;
          for (const ref of dependentRefs[table]) {
            const refId = row[ref.column];
            if (!refId) continue;
            const { data: parent } = await supabaseAdmin
              .from(ref.table)
              .select('organization_id')
              .eq('id', refId)
              .maybeSingle();
            if (!parent || !parent.organization_id || !callerOrgIds.has(parent.organization_id)) {
              errors.push(`${row.id}: ${ref.column} references record outside caller's organization`);
              refOk = false;
              break;
            }
          }
          if (!refOk) continue;
        }

        const { error } = await supabaseAdmin.from(table).upsert(row, { onConflict: 'id' });
        if (error) {
          errors.push(`${row.id}: ${error.message}`);
        } else {
          inserted++;
        }
      }

      results[table] = { inserted, errors };
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
