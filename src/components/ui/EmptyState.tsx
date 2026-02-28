import Link from 'next/link'
import { LucideIcon, Plus } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    href: string
    label: string
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-12 text-center">
      <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-[#86868b]" />
      </div>
      <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">{title}</h3>
      <p className="text-[14px] text-[#86868b] mb-6">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-5 h-10 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          {action.label}
        </Link>
      )}
    </div>
  )
}