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

function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let r = 0;
  for (let i = 0; i < ea.length; i++) r |= ea[i] ^ eb[i];
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify caller is super_admin (via auth header) or internal cron
    const authHeader = req.headers.get('Authorization');
    const cronSecretHeader = req.headers.get('X-Cron-Secret');
    const CRON_SECRET = Deno.env.get('BACKUP_CRON_SECRET');
    let userId: string;

    if (cronSecretHeader && CRON_SECRET && timingSafeEqual(cronSecretHeader, CRON_SECRET)) {
      // Trusted scheduled invocation (pg_cron / Supabase scheduled function).
      userId = 'system-cron';
    } else if (authHeader) {
      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error } = await supabaseUser.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }

      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleData?.role !== 'super_admin') {
        return new Response(JSON.stringify({ error: 'Only super_admin can trigger backups' }), { status: 403, headers: corsHeaders });
      }
      userId = user.id;
    } else {
      // No cron secret and no auth token -> deny by default.
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Export all tables
    const tables = ['activities', 'media_plans', 'products', 'clients', 'confirmations',
      'campaign_types', 'organization_clients', 'product_clients', 'organizations',
      'profiles', 'organization_members', 'app_settings'];

    const backup: Record<string, unknown[]> = {};

    for (const table of tables) {
      const { data, error } = await supabaseAdmin.from(table).select('*');
      if (error) {
        console.error(`Error exporting ${table}:`, error.message);
        backup[table] = [];
      } else {
        backup[table] = data || [];
      }
    }

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      triggered_by: userId,
      tables: backup,
    };

    const exportJson = JSON.stringify(exportData, null, 2);
    const checksum = await sha256(exportJson);
    const sizeBytes = new TextEncoder().encode(exportJson).length;

    // Send to Hostinger
    let hostingerUrl = (Deno.env.get('HOSTINGER_BACKUP_URL') || '').trim();
    const hostingerKey = (Deno.env.get('HOSTINGER_BACKUP_KEY') || '').trim();

    // Clean up URL if it contains KEY=VALUE format
    if (hostingerUrl.includes('=') && !hostingerUrl.startsWith('http')) {
      hostingerUrl = hostingerUrl.split('=').slice(1).join('=').trim();
    }

    if (!hostingerUrl || !hostingerKey) {
      // Log failure
      await supabaseAdmin.from('backup_history').insert({
        file_path: 'hostinger-export',
        checksum,
        size_bytes: sizeBytes,
        type: 'hostinger',
        status: 'error',
        error_message: 'Missing HOSTINGER_BACKUP_URL or HOSTINGER_BACKUP_KEY',
        user_id: userId,
      });
      return new Response(JSON.stringify({ error: 'Hostinger secrets not configured' }), { status: 500, headers: corsHeaders });
    }

    const hostingerResponse = await fetch(hostingerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Backup-Key': hostingerKey,
      },
      body: exportJson,
    });

    if (!hostingerResponse.ok) {
      const errText = await hostingerResponse.text();
      await supabaseAdmin.from('backup_history').insert({
        file_path: 'hostinger-export',
        checksum,
        size_bytes: sizeBytes,
        type: 'hostinger',
        status: 'error',
        error_message: `Hostinger HTTP ${hostingerResponse.status}: ${errText.slice(0, 200)}`,
        user_id: userId,
      });
      return new Response(JSON.stringify({ error: 'Hostinger upload failed', details: errText.slice(0, 200) }), { status: 502, headers: corsHeaders });
    }

    await hostingerResponse.text(); // consume body

    // Also save locally
    const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await supabaseAdmin.storage.from('backups').upload(`auto/${fileName}`, exportJson, {
      contentType: 'application/json',
      upsert: false,
    });

    // Log success
    await supabaseAdmin.from('backup_history').insert({
      file_path: `hostinger + auto/${fileName}`,
      checksum,
      size_bytes: sizeBytes,
      type: 'hostinger',
      status: 'success',
      user_id: userId,
    });

    // Audit log
    await supabaseAdmin.from('audit_log').insert({
      user_id: userId,
      action: 'EXPORT',
      table_name: 'system',
      record_id: null,
      new_data: { type: 'backup_to_hostinger', size_bytes: sizeBytes, checksum },
    });

    return new Response(JSON.stringify({ success: true, checksum, size_bytes: sizeBytes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
