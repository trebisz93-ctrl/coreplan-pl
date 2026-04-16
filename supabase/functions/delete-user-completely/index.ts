import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Brak autoryzacji');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error('Nieprawidłowy token');

    const { data: roles } = await supabaseAdmin
      .from('user_roles').select('role').eq('user_id', caller.id).eq('role', 'super_admin');
    if (!roles || roles.length === 0) throw new Error('Tylko super_admin może usuwać użytkowników');

    const { email } = await req.json();
    if (!email) throw new Error('Wymagane: email');

    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const target = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!target) throw new Error(`Nie znaleziono użytkownika o emailu ${email}`);

    const userId = target.id;
    const cleanup: Record<string, any> = {};

    // Delete from all related tables
    const tables = [
      'organization_members', 'client_assignments', 'user_roles',
      'notifications', 'system_logs', 'audit_log', 'trash_registry',
    ];
    for (const t of tables) {
      const { error, count } = await supabaseAdmin.from(t).delete({ count: 'exact' })
        .or(`user_id.eq.${userId},deleted_by.eq.${userId}`);
      cleanup[t] = error ? `error: ${error.message}` : `deleted ${count ?? 0}`;
    }

    // Profiles (hard delete)
    const { error: profErr, count: profCount } = await supabaseAdmin
      .from('profiles').delete({ count: 'exact' }).eq('user_id', userId);
    cleanup['profiles'] = profErr ? `error: ${profErr.message}` : `deleted ${profCount ?? 0}`;

    // Email logs by recipient
    const { error: elErr, count: elCount } = await supabaseAdmin
      .from('email_send_log').delete({ count: 'exact' }).ilike('recipient_email', email);
    cleanup['email_send_log'] = elErr ? `error: ${elErr.message}` : `deleted ${elCount ?? 0}`;

    // Auth user
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    cleanup['auth.users'] = authErr ? `error: ${authErr.message}` : 'deleted';

    return new Response(JSON.stringify({ success: true, user_id: userId, email, cleanup }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('delete-user-completely error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
