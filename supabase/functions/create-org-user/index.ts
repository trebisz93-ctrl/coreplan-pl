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

    const { email, password, first_name, last_name, organization_id, org_role } = await req.json();

    if (!email || !password || !organization_id) {
      throw new Error('Wymagane pola: email, password, organization_id');
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
        status: 'approved',
        onboarding_completed: true,
      })
      .eq('user_id', userId);

    // Set org role
    const role = org_role || 'org_admin';
    await supabaseAdmin.from('user_roles').update({ role }).eq('user_id', userId);

    // Add to organization_members
    await supabaseAdmin.from('organization_members').insert({
      organization_id,
      user_id: userId,
      org_role: role,
    });

    // Log action
    await supabaseAdmin.from('system_logs').insert({
      user_id: caller.id,
      event_type: 'user_created',
      description: `Utworzono użytkownika ${email} dla organizacji ${organization_id}`,
      organization_id,
      metadata: { created_user_id: userId, role },
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
