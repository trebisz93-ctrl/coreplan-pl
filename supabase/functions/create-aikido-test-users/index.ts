import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function generatePassword(length = 24): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*-_=+';
  const all = upper + lower + digits + symbols;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let pwd = '';
  // ensure at least one of each class
  pwd += upper[bytes[0] % upper.length];
  pwd += lower[bytes[1] % lower.length];
  pwd += digits[bytes[2] % digits.length];
  pwd += symbols[bytes[3] % symbols.length];
  for (let i = 4; i < length; i++) pwd += all[bytes[i] % all.length];
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify caller is super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    // Client that runs as the calling super_admin — used for inserts into tables
    // whose audit triggers require auth.uid() to be present (e.g. organizations,
    // organization_members, system_logs).
    const asAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isAdminData, error: roleErr } = await admin.rpc('is_super_admin', { _user_id: userData.user.id });
    if (roleErr || !isAdminData) {
      return new Response(JSON.stringify({ error: 'Forbidden: super_admin required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenants = [
      { name: 'Aikido Test 1', suffix: '1' },
      { name: 'Aikido Test 2', suffix: '2' },
    ];
    const roles: Array<{ key: 'admin' | 'manager' | 'viewer'; org_role: string }> = [
      { key: 'admin', org_role: 'org_admin' },
      { key: 'manager', org_role: 'manager' },
      { key: 'viewer', org_role: 'viewer' },
    ];

    const credentials: Array<{ email: string; password: string; org: string; role: string }> = [];

    for (const tenant of tenants) {
      // Find or create organization
      const slug = slugify(tenant.name);
      let orgId: string;
      const { data: existingOrg } = await admin
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existingOrg) {
        orgId = existingOrg.id;
      } else {
        const { data: newOrg, error: orgErr } = await asAdmin
          .from('organizations')
          .insert({
            name: tenant.name,
            slug,
            status: 'active',
            onboarding_completed: true,
            internal_note: 'Konto testowe dla skanera bezpieczeństwa Aikido. NIE UŻYWAĆ DO PRODUKCJI.',
            created_by: userData.user.id,
          })
          .select('id')
          .single();
        if (orgErr) throw new Error(`Org create failed: ${orgErr.message}`);
        orgId = newOrg.id;
      }

      for (const role of roles) {
        const email = `aikido-${role.key}-${tenant.suffix}@coreplan.pl`;
        const password = generatePassword(24);

        // Check if user already exists
        const { data: existingUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = existingUsers?.users?.find((u) => u.email === email);

        let userId: string;
        if (existing) {
          // Reset password to a fresh one
          const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
            password,
            email_confirm: true,
          });
          if (updErr) throw new Error(`Update user failed for ${email}: ${updErr.message}`);
          userId = existing.id;
        } else {
          const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              first_name: 'Aikido',
              last_name: `${role.key} T${tenant.suffix}`,
              aikido_test: true,
            },
          });
          if (createErr) throw new Error(`Create user failed for ${email}: ${createErr.message}`);
          userId = created.user!.id;
        }

        // Upsert profile (mark onboarding complete)
        await admin.from('profiles').upsert(
          {
            user_id: userId,
            display_name: `Aikido ${role.key.toUpperCase()} T${tenant.suffix}`,
            first_name: 'Aikido',
            last_name: `${role.key} T${tenant.suffix}`,
            organization_id: orgId,
            status: 'active',
            onboarding_completed: true,
          },
          { onConflict: 'user_id' }
        );

        // Upsert organization membership
        const { data: existingMember } = await admin
          .from('organization_members')
          .select('id')
          .eq('user_id', userId)
          .eq('organization_id', orgId)
          .maybeSingle();
        if (existingMember) {
          await admin
            .from('organization_members')
            .update({ org_role: role.org_role })
            .eq('id', existingMember.id);
        } else {
          await admin
            .from('organization_members')
            .insert({ user_id: userId, organization_id: orgId, org_role: role.org_role });
        }

        credentials.push({
          email,
          password,
          org: tenant.name,
          role: role.org_role,
        });
      }
    }

    // Log
    await admin.from('system_logs').insert({
      event_type: 'aikido_test_users_created',
      description: `Wygenerowano ${credentials.length} kont testowych Aikido (${tenants.length} organizacje)`,
      user_id: userData.user.id,
      metadata: { count: credentials.length, tenants: tenants.map((t) => t.name) },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Utworzono ${credentials.length} kont testowych w ${tenants.length} organizacjach.`,
        credentials,
        warning: 'ZACHOWAJ TE HASŁA — zostaną pokazane tylko raz. Po skończonych testach usuń konta.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('create-aikido-test-users error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
