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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = 'admin@coreplane.pl';
    const password = 'test123';

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(u => u.email === email);

    let adminUserId: string;

    if (existingAdmin) {
      adminUserId = existingAdmin.id;
    } else {
      // Create the super admin user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) throw createError;
      adminUserId = newUser.user.id;
    }

    // Ensure super_admin role exists for this user
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', adminUserId)
      .eq('role', 'super_admin');

    if (!existingRole || existingRole.length === 0) {
      // Delete any existing roles for this user
      await supabase.from('user_roles').delete().eq('user_id', adminUserId);
      // Insert super_admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: adminUserId, role: 'super_admin' });
      if (roleError) throw roleError;
    }

    // Update or create profile as approved + onboarding complete
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', adminUserId);

    if (existingProfile && existingProfile.length > 0) {
      await supabase
        .from('profiles')
        .update({
          status: 'approved',
          onboarding_completed: true,
          display_name: 'Super Admin',
          first_name: 'Super',
          last_name: 'Admin',
        })
        .eq('user_id', adminUserId);
    } else {
      await supabase.from('profiles').insert({
        user_id: adminUserId,
        status: 'approved',
        onboarding_completed: true,
        display_name: 'Super Admin',
        first_name: 'Super',
        last_name: 'Admin',
      });
    }

    // Deactivate all other profiles
    await supabase
      .from('profiles')
      .update({ status: 'deactivated' })
      .neq('user_id', adminUserId);

    // Create default "System" organization if it doesn't exist
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', 'system');

    let orgId: string;
    if (existingOrg && existingOrg.length > 0) {
      orgId = existingOrg[0].id;
    } else {
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'System',
          slug: 'system',
          status: 'active',
          created_by: adminUserId,
        })
        .select()
        .single();
      if (orgError) throw orgError;
      orgId = newOrg.id;
    }

    // Add super admin as org member
    await supabase
      .from('organization_members')
      .upsert({
        organization_id: orgId,
        user_id: adminUserId,
        org_role: 'org_admin',
      }, { onConflict: 'organization_id,user_id' });

    // Migrate existing data: set organization_id on all business tables
    const tables = [
      'activities', 'products', 'packages', 'media_plans',
      'campaign_types', 'client_assignments', 'audit_log',
      'backup_history', 'notifications', 'app_settings',
    ];

    for (const table of tables) {
      await supabase
        .from(table as any)
        .update({ organization_id: orgId } as any)
        .is('organization_id', null);
    }

    // Migrate clients to organization_clients
    const { data: allClients } = await supabase.from('clients').select('id');
    if (allClients && allClients.length > 0) {
      const orgClientRows = allClients.map(c => ({
        organization_id: orgId,
        client_id: c.id,
      }));
      await supabase
        .from('organization_clients')
        .upsert(orgClientRows, { onConflict: 'organization_id,client_id' });
    }

    // Set profiles organization_id
    await supabase
      .from('profiles')
      .update({ organization_id: orgId } as any)
      .is('organization_id', null);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Super admin created, old accounts deactivated, data migrated to System org',
        adminUserId,
        organizationId: orgId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
