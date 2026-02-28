import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AdminNavigation from '@/components/AdminNavigation'
import AdminLayout from '@/components/AdminLayout'
import { BrandingProvider } from '@/contexts/BrandingContext'
import { PreviewProviderWrapper } from '@/components/providers/PreviewProviderWrapper'
import { getAuthenticatedUser } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  if (!user.companyId) {
    redirect('/onboarding')
  }

  // Get pending orders count for badge
  let pendingOrdersCount = 0
  let overduePaymentsCount = 0
  
  if (user.companyId) {
    try {
      pendingOrdersCount = await prisma.order.count({
        where: {
          companyId: user.companyId,
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
              companyId: user.companyId,
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
              companyId: user.companyId,
            },
          },
        })
      }
    } catch {
      // Ignore errors, just show 0
    }
  }

  return (
    <BrandingProvider>
      <PreviewProviderWrapper>
        <div className="min-h-screen bg-[#f5f5f7]">
          {/* Fixed Sidebar */}
          <AdminNavigation 
            companyName={user.companyName ?? 'ExportFlow'} 
            userName={user.fullName ?? user.email}
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
