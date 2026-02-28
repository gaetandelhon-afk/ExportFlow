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

interface InvoiceEmailProps {
  companyName: string
  invoiceNumber: string
  amount: string
  currency: string
  portalUrl: string
}

export function InvoiceEmail({ companyName, invoiceNumber, amount, currency, portalUrl }: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Invoice {invoiceNumber} from {companyName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Text style={heading}>Invoice {invoiceNumber}</Text>
            <Text style={text}>
              {/* TODO: Write final copy */}
              <strong>{companyName}</strong> has sent you invoice <strong>{invoiceNumber}</strong>.
            </Text>
            <Section style={amountBox}>
              <Text style={amountLabel}>Amount Due</Text>
              <Text style={amountValue}>{currency} {amount}</Text>
            </Section>
            <Button style={button} href={portalUrl}>
              View Invoice
            </Button>
            <Hr style={hr} />
            <Text style={footnote}>
              If you have questions about this invoice, please reply to this email.
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
const amountBox = { backgroundColor: '#f5f5f7', borderRadius: '8px', padding: '20px', textAlign: 'center' as const, margin: '16px 0' }
const amountLabel = { fontSize: '13px', color: '#86868b', margin: '0 0 4px 0' }
const amountValue = { fontSize: '28px', fontWeight: '600' as const, color: '#1d1d1f', margin: '0' }
const button = { backgroundColor: '#0071e3', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: '500' as const, display: 'inline-block' as const }
const hr = { borderColor: '#e5e5ea', margin: '24px 0' }
const footnote = { fontSize: '13px', color: '#86868b' }

export default InvoiceEmail
