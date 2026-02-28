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

interface TrialEmailProps {
  companyName: string
  dayNumber: number
  daysRemaining: number
  pricingUrl: string
}

const SUBJECT_MAP: Record<number, string> = {
  0: 'Your trial has started',
  1: 'Quick tip to get the most out of ExportFlow',
  3: 'Have you invited your first distributor?',
  8: 'You are halfway through your trial',
  12: 'Only 2 days left in your trial',
  14: 'Your trial has ended',
}

export function getTrialEmailSubject(dayNumber: number): string {
  return SUBJECT_MAP[dayNumber] || `Day ${dayNumber} of your ExportFlow trial`
}

export function TrialEmail({ companyName, dayNumber, daysRemaining, pricingUrl }: TrialEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{getTrialEmailSubject(dayNumber)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Text style={heading}>{getTrialEmailSubject(dayNumber)}</Text>

            {dayNumber === 0 && (
              <Text style={text}>
                {/* TODO: Write final copy */}
                Welcome, {companyName}! Your 14-day trial has started. Here&apos;s how to get started
                with ExportFlow and make the most of your trial period.
              </Text>
            )}

            {dayNumber === 1 && (
              <Text style={text}>
                {/* TODO: Write final copy */}
                Day 1 tip: Upload your product catalog and set up your price tiers. This is the foundation
                for everything else in ExportFlow.
              </Text>
            )}

            {dayNumber === 3 && (
              <Text style={text}>
                {/* TODO: Write final copy */}
                Have you invited your first distributor yet? Share your portal URL and let them browse
                your catalog. {daysRemaining} days remaining in your trial.
              </Text>
            )}

            {dayNumber === 8 && (
              <Text style={text}>
                {/* TODO: Write final copy */}
                You are halfway through your trial. {daysRemaining} days remaining. Make sure you have
                explored all the features ExportFlow has to offer.
              </Text>
            )}

            {dayNumber === 12 && (
              <Text style={text}>
                {/* TODO: Write final copy */}
                Only {daysRemaining} days left! Choose a plan now to keep your data and continue using
                ExportFlow without interruption.
              </Text>
            )}

            {dayNumber === 14 && (
              <Text style={text}>
                {/* TODO: Write final copy */}
                Your trial has ended. Subscribe now to keep access to your data and continue managing
                your orders with ExportFlow.
              </Text>
            )}

            <Button style={button} href={pricingUrl}>
              {dayNumber >= 12 ? 'Choose a Plan' : 'Explore ExportFlow'}
            </Button>

            <Hr style={hr} />
            <Text style={footnote}>
              {daysRemaining > 0
                ? `${daysRemaining} days remaining in your trial.`
                : 'Your trial has ended.'}
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

export default TrialEmail
