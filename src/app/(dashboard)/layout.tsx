import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AdminNavigation from '@/components/AdminNavigation'
import AdminLayout from '@/components/AdminLayout'
import { BrandingProvider } from '@/contexts/BrandingContext'
import { PreviewProviderWrapper } from '@/components/providers/PreviewProviderWrapper'
import { getDashboardSession, getAuthenticatedUser } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Use getDashboardSession() first (reads JWT claims — no external API call).
  // Fall back to getAuthenticatedUser() (currentUser() — needs CLERK_SECRET_KEY)
  // only to get display info. Both are wrapped in try-catch.
  const session = await getDashboardSession()

  if (!session) {
    redirect('/sign-in')
  }

  const companyId = session.companyId

  // Try to get display info (non-critical — graceful fallback if unavailable)
  let companyName = 'ExportFlow'
  let userName = 'User'
  try {
    const user = await getAuthenticatedUser()
    if (user) {
      companyName = user.companyName ?? 'ExportFlow'
      userName = user.fullName ?? user.email ?? 'User'
    }
  } catch {
    // Display info unavailable — use defaults
  }

  // Get pending orders count for badge
  let pendingOrdersCount = 0
  let overduePaymentsCount = 0
  
  try {
    pendingOrdersCount = await prisma.order.count({
      where: {
        companyId,
        status: 'PENDING'
      }
    })
  } catch {
    // Ignore errors, just show 0
  }

  try {
    // Get overdue invoices count for payments badge
    const now = new Date()
    // Try with paymentAlertsMuted filter first
    try {
      overduePaymentsCount = await prisma.invoice.count({
        where: {
          status: { in: ['sent', 'overdue'] },
          type: 'INVOICE',
          dueDate: { lt: now },
          order: {
            companyId,
            customer: {
              paymentAlertsMuted: false,
            },
          },
        },
      })
    } catch {
      // If paymentAlertsMuted doesn't exist, count without filter
      overduePaymentsCount = await prisma.invoice.count({
        where: {
          status: { in: ['sent', 'overdue'] },
          type: 'INVOICE',
          dueDate: { lt: now },
          order: {
            companyId,
          },
        },
      })
    }
  } catch {
    // Ignore errors, just show 0
  }

  return (
    <BrandingProvider>
      <PreviewProviderWrapper>
        <div className="min-h-screen bg-[#f5f5f7]">
          {/* Fixed Sidebar */}
          <AdminNavigation 
            companyName={companyName} 
            userName={userName}
            pendingOrdersCount={pendingOrdersCount}
            overduePaymentsCount={overduePaymentsCount}
          />
          
          {/* Main Content with proper offset */}
          <AdminLayout>
            {children}
          </AdminLayout>
        </div>
      </PreviewProviderWrapper>
    </BrandingProvider>
  )
}
