import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildOrgContext, queueAuthEmail, ROOT_DOMAIN } from '../_shared/queue-auth-email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Brak autoryzacji' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ success: false, error: 'Nieprawidłowy token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only super admins can resend
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'super_admin');

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Brak uprawnień (wymagany super_admin)' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
      });
      if (inviteError) throw inviteError;
      action = 'invite';
      resultMessage = `Wysłano nowe zaproszenie do ${email}`;
    } else if (existingUser.invited_at && !existingUser.email_confirmed_at) {
      // Invited but not activated yet -> generate a fresh invite link and send it through the auth queue.
      const { data: inviteLink, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { redirectTo },
      });
      if (inviteError) throw inviteError;
      if (!inviteLink?.properties?.action_link) throw new Error('Nie udało się wygenerować nowego linku zaproszenia');
      // WAŻNE: NIE używamy inviteLink.properties.action_link bezpośrednio —
      // to surowy link Supabase (/auth/v1/verify?token=...), który zużywa
      // token przy zwykłym wejściu (GET), bez interakcji użytkownika.
      // Firmowe skanery linków (Proofpoint URL Defense, Microsoft Safe Links)
      // automatycznie "odwiedzają" każdy link w mailu, co konsumowało token,
      // zanim prawdziwy użytkownik zdążył kliknąć — to samo, co naprawiliśmy
      // w auth-email-hook/index.ts. Ta funkcja ma WŁASNĄ, niezależną ścieżkę
      // wysyłki (queueAuthEmail), więc wymaga tej samej poprawki osobno.
      const inviteConfirmationUrl = inviteLink.properties.hashed_token
        ? `https://${ROOT_DOMAIN}/reset-password?token_hash=${encodeURIComponent(inviteLink.properties.hashed_token)}&type=invite`
        : inviteLink.properties.action_link;
      const { orgName, invitedBy } = await buildOrgContext(supabaseAdmin, email);
      await queueAuthEmail(supabaseAdmin, {
        action: 'invite',
        confirmationUrl: inviteConfirmationUrl,
        email,
        orgName,
        invitedBy,
        source: 'resend-user-invite',
      });
      action = 'invite';
      resultMessage = `Wysłano nowe zaproszenie do ${email}`;
    } else {
      // Active/confirmed user -> generate a fresh recovery link and send it through the auth queue.
      const { data: recoveryLink, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      });
      if (recoveryError) throw recoveryError;
      if (!recoveryLink?.properties?.action_link) throw new Error('Nie udało się wygenerować nowego linku resetu hasła');
      // Ta sama poprawka co przy zaproszeniu wyżej — patrz komentarz tam.
      const recoveryConfirmationUrl = recoveryLink.properties.hashed_token
        ? `https://${ROOT_DOMAIN}/reset-password?token_hash=${encodeURIComponent(recoveryLink.properties.hashed_token)}&type=recovery`
        : recoveryLink.properties.action_link;
      const { orgName } = await buildOrgContext(supabaseAdmin, email);
      await queueAuthEmail(supabaseAdmin, {
        action: 'recovery',
        confirmationUrl: recoveryConfirmationUrl,
        email,
        orgName,
        source: 'resend-user-invite',
      });
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
  } catch (error: unknown) {
    console.error('resend-user-invite error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
