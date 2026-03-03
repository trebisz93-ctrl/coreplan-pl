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

    // Only admins can export
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can export data' }), { status: 403, headers: corsHeaders });
    }

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

    // Generate checksum of table data
    const tablesJson = JSON.stringify(backup);
    const checksum = await sha256(tablesJson);

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
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
        // Log failure
        await supabaseAdmin.from('backup_history').insert({
          file_path: filePath,
          checksum,
          size_bytes: new TextEncoder().encode(exportJson).length,
          type: 'scheduled',
          status: 'error',
          error_message: uploadError.message,
          user_id: user.id,
        });

        // Notify admins about failure
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
            description: `Backup nie powiódł się: ${uploadError.message}`,
          });
        }

        return new Response(JSON.stringify({ error: uploadError.message }), { status: 500, headers: corsHeaders });
      }

      // Log success
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

    // Manual download - also log it
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
