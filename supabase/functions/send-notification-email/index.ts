import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const typeConfig: Record<string, { color: string; emoji: string; label: string }> = {
  success: { color: '#22c55e', emoji: '✅', label: 'Sukces' },
  warning: { color: '#eab308', emoji: '⚠️', label: 'Ostrzeżenie' },
  error:   { color: '#ef4444', emoji: '🔴', label: 'Błąd' },
  info:    { color: '#3b82f6', emoji: 'ℹ️', label: 'Informacja' },
};

const categoryLabels: Record<string, string> = {
  activity: 'Aktywności',
  account: 'Konta',
  budget: 'Budżet',
  system: 'System',
};

function buildEmailHtml(title: string, description: string | null, type: string, category: string): string {
  const cfg = typeConfig[type] || typeConfig.info;
  const catLabel = categoryLabels[category] || 'System';

  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">MediaPlan CRM</td>
              <td align="right" style="color:rgba(255,255,255,0.7);font-size:12px;">${catLabel}</td>
            </tr>
          </table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <div style="display:inline-block;background-color:${cfg.color}15;color:${cfg.color};font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;margin-bottom:16px;">
            ${cfg.emoji} ${cfg.label}
          </div>
          <h1 style="margin:16px 0 8px;font-size:20px;font-weight:700;color:#18181b;line-height:1.3;">${title}</h1>
          ${description ? `<p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">${description}</p>` : ''}
          <a href="https://mediaplancrm.lovable.app" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
            Otwórz aplikację
          </a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">
            Otrzymujesz ten e-mail, ponieważ masz konto w MediaPlan CRM.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');

    const { record } = await req.json();
    if (!record) throw new Error('No record in payload');

    const { user_id, title, description, type, category } = record;

    // Get user email from auth.users via Supabase Admin API
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user_id}`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
    });

    if (!userRes.ok) throw new Error(`Failed to fetch user: ${userRes.status}`);
    const userData = await userRes.json();
    const email = userData.email;
    if (!email) throw new Error('User has no email');

    // Send email via Resend
    const html = buildEmailHtml(title, description, type || 'info', category || 'system');

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MediaPlan CRM <onboarding@resend.dev>',
        to: [email],
        subject: `${(typeConfig[type] || typeConfig.info).emoji} ${title}`,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('Resend error:', resendData);
      throw new Error(`Resend API error: ${JSON.stringify(resendData)}`);
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
