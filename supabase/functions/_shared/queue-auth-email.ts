import * as React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { InviteEmail } from './email-templates/invite.tsx';
import { RecoveryEmail } from './email-templates/recovery.tsx';

// Wydzielone z resend-user-invite/index.ts, żeby create-org-user mogło
// korzystać z DOKŁADNIE TEGO SAMEGO, sprawdzonego mechanizmu wysyłki —
// zamiast polegać na automatycznym mailu wysyłanym przez
// supabase.auth.admin.inviteUserByEmail() poprzez Send Email Hook, który
// (zaobserwowane) czasem w ogóle się nie uruchamia dla tego wywołania,
// bez żadnego śladu w logach ani w email_send_log.
//
// Ta ścieżka jest bardziej niezawodna, bo NIE zależy od tego, czy Supabase
// Auth Hook w ogóle zdecyduje się odpalić — sami budujemy i kolejkujemy
// mail wprost.

const SITE_NAME = 'coreplan-pl';
const SENDER_DOMAIN = 'notify.coreplan.pl';
const FROM_DOMAIN = 'notify.coreplan.pl';
export const ROOT_DOMAIN = 'coreplan.pl';

const EMAIL_SUBJECTS = {
  invite: "You've been invited",
  recovery: 'Reset your password',
} as const;

export const buildOrgContext = async (supabaseAdmin: ReturnType<typeof createClient>, email: string) => {
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

export const queueAuthEmail = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  params: {
    action: 'invite' | 'recovery';
    confirmationUrl: string;
    email: string;
    orgName?: string;
    invitedBy?: string;
    source: string;
  }
) => {
  const { action, confirmationUrl, email, orgName, invitedBy, source } = params;
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
    metadata: { source },
  });

  const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'auth_emails',
    payload: {
      run_id: `manual-${source}-${messageId}`,
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
      metadata: { source },
    });
    throw enqueueError;
  }
};
