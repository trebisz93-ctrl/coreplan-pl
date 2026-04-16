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

    // Only super admins can resend
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'super_admin');

    if (!roles || roles.length === 0) throw new Error('Brak uprawnień (wymagany super_admin)');

    const { email } = await req.json();
    if (!email) throw new Error('Wymagane pole: email');

    const redirectTo = `https://coreplan.pl/reset-password`;

    // Find user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const existingUser = existingUsers?.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let action: 'invite' | 'recovery';
    let resultMessage: string;

    if (!existingUser) {
      // No user — send fresh invite
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
      });
      if (inviteError) throw inviteError;
      action = 'invite';
      resultMessage = `Wysłano nowe zaproszenie do ${email}`;
    } else {
      // User exists — send fresh recovery (works for both confirmed and unconfirmed users,
      // and generates a brand-new token that lands on /reset-password)
      const { error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      });
      if (recoveryError) throw recoveryError;
      action = 'recovery';
      resultMessage = `Wysłano nowy link do ustawienia hasła do ${email}`;
    }

    await supabaseAdmin.from('system_logs').insert({
      user_id: caller.id,
      event_type: 'email_resent',
      description: `Super Admin ponownie wysłał e-mail (${action}) do ${email}`,
      metadata: { email, action },
    });

    return new Response(
      JSON.stringify({ success: true, action, message: resultMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('resend-user-invite error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
