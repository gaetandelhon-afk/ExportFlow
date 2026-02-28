'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { AlertTriangle, X, Loader2 } from 'lucide-react'

export function ImpersonationBanner() {
  const { user } = useUser()
  const [exiting, setExiting] = useState(false)

  const impersonating = user?.publicMetadata?.impersonating as
    | { companyName: string; companySlug: string }
    | undefined

  if (!impersonating) return null

  const handleExit = async () => {
    setExiting(true)
    try {
      await fetch('/api/admin/impersonate', { method: 'DELETE' })
      window.location.href = '/admin/companies'
    } catch {
      setExiting(false)
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-[#5856d6] text-white px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-[13px] font-medium">
            Impersonating <strong>{impersonating.companyName}</strong> ({impersonating.companySlug}.exportflow.io)
          </span>
        </div>
        <button
          onClick={handleExit}
          disabled={exiting}
          className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[12px] font-medium transition-colors"
        >
          {exiting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
          Exit Impersonation
        </button>
      </div>
    </div>
  )
}
