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

    // Check role — allow admin, org_admin, or super_admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isSuperAdmin = roleData?.role === 'super_admin';

    if (!['admin', 'super_admin'].includes(roleData?.role || '')) {
      // Also check if org_admin
      const { data: orgMember } = await supabaseAdmin
        .from('organization_members')
        .select('org_role, organization_id')
        .eq('user_id', user.id)
        .eq('org_role', 'org_admin')
        .limit(1)
        .single();

      if (!orgMember) {
        return new Response(JSON.stringify({ error: 'Only admins can export data' }), { status: 403, headers: corsHeaders });
      }
    }

    // Get user's organization IDs (super_admin gets all)
    let orgIds: string[] = [];
    if (!isSuperAdmin) {
      const { data: memberships } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);
      orgIds = (memberships || []).map(m => m.organization_id);
    }

    // Tables with organization_id column
    const orgScopedTables = ['activities', 'media_plans', 'packages', 'products', 'campaign_types'];
    // Tables scoped via organization_clients
    const clientScopedTables = ['clients'];
    // Tables scoped via activity relationship
    const activityScopedTables = ['confirmations'];
    // Tables scoped via product relationship
    const productScopedTables = ['product_clients'];

    const backup: Record<string, Array<Record<string, unknown>>> = {};

    for (const table of orgScopedTables) {
      let query = supabaseAdmin.from(table).select('*');
      if (!isSuperAdmin && orgIds.length > 0) {
        query = query.in('organization_id', orgIds);
      } else if (!isSuperAdmin) {
        backup[table] = [];
        continue;
      }
      const { data, error } = await query;
      if (error) {
        console.error(`Error exporting ${table}:`, error.message);
        backup[table] = [];
      } else {
        backup[table] = data || [];
      }
    }

    // Clients — scoped via organization_clients join
    if (!isSuperAdmin && orgIds.length > 0) {
      const { data: orgClients } = await supabaseAdmin
        .from('organization_clients')
        .select('client_id')
        .in('organization_id', orgIds);
      const clientIds = (orgClients || []).map(oc => oc.client_id);
      if (clientIds.length > 0) {
        const { data } = await supabaseAdmin.from('clients').select('*').in('id', clientIds);
        backup['clients'] = data || [];
      } else {
        backup['clients'] = [];
      }
    } else if (isSuperAdmin) {
      const { data } = await supabaseAdmin.from('clients').select('*');
      backup['clients'] = data || [];
    } else {
      backup['clients'] = [];
    }

    // Confirmations — scoped via activities
    const activityIds = (backup['activities'] || []).map((a) => a.id as string);
    if (activityIds.length > 0) {
      const { data } = await supabaseAdmin.from('confirmations').select('*').in('activity_id', activityIds);
      backup['confirmations'] = data || [];
    } else {
      backup['confirmations'] = [];
    }

    // Product clients — scoped via products
    const productIds = (backup['products'] || []).map((p) => p.id as string);
    if (productIds.length > 0) {
      const { data } = await supabaseAdmin.from('product_clients').select('*').in('product_id', productIds);
      backup['product_clients'] = data || [];
    } else {
      backup['product_clients'] = [];
    }

    // Generate checksum
    const tablesJson = JSON.stringify(backup);
    const checksum = await sha256(tablesJson);

    // Log export in audit_log
    await supabaseAdmin.from('audit_log').insert({
      user_id: user.id,
      action: 'EXPORT',
      table_name: 'system',
      record_id: null,
      new_data: { type: 'data_export', org_ids: isSuperAdmin ? 'all' : orgIds },
    });

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
      scope: isSuperAdmin ? 'global' : 'organization',
      organization_ids: isSuperAdmin ? 'all' : orgIds,
      checksum,
      tables: backup,
    };

    const exportJson = JSON.stringify(exportData, null, 2);

    // Check if this is a scheduled backup (save to storage)
    const url = new URL(req.url);
    const saveToStorage = url.searchParams.get('save_to_storage') === 'true';

    if (saveToStorage) {
      const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const filePath = `auto/${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('backups')
        .upload(filePath, exportJson, {
          contentType: 'application/json',
          upsert: false,
        });

      if (uploadError) {
        await supabaseAdmin.from('backup_history').insert({
          file_path: filePath,
          checksum,
          size_bytes: new TextEncoder().encode(exportJson).length,
          type: 'scheduled',
          status: 'error',
          error_message: uploadError.message,
          user_id: user.id,
        });

        return new Response(JSON.stringify({ error: uploadError.message }), { status: 500, headers: corsHeaders });
      }

      await supabaseAdmin.from('backup_history').insert({
        file_path: filePath,
        checksum,
        size_bytes: new TextEncoder().encode(exportJson).length,
        type: 'scheduled',
        status: 'success',
        user_id: user.id,
      });

      return new Response(JSON.stringify({ success: true, file_path: filePath, checksum }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Manual download
    await supabaseAdmin.from('backup_history').insert({
      file_path: 'manual-download',
      checksum,
      size_bytes: new TextEncoder().encode(exportJson).length,
      type: 'manual',
      status: 'success',
      user_id: user.id,
    });

    return new Response(exportJson, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
