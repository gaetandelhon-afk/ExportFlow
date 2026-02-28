import Link from 'next/link'
import { ChevronLeft, LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backLink?: {
    href: string
    label: string
  }
  action?: {
    href: string
    label: string
    icon?: LucideIcon
  }
}

export function PageHeader({ title, subtitle, backLink, action }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {backLink && (
        <Link 
          href={backLink.href} 
          className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {backLink.label}
        </Link>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[15px] text-[#86868b] mt-1">{subtitle}</p>
          )}
        </div>
        
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-4 h-10 rounded-xl transition-colors"
          >
            {action.icon && <action.icon className="w-4 h-4" />}
            {action.label}
          </Link>
        )}
      </div>
    </div>
  )
}