import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function escapeHtml(input: unknown): string {
  const s = String(input ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function encodeUriPart(input: string): string {
  return encodeURIComponent(input);
}

function buildDemoEmailHtml(name: string, email: string, company: string | null): string {
  const sName = escapeHtml(name);
  const sEmail = escapeHtml(email);
  const sCompany = company ? escapeHtml(company) : null;
  const mailtoEmail = encodeUriPart(email);
  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:linear-gradient(135deg,#C77745,#B85F30);padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">CorePlan</td>
              <td align="right" style="color:rgba(255,255,255,0.7);font-size:12px;">Nowe zgłoszenie demo</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="display:inline-block;background-color:#C7774515;color:#C77745;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;margin-bottom:16px;">
            🔔 Nowy lead
          </div>
          <h1 style="margin:16px 0 8px;font-size:20px;font-weight:700;color:#18181b;line-height:1.3;">Nowe zgłoszenie demo</h1>
          <table style="width:100%;border-collapse:collapse;margin:16px 0 24px;">
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#71717a;border-bottom:1px solid #f4f4f5;">Imię i nazwisko</td>
              <td style="padding:8px 0;font-size:14px;color:#18181b;font-weight:500;border-bottom:1px solid #f4f4f5;text-align:right;">${sName}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#71717a;border-bottom:1px solid #f4f4f5;">Email</td>
              <td style="padding:8px 0;font-size:14px;color:#18181b;font-weight:500;border-bottom:1px solid #f4f4f5;text-align:right;">
                <a href="mailto:${mailtoEmail}" style="color:#C77745;text-decoration:none;">${sEmail}</a>
              </td>
            </tr>
            ${sCompany ? `<tr>
              <td style="padding:8px 0;font-size:13px;color:#71717a;">Firma</td>
              <td style="padding:8px 0;font-size:14px;color:#18181b;font-weight:500;text-align:right;">${sCompany}</td>
            </tr>` : ''}
          </table>
          <a href="mailto:${mailtoEmail}?subject=CorePlan%20Demo" style="display:inline-block;background-color:#C77745;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
            Odpowiedz klientowi
          </a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">
            Automatyczne powiadomienie z formularza demo na coreplan.pl
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { name, email, company } = await req.json();
    if (!name || !email) throw new Error('Missing name or email');
    // Basic validation to reduce injection surface
    const nameStr = String(name).slice(0, 200);
    const emailStr = String(email).slice(0, 320);
    const companyStr = company ? String(company).slice(0, 200) : null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get notification email from app_settings
    const settingsRes = await fetch(
      `${supabaseUrl}/rest/v1/app_settings?key=eq.demo_notification_email&select=value`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
      }
    );
    const settingsData = await settingsRes.json();
    const notifyEmail = settingsData?.[0]?.value || 'admin@coreplan.pl';

    // Send email via Resend
    const html = buildDemoEmailHtml(nameStr, emailStr, companyStr);

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CorePlan <noreply@neovir.pl>',
        to: [notifyEmail],
        subject: `🔔 Nowe zgłoszenie demo: ${nameStr}`,
        html,
        reply_to: emailStr,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('Resend error:', resendData);
      throw new Error(`Resend API error: ${JSON.stringify(resendData)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
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
