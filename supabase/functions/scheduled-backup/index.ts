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

  const cronSecretHeader = req.headers.get('X-Cron-Secret') ?? '';
  const CRON_SECRET = Deno.env.get('BACKUP_CRON_SECRET') ?? '';
  if (!CRON_SECRET || !timingSafeEqual(cronSecretHeader, CRON_SECRET)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const tables = ['clients', 'products', 'activities', 'media_plans', 'packages', 'confirmations', 'campaign_types', 'product_clients'];
    const backup: Record<string, any[]> = {};

    for (const table of tables) {
      const { data, error } = await supabaseAdmin.from(table).select('*');
      if (error) {
        console.error(`Error exporting ${table}:`, error.message);
        backup[table] = [];
      } else {
        backup[table] = data || [];
      }
    }

    const tablesJson = JSON.stringify(backup);
    const checksum = await sha256(tablesJson);

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      user_id: 'system',
      type: 'scheduled',
      checksum,
      tables: backup,
    };

    const exportJson = JSON.stringify(exportData, null, 2);
    const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filePath = `auto/${fileName}`;
    const sizeBytes = new TextEncoder().encode(exportJson).length;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('backups')
      .upload(filePath, exportJson, {
        contentType: 'application/json',
        upsert: false,
      });

    // Get first admin user_id for history record
    const { data: adminData } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    const adminUserId = adminData?.user_id || '00000000-0000-0000-0000-000000000000';

    if (uploadError) {
      await supabaseAdmin.from('backup_history').insert({
        file_path: filePath,
        checksum,
        size_bytes: sizeBytes,
        type: 'scheduled',
        status: 'error',
        error_message: uploadError.message,
        user_id: adminUserId,
      });

      // Notify admins
      const { data: admins } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      for (const admin of admins || []) {
        await supabaseAdmin.from('notifications').insert({
          user_id: admin.user_id,
          type: 'warning',
          category: 'system',
          title: 'Błąd automatycznego backupu',
          description: `Scheduled backup failed: ${uploadError.message}`,
        });
      }

      return new Response(JSON.stringify({ error: uploadError.message }), { status: 500, headers: corsHeaders });
    }

    await supabaseAdmin.from('backup_history').insert({
      file_path: filePath,
      checksum,
      size_bytes: sizeBytes,
      type: 'scheduled',
      status: 'success',
      user_id: adminUserId,
    });

    // Cleanup old backups (>30 days)
    const { data: oldBackups } = await supabaseAdmin
      .from('backup_history')
      .select('id, file_path')
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (oldBackups && oldBackups.length > 0) {
      const filePaths = oldBackups.filter(b => b.file_path.startsWith('auto/')).map(b => b.file_path);
      if (filePaths.length > 0) {
        await supabaseAdmin.storage.from('backups').remove(filePaths);
      }
      const ids = oldBackups.map(b => b.id);
      await supabaseAdmin.from('backup_history').delete().in('id', ids);
    }

    return new Response(JSON.stringify({ success: true, file_path: filePath, checksum, size_bytes: sizeBytes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Notify admins on unexpected error
    const { data: admins } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    for (const admin of admins || []) {
      await supabaseAdmin.from('notifications').insert({
        user_id: admin.user_id,
        type: 'warning',
        category: 'system',
        title: 'Błąd automatycznego backupu',
        description: `Unexpected error: ${err.message}`,
      });
    }

    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
