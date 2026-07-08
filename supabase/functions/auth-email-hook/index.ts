import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { parseEmailWebhookPayload } from 'npm:@lovable.dev/email-js'
import { WebhookError, verifyWebhookRequest } from 'npm:@lovable.dev/webhooks-js'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-lovable-signature, x-lovable-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

// Template mapping
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared component signature; each template has its own props shape
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Configuration
const SITE_NAME = "coreplan-pl"
const SENDER_DOMAIN = "notify.coreplan.pl"
const ROOT_DOMAIN = "coreplan.pl"
const FROM_DOMAIN = "notify.coreplan.pl" // Domain shown in From address (may be root or sender subdomain)

// Sample data for preview mode ONLY (not used in actual email sending).
// URLs are baked in at scaffold time from the project's real data.
// The sample email uses a fixed placeholder (RFC 6761 .test TLD) so the Go backend
// can always find-and-replace it with the actual recipient when sending test emails,
// even if the project's domain has changed since the template was scaffolded.
const SAMPLE_PROJECT_URL = "https://coreplan-pl.lovable.app"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA: Record<string, object> = {
  signup: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  magiclink: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
    orgName: 'Danone',
  },
  recovery: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
    orgName: 'Danone',
  },
  invite: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
    orgName: 'Danone',
    invitedBy: 'super_admin',
  },
  email_change: {
    siteName: SITE_NAME,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
    orgName: 'Danone',
  },
  reauthentication: {
    token: '123456',
    orgName: 'Danone',
  },
}

// Preview endpoint handler - returns rendered HTML without sending email
async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: previewCorsHeaders })
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]

  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sampleData = SAMPLE_DATA[type] || {}
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))

  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// Webhook handler - verifies signature and sends email
