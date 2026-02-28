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

interface WelcomeEmailProps {
  companyName: string
  slug: string
  dashboardUrl: string
}

export function WelcomeEmail({ companyName, slug, dashboardUrl }: WelcomeEmailProps) {
  const portalUrl = `https://${slug}.exportflow.io`

  return (
    <Html>
      <Head />
      <Preview>Welcome to ExportFlow - Your account is ready</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Text style={heading}>Welcome to ExportFlow!</Text>
            <Text style={text}>
              {/* TODO: Write final copy */}
              Hi there! Your company <strong>{companyName}</strong> is now set up on ExportFlow.
              Your 14-day free trial has started.
            </Text>
            <Text style={text}>
              Your portal URL: <strong>{portalUrl}</strong>
            </Text>
            <Text style={text}>
              Share this URL with your distributors so they can browse your catalog and place orders.
            </Text>
            <Button style={button} href={dashboardUrl}>
              Go to Dashboard
            </Button>
            <Hr style={hr} />
            <Text style={text}>
              {/* TODO: Write final copy */}
              Next steps: invite your team members, upload your product catalog, and invite your first distributor.
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

export default WelcomeEmail
