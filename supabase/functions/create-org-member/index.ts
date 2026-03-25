import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Brak autoryzacji');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error('Nieprawidłowy token');

    const { email, password, first_name, last_name, organization_id, org_role } = await req.json();

    if (!email || !password || !organization_id) {
      throw new Error('Wymagane pola: email, password, organization_id');
    }

    // Check if caller is super_admin OR org_admin of the target organization
    const { data: superRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'super_admin');

    const isSuperAdmin = (superRoles?.length ?? 0) > 0;

    if (!isSuperAdmin) {
      // Check if caller is org_admin of the target organization
      const { data: membership } = await supabaseAdmin
        .from('organization_members')
        .select('org_role')
        .eq('user_id', caller.id)
        .eq('organization_id', organization_id)
        .single();

      if (!membership || membership.org_role !== 'org_admin') {
        throw new Error('Brak uprawnień — musisz być administratorem tej firmy');
      }
    }

    // Prevent org_admin from creating super_admin or org_admin
    const targetRole = org_role || 'user';
    if (!isSuperAdmin && (targetRole === 'super_admin' || targetRole === 'org_admin')) {
      throw new Error('Tylko Super Admin może nadawać rolę administratora firmy');
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;
    const userId = authData.user.id;

    // Update profile (created by trigger)
    await supabaseAdmin
      .from('profiles')
      .update({
        first_name: first_name || null,
        last_name: last_name || null,
        display_name: `${first_name || ''} ${last_name || ''}`.trim() || email,
        organization_id,
        status: 'active',
        onboarding_completed: true,
      })
      .eq('user_id', userId);

    // Add to organization_members with org_role
    await supabaseAdmin.from('organization_members').insert({
      organization_id,
      user_id: userId,
      org_role: targetRole,
    });

    // Log action
    await supabaseAdmin.from('system_logs').insert({
      user_id: caller.id,
      event_type: 'user_created',
      description: `Utworzono użytkownika ${email} w organizacji`,
      organization_id,
      metadata: { created_user_id: userId, role: targetRole },
    });

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
