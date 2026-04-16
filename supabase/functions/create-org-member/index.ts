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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Brak autoryzacji');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error('Nieprawidłowy token');

    const { email, first_name, last_name, organization_id, org_role } = await req.json();

    if (!email || !organization_id) {
      throw new Error('Wymagane pola: email, organization_id');
    }

    // Check permissions
    const { data: superRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'super_admin');

    const isSuperAdmin = (superRoles?.length ?? 0) > 0;

    if (!isSuperAdmin) {
      const { data: membership } = await supabaseAdmin
        .from('organization_members')
        .select('org_role')
        .eq('user_id', caller.id)
        .eq('organization_id', organization_id)
        .maybeSingle();

      if (!membership || membership.org_role !== 'org_admin') {
        throw new Error('Brak uprawnień — musisz być administratorem tej firmy');
      }
    }

    const targetRole = org_role || 'user';
    if (!isSuperAdmin && (targetRole === 'super_admin' || targetRole === 'org_admin')) {
      throw new Error('Tylko Super Admin może nadawać rolę administratora firmy');
    }

    // Get org name
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .maybeSingle();

    const orgName = org?.name || '';

    // Check if user already exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const existingUser = existingUsers?.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;
    let wasInvited = false;

    if (existingUser) {
      userId = existingUser.id;

      // Check if already a member of this org
      const { data: existingMembership } = await supabaseAdmin
        .from('organization_members')
        .select('id, org_role')
        .eq('user_id', userId)
        .eq('organization_id', organization_id)
        .maybeSingle();

      if (existingMembership) {
        throw new Error(
          `Użytkownik ${email} jest już członkiem tej firmy (rola: ${existingMembership.org_role})`
        );
      }

      // User exists but not in this org → send password reset link so they can re-access account
      const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `https://coreplan.pl/auth?type=invite`,
        },
      });
      if (linkError) console.error('Recovery link error:', linkError);
    } else {
      // New user → invite by email
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            first_name: first_name || null,
            last_name: last_name || null,
            organization_id,
            org_role: targetRole,
            org_name: orgName,
            invited_by: isSuperAdmin ? 'super_admin' : 'org_admin',
          },
          redirectTo: `https://coreplan.pl/auth?type=invite`,
        }
      );

      if (authError) throw authError;
      userId = authData.user.id;
      wasInvited = true;
    }

    // Update / upsert profile
    const displayName = `${first_name || ''} ${last_name || ''}`.trim() || email;
    await supabaseAdmin
      .from('profiles')
      .update({
        first_name: first_name || null,
        last_name: last_name || null,
        display_name: displayName,
        organization_id,
        status: 'active',
        onboarding_completed: false,
      })
      .eq('user_id', userId);

    // Add to organization_members
    await supabaseAdmin.from('organization_members').insert({
      organization_id,
      user_id: userId,
      org_role: targetRole,
    });

    // Log
    await supabaseAdmin.from('system_logs').insert({
      user_id: caller.id,
      event_type: wasInvited ? 'user_invited' : 'user_added_existing',
      description: wasInvited
        ? `Zaproszono ${email} jako ${targetRole} do organizacji ${orgName}`
        : `Dodano istniejącego użytkownika ${email} jako ${targetRole} do organizacji ${orgName}`,
      organization_id,
      metadata: { invited_user_id: userId, role: targetRole, org_name: orgName, existing_user: !wasInvited },
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        existing_user: !wasInvited,
        message: wasInvited
          ? 'Wysłano zaproszenie e-mail'
          : 'Użytkownik istniał już w systemie — został dodany do firmy i otrzyma e-mail z linkiem dostępu',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('create-org-member error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
