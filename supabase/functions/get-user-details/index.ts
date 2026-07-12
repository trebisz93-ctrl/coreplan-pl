import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zwraca pełne, tylko-do-odczytu dane konta (auth.users + organization_members
// + user_roles) dla panelu "Szczegóły" w GlobalUsersView — super_admin only.
// Te dane (email potwierdzony, ostatnie logowanie, lista wszystkich
// organizacji) nie są dostępne z poziomu klienta, bo żyją w auth.users,
// do którego zwykły klient nie ma dostępu.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'super_admin');
    if (!callerRoles || callerRoles.length === 0) throw new Error('Brak uprawnień');

    const { target_user_id } = await req.json();
    if (!target_user_id) throw new Error('Wymagane pole: target_user_id');

    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(target_user_id);
    if (authUserError) throw authUserError;
    if (!authUser?.user) throw new Error('Nie znaleziono użytkownika');

    const { data: memberships } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id, org_role, organizations(name)')
      .eq('user_id', target_user_id);

    const { data: globalRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', target_user_id);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          email: authUser.user.email,
          created_at: authUser.user.created_at,
          last_sign_in_at: authUser.user.last_sign_in_at,
          email_confirmed_at: authUser.user.email_confirmed_at,
          banned_until: (authUser.user as { banned_until?: string }).banned_until ?? null,
        },
        memberships: (memberships || []).map((m: { organization_id: string; org_role: string; organizations: { name: string } | null }) => ({
          organization_id: m.organization_id,
          org_role: m.org_role,
          org_name: m.organizations?.name || '—',
        })),
        globalRoles: (globalRoles || []).map((r: { role: string }) => r.role),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('get-user-details error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