async function handleWebhook(req: Request): Promise<Response> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')

  if (!apiKey) {
    console.error('LOVABLE_API_KEY not configured')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Verify signature + timestamp, then parse payload.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload shape is validated by parseEmailWebhookPayload
  let payload: any
  let run_id = ''
  try {
    const verified = await verifyWebhookRequest({
      req,
      secret: apiKey,
      parser: parseEmailWebhookPayload,
    })
    payload = verified.payload
    run_id = payload.run_id
  } catch (error) {
    if (error instanceof WebhookError) {
      switch (error.code) {
        case 'invalid_signature':
        case 'missing_timestamp':
        case 'invalid_timestamp':
        case 'stale_timestamp':
          console.error('Invalid webhook signature', { error: error.message })
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        case 'invalid_payload':
        case 'invalid_json':
          console.error('Invalid webhook payload', { error: error.message })
          return new Response(
            JSON.stringify({ error: 'Invalid webhook payload' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
      }
    }

    console.error('Webhook verification failed', { error })
    return new Response(
      JSON.stringify({ error: 'Invalid webhook payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!run_id) {
    console.error('Webhook payload missing run_id')
    return new Response(
      JSON.stringify({ error: 'Invalid webhook payload' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (payload.version !== '1') {
    console.error('Unsupported payload version', { version: payload.version, run_id })
    return new Response(
      JSON.stringify({ error: `Unsupported payload version: ${payload.version}` }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // The email action type is in payload.data.action_type (e.g., "signup", "recovery")
  // payload.type is the hook event type ("auth")
  const emailType = payload.data.action_type
  console.log('Received auth event', { emailType, email: payload.data.email, run_id })

  // DIAGNOSTYKA — tymczasowe logowanie do ustalenia rzeczywistego kształtu
  // payload.data (bez logowania wartości samego tokenu, tylko nazw pól i tego,
  // czy token_hash w ogóle istnieje). Do usunięcia po potwierdzeniu, że link
  // w mailu poprawnie korzysta z token_hash zamiast fallbackowego payload.data.url.
  console.log('DEBUG payload.data keys', Object.keys(payload.data ?? {}))
  console.log('DEBUG token_hash present?', typeof payload.data.token_hash, payload.data.token_hash ? `len=${payload.data.token_hash.length}` : 'BRAK')

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    console.error('Unknown email type', { emailType, run_id })
    return new Response(
      JSON.stringify({ error: `Unknown email type: ${emailType}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // WAŻNE — bezpieczeństwo przed skanerami linków (Proofpoint URL Defense,
  // Microsoft Safe Links i podobne): payload.data.url to gotowy link
  // Supabase (`/auth/v1/verify?token=...`), który ZUŻYWA token natychmiast
  // przy zwykłym GET, bez żadnej interakcji użytkownika. Firmowe filtry
  // pocztowe automatycznie "odwiedzają" każdy link w mailu w celu skanowania
  // pod kątem phishingu — to konsumuje token, zanim prawdziwy użytkownik
  // zdąży kliknąć. Efekt: "token wygasł" za każdym razem na skrzynkach
  // z takim filtrem (np. Danone/Microsoft 365 + Proofpoint).
  //
  // Poprawka: link w mailu prowadzi do WŁASNEJ strony z surowym token_hash
  // w query stringu (samo wejście na stronę nic nie konsumuje). Token jest
  // zamieniany na sesję dopiero w momencie, gdy użytkownik faktycznie
  // wypełni i wyśle formularz ustawienia hasła — czego żaden automatyczny
  // skaner linków nie robi.
  const ownConfirmationUrl = payload.data.token_hash
    ? `https://${ROOT_DOMAIN}/reset-password?token_hash=${encodeURIComponent(payload.data.token_hash)}&type=${encodeURIComponent(emailType)}`
    : payload.data.url // fallback, gdyby token_hash nie przyszedł w payloadzie

  console.log('DEBUG link source', payload.data.token_hash ? 'WŁASNY (token_hash obecny)' : 'FALLBACK payload.data.url (token_hash BRAK — to jest problem!)')

  // Lookup organization name and invite context for the user
  const supabaseLookup = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let orgName: string | undefined
  let invitedBy: string | undefined

  if (emailType !== 'signup') {
    try {
      // For invite emails, check user metadata first (set by create-org-member/create-org-user)
      if (emailType === 'invite') {
        const { data: { users } } = await supabaseLookup.auth.admin.listUsers({
          filter: { email: payload.data.email },
          page: 1,
          perPage: 1,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- listUsers types don't yet expose `filter`
        } as any)
        const authUser = users?.[0]
        if (authUser?.user_metadata) {
          orgName = authUser.user_metadata.org_name
          invitedBy = authUser.user_metadata.invited_by
        }
      }

      // Fallback: look up org from profiles → organization_members → organizations
      if (!orgName) {
        const { data: profile } = await supabaseLookup
          .from('profiles')
          .select('user_id, organization_id')
          .eq('display_name', payload.data.email)
          .limit(1)
          .single()

        if (profile?.organization_id) {
          const { data: org } = await supabaseLookup
            .from('organizations')
            .select('name')
            .eq('id', profile.organization_id)
            .single()
          if (org) orgName = org.name
        } else if (profile?.user_id) {
          const { data: membership } = await supabaseLookup
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', profile.user_id)
            .limit(1)
            .single()
          if (membership) {
            const { data: org } = await supabaseLookup
              .from('organizations')
              .select('name')
              .eq('id', membership.organization_id)
              .single()
            if (org) orgName = org.name
          }
        }
      }
    } catch (err) {
      console.warn('Could not resolve org name', { error: err, run_id })
    }
  }

  // Build template props from payload.data (HookData structure)
  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient: payload.data.email,
    confirmationUrl: ownConfirmationUrl,
    token: payload.data.token,
    email: payload.data.email,
    newEmail: payload.data.new_email,
    orgName,
    invitedBy,
  }

  // Render React Email to HTML and plain text
  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), {
    plainText: true,
  })

  // Enqueue email for async processing by the dispatcher (process-email-queue).
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const messageId = crypto.randomUUID()

  // Log pending BEFORE enqueue so we have a record even if enqueue crashes
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: emailType,
    recipient_email: payload.data.email,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'auth_emails',
    payload: {
      run_id,
      message_id: messageId,
      to: payload.data.email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: EMAIL_SUBJECTS[emailType] || 'Notification',
      html,
      text,
      purpose: 'transactional',
      label: emailType,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue auth email', { error: enqueueError, run_id, emailType })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: emailType,
      recipient_email: payload.data.email,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Auth email enqueued', { emailType, email: payload.data.email, run_id })

  return new Response(
    JSON.stringify({ success: true, queued: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Handle CORS preflight for main endpoint
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Route to preview handler for /preview path
  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  // Main webhook handler
  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
