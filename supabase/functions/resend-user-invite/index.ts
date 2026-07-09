import * as React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { InviteEmail } from '../_shared/email-templates/invite.tsx';
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SITE_NAME = 'coreplan-pl';
const SENDER_DOMAIN = 'notify.coreplan.pl';
const FROM_DOMAIN = 'notify.coreplan.pl';
const ROOT_DOMAIN = 'coreplan.pl';

const EMAIL_SUBJECTS = {
  invite: "You've been invited",
  recovery: 'Reset your password',
} as const;

const buildOrgContext = async (supabaseAdmin: ReturnType<typeof createClient>, email: string) => {
  let orgName: string | undefined;
  let invitedBy: string | undefined;

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const authUser = authUsers?.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  const metadata = authUser?.user_metadata ?? {};
  if (typeof metadata.org_name === 'string') orgName = metadata.org_name;
  if (typeof metadata.invited_by === 'string') invitedBy = metadata.invited_by;

  if (!orgName) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, user_id')
      .eq('user_id', authUser?.id ?? '')
      .maybeSingle();

    const organizationId = profile?.organization_id;
    if (organizationId) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .maybeSingle();
      if (org?.name) orgName = org.name;
    }
  }

  return { orgName, invitedBy };
};

const queueAuthEmail = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  params: {
    action: 'invite' | 'recovery';
    confirmationUrl: string;
    email: string;
    orgName?: string;
    invitedBy?: string;
  }
) => {
  const { action, confirmationUrl, email, orgName, invitedBy } = params;
  const messageId = crypto.randomUUID();

  const template = action === 'invite'
    ? React.createElement(InviteEmail, {
        siteName: SITE_NAME,
        siteUrl: `https://${ROOT_DOMAIN}`,
        confirmationUrl,
        orgName,
        invitedBy,
      })
    : React.createElement(RecoveryEmail, {
        siteName: SITE_NAME,
        confirmationUrl,
        orgName,
      });

  const html = await renderAsync(template);
  const text = await renderAsync(template, { plainText: true });

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: action,
    recipient_email: email,
    status: 'pending',
    metadata: { source: 'resend-user-invite' },
  });

  const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'auth_emails',
    payload: {
      run_id: `manual-resend-${messageId}`,
      message_id: messageId,
      to: email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: EMAIL_SUBJECTS[action],
      html,
      text,
      purpose: 'transactional',
      label: action,
      queued_at: new Date().toISOString(),
    },
  });

  if (enqueueError) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: action,
      recipient_email: email,
      status: 'failed',
      error_message: enqueueError.message,
      metadata: { source: 'resend-user-invite' },
    });
    throw enqueueError;
  }
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
      console.log('DEBUG resend-invite hashed_token present?', !!inviteLink.properties.hashed_token);
      const { orgName, invitedBy } = await buildOrgContext(supabaseAdmin, email);
      await queueAuthEmail(supabaseAdmin, {
        action: 'invite',
        confirmationUrl: inviteConfirmationUrl,
        email,
        orgName,
        invitedBy,
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
      console.log('DEBUG resend-invite (recovery) hashed_token present?', !!recoveryLink.properties.hashed_token);
      const { orgName } = await buildOrgContext(supabaseAdmin, email);
      await queueAuthEmail(supabaseAdmin, {
        action: 'recovery',
        confirmationUrl: recoveryConfirmationUrl,
        email,
        orgName,
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
