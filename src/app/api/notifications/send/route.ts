import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { sendNotificationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      to, 
      subject, 
      title, 
      message, 
      actionUrl, 
      actionText,
      companyName 
    } = body

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, message' },
        { status: 400 }
      )
    }

    await sendNotificationEmail({
      to,
      subject,
      title: title || subject,
      message,
      actionUrl,
      actionText,
      companyName
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification send error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send notification' },
      { status: 500 }
    )
  }
}
