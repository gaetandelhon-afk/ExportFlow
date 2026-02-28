import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
} from '@react-email/components'

interface CancellationEmailProps {
  companyName: string
  accessUntilDate: string
  pricingUrl: string
}

export function CancellationEmail({ companyName, accessUntilDate, pricingUrl }: CancellationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your ExportFlow subscription has been canceled</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Text style={heading}>Subscription Canceled</Text>
            <Text style={text}>
              {/* TODO: Write final copy */}
              Hi {companyName}, your ExportFlow subscription has been canceled.
              You still have access until <strong>{accessUntilDate}</strong>.
            </Text>
            <Text style={text}>
              After that date, your account will be deactivated. Your data will be retained
              for 3 years per GDPR requirements.
            </Text>
            <Button style={button} href={pricingUrl}>
              Resubscribe
            </Button>
            <Hr style={hr} />
            <Text style={footnote}>
              Changed your mind? You can resubscribe at any time to restore full access.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f5f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { maxWidth: '580px', margin: '0 auto', padding: '20px 0' }
const section = { backgroundColor: '#ffffff', borderRadius: '8px', padding: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
const heading = { fontSize: '24px', fontWeight: '600' as const, color: '#1d1d1f', marginBottom: '16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#3c3c43' }
const button = { backgroundColor: '#0071e3', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: '500' as const, display: 'inline-block' as const }
const hr = { borderColor: '#e5e5ea', margin: '24px 0' }
const footnote = { fontSize: '13px', color: '#86868b' }

export default CancellationEmail
