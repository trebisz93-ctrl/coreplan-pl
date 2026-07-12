import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildOrgContext, queueAuthEmail, ROOT_DOMAIN } from '../_shared/queue-auth-email.ts';

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

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .maybeSingle();

    const orgName = org?.name || '';
    const targetRole = org_role || 'org_admin';

    // Check existing user
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

      const { data: recoveryLink, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `https://${ROOT_DOMAIN}/reset-password` },
      });
      if (linkError) throw linkError;

      const recoveryConfirmationUrl = recoveryLink?.properties?.hashed_token
        ? `https://${ROOT_DOMAIN}/reset-password?token_hash=${encodeURIComponent(recoveryLink.properties.hashed_token)}&type=recovery`
        : recoveryLink?.properties?.action_link;

      if (recoveryConfirmationUrl) {
        const { orgName: existingOrgName } = await buildOrgContext(supabaseAdmin, email);
        await queueAuthEmail(supabaseAdmin, {
          action: 'recovery',
          confirmationUrl: recoveryConfirmationUrl,
          email,
          orgName: existingOrgName || orgName,
          source: 'create-org-user',
        });
      }
    } else {
      // WAŻNE: nie używamy już supabaseAdmin.auth.admin.inviteUserByEmail(),
      // które polega na tym, że Supabase automatycznie wywoła Send Email
      // Hook — zaobserwowaliśmy, że to wywołanie czasem w ogóle się nie
      // uruchamia (brak jakiegokolwiek śladu w logach czy email_send_log),
      // bez żadnego błędu do złapania. Zamiast tego: generateLink tworzy
      // konto TAK SAMO jak inviteUserByEmail (type: 'invite' robi dokładnie
      // to samo), ale zwraca link zamiast polegać na automatycznej wysyłce —
      // a mail wysyłamy sami, tym samym sprawdzonym mechanizmem co
      // "Wyślij ponownie zaproszenie" w panelu użytkowników.
      const { data: inviteLink, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          data: {
            first_name: first_name || null,
            last_name: last_name || null,
            organization_id,
            org_role: targetRole,
            org_name: orgName,
            invited_by: 'super_admin',
          },
          redirectTo: `https://${ROOT_DOMAIN}/reset-password`,
        },
      });

      if (inviteError) throw inviteError;
      if (!inviteLink?.user?.id) throw new Error('Nie udało się utworzyć konta użytkownika');
      userId = inviteLink.user.id;
      wasInvited = true;

      const inviteConfirmationUrl = inviteLink.properties?.hashed_token
        ? `https://${ROOT_DOMAIN}/reset-password?token_hash=${encodeURIComponent(inviteLink.properties.hashed_token)}&type=invite`
        : inviteLink.properties?.action_link;

      if (!inviteConfirmationUrl) throw new Error('Nie udało się wygenerować linku zaproszenia');

      await queueAuthEmail(supabaseAdmin, {
        action: 'invite',
        confirmationUrl: inviteConfirmationUrl,
        email,
        orgName,
        invitedBy: 'super_admin',
        source: 'create-org-user',
      });
    }

    const displayName = `${first_name || ''} ${last_name || ''}`.trim() || email;
    await supabaseAdmin
      .from('profiles')
      .update({
        first_name: first_name || null,
        last_name: last_name || null,
        display_name: displayName,
        organization_id,
        status: 'active',
        // WAŻNE: NIE ustawiamy onboarding_completed na true tutaj — to
        // konto dopiero powstaje, użytkownik jeszcze nie widział ekranu
        // powitalnego. Ustawiane na true dopiero po jego przejściu
        // (patrz OnboardingWelcome.tsx). Wcześniej to pole było tu na
        // sztywno true, co czyniło ekran powitalny bezużytecznym — zawsze
        // wyglądałoby na "już ukończony".
        onboarding_completed: wasInvited ? false : true,
      })
      .eq('user_id', userId);

    await supabaseAdmin.from('organization_members').insert({
      organization_id,
      user_id: userId,
      org_role: targetRole,
    });

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
  } catch (error: unknown) {
    console.error('create-org-user error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
