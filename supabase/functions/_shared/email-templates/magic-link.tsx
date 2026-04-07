/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Twój link do logowania — CorePlan</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}>
          <Text style={logoText}>CorePlan</Text>
        </Section>

        <Section style={content}>
          <Section style={iconCircle}>
            <Text style={iconEmoji}>🔗</Text>
          </Section>

          <Heading style={h1}>Twój link do logowania</Heading>

          <Text style={text}>
            Kliknij przycisk poniżej, aby zalogować się do CorePlan.
            Link wygaśnie za kilka minut.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={confirmationUrl}>
              Zaloguj się
            </Button>
          </Section>

          <Text style={hint}>
            Jeśli nie prosiłeś o ten link, możesz bezpiecznie zignorować
            tę wiadomość.
          </Text>
        </Section>

        <Section style={footer}>
          <Hr style={divider} />
          <Text style={footerText}>
            © 2025 CorePlan · Platforma do zarządzania mediaplanami i budżetami
          </Text>
          <Text style={footerLinkWrap}>
            <Link href="https://coreplan.pl" style={footerAnchor}>
              coreplan.pl
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
}

const wrapper = { maxWidth: '520px', margin: '0 auto', padding: '0' }

const header = {
  background: 'linear-gradient(135deg, #D97A3A 0%, #B84E18 100%)',
  padding: '28px 32px',
  borderRadius: '12px 12px 0 0',
  textAlign: 'center' as const,
}

const logoText = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '700' as const,
  letterSpacing: '-0.5px',
  margin: '0',
}

const content = { padding: '40px 32px 32px', backgroundColor: '#ffffff' }
const iconCircle = { textAlign: 'center' as const, marginBottom: '20px' }
const iconEmoji = { fontSize: '40px', margin: '0', lineHeight: '1' }

const h1 = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: '#18181b',
  margin: '0 0 16px',
  lineHeight: '1.3',
  textAlign: 'center' as const,
}

const text = {
  fontSize: '15px',
  color: '#52525b',
  lineHeight: '1.65',
  margin: '0 0 28px',
  textAlign: 'center' as const,
}

const buttonContainer = { textAlign: 'center' as const, margin: '0 0 28px' }

const button = {
  background: 'linear-gradient(135deg, #D97A3A 0%, #C56A2E 100%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '10px',
  padding: '14px 36px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  boxShadow: '0 2px 8px rgba(217, 122, 58, 0.35)',
}

const hint = {
  fontSize: '13px',
  color: '#a1a1aa',
  lineHeight: '1.5',
  textAlign: 'center' as const,
  margin: '0',
}

const footer = {
  padding: '0 32px 28px',
  backgroundColor: '#ffffff',
  borderRadius: '0 0 12px 12px',
}

const divider = { borderTop: '1px solid #f4f4f5', margin: '0 0 20px' }

const footerText = {
  fontSize: '12px',
  color: '#a1a1aa',
  textAlign: 'center' as const,
  margin: '0 0 4px',
  lineHeight: '1.5',
}

const footerLinkWrap = { textAlign: 'center' as const, margin: '0' }

const footerAnchor = {
  fontSize: '12px',
  color: '#D97A3A',
  textDecoration: 'none',
}
