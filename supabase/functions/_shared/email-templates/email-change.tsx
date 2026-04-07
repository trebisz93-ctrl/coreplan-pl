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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
  orgName?: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
  orgName,
}: EmailChangeEmailProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Potwierdź zmianę adresu e-mail — CorePlan{orgName ? ` · ${orgName}` : ''}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}>
          <Text style={logoText}>CorePlan</Text>
          <Text style={tagline}>Platforma do zarządzania mediaplanami i budżetami</Text>
        </Section>

        <Section style={content}>
          <Section style={iconCircle}>
            <Text style={iconEmoji}>📧</Text>
          </Section>

          <Heading style={h1}>Zmiana adresu e-mail</Heading>

          <Text style={text}>
            Poprosiłeś o zmianę adresu e-mail powiązanego z Twoim kontem
            w CorePlan
            {orgName && (
              <>
                {' '}(organizacja: <strong style={{ color: '#D97A3A' }}>{orgName}</strong>)
              </>
            )}
            .
          </Text>

          <Section style={changeBox}>
            <Text style={changeLabel}>Obecny adres</Text>
            <Text style={changeValue}>{email}</Text>
            <Text style={changeArrow}>↓</Text>
            <Text style={changeLabel}>Nowy adres</Text>
            <Text style={changeValueNew}>{newEmail}</Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={confirmationUrl}>
              Potwierdź zmianę
            </Button>
          </Section>

          <Section style={warningBox}>
            <Text style={warningText}>
              🛡️ Jeśli to nie Ty inicjowałeś tę zmianę, natychmiast zabezpiecz
              swoje konto zmieniając hasło.
            </Text>
          </Section>
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

export default EmailChangeEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
}

const tagline = {
  color: 'rgba(255,255,255,0.75)',
  fontSize: '12px',
  margin: '4px 0 0',
  fontWeight: '400' as const,
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
  margin: '0 0 24px',
  textAlign: 'center' as const,
}

const changeBox = {
  backgroundColor: '#FAFAFA',
  border: '1px solid #E4E4E7',
  borderRadius: '10px',
  padding: '20px 24px',
  marginBottom: '28px',
  textAlign: 'center' as const,
}

const changeLabel = {
  fontSize: '11px',
  color: '#a1a1aa',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
  fontWeight: '600' as const,
}

const changeValue = { fontSize: '14px', color: '#71717a', margin: '0 0 8px' }
const changeArrow = { fontSize: '16px', color: '#D97A3A', margin: '4px 0' }

const changeValueNew = {
  fontSize: '14px',
  color: '#D97A3A',
  fontWeight: '600' as const,
  margin: '0',
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

const warningBox = {
  backgroundColor: '#FEF2F2',
  border: '1px solid #FECACA',
  borderRadius: '8px',
  padding: '14px 18px',
}

const warningText = {
  fontSize: '13px',
  color: '#991B1B',
  lineHeight: '1.5',
  margin: '0',
  textAlign: 'center' as const,
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
