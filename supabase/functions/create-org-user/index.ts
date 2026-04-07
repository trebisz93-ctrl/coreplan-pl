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

    // Verify caller is super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Brak autoryzacji');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error('Nieprawidłowy token');

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'super_admin');

    if (!roles || roles.length === 0) throw new Error('Brak uprawnień');

    const { email, first_name, last_name, organization_id, org_role } = await req.json();

    if (!email || !organization_id) {
      throw new Error('Wymagane pola: email, organization_id');
    }

    // Get org name for invite context
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single();

    const orgName = org?.name || '';

    // Invite user by email (user sets their own password via invite link)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          first_name: first_name || null,
          last_name: last_name || null,
          organization_id,
          org_role: org_role || 'org_admin',
          org_name: orgName,
          invited_by: 'super_admin',
        },
        redirectTo: `https://coreplan.pl/auth?type=invite`,
      }
    );

    if (authError) throw authError;
    const userId = authData.user.id;

    // Update profile (created by handle_new_user trigger)
    await supabaseAdmin
      .from('profiles')
      .update({
        first_name: first_name || null,
        last_name: last_name || null,
        display_name: `${first_name || ''} ${last_name || ''}`.trim() || email,
        organization_id,
        status: 'pending',
        onboarding_completed: false,
      })
      .eq('user_id', userId);

    // Add to organization_members with org_role
    const role = org_role || 'org_admin';
    await supabaseAdmin.from('organization_members').insert({
      organization_id,
      user_id: userId,
      org_role: role,
    });

    // Log action
    await supabaseAdmin.from('system_logs').insert({
      user_id: caller.id,
      event_type: 'user_invited',
      description: `Zaproszono ${email} jako ${role} do organizacji ${orgName}`,
      organization_id,
      metadata: { invited_user_id: userId, role, org_name: orgName },
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