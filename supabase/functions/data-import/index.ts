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

    // Only admins can import
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
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
