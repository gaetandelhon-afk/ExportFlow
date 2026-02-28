import { OrderStatus } from '@/types'

const statusConfig: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: 'bg-[#86868b]/10', text: 'text-[#86868b]', label: 'Draft' },
  PENDING: { bg: 'bg-[#ff9500]/10', text: 'text-[#ff9500]', label: 'Pending' },
  CONFIRMED: { bg: 'bg-[#0071e3]/10', text: 'text-[#0071e3]', label: 'Confirmed' },
  PREPARING: { bg: 'bg-[#5856d6]/10', text: 'text-[#5856d6]', label: 'Preparing' },
  READY: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]', label: 'Ready' },
  SHIPPED: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]', label: 'Shipped' },
  DELIVERED: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]', label: 'Delivered' },
  CANCELLED: { bg: 'bg-[#ff3b30]/10', text: 'text-[#ff3b30]', label: 'Cancelled' },
}

interface StatusBadgeProps {
  status: OrderStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.DRAFT
  
  return (
    <span 
      className={`
        ${config.bg} ${config.text} 
        ${size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-[12px] px-2.5 py-1'} 
        font-medium rounded-md inline-block
      `}
    >
      {config.label}
    </span>
  )
}