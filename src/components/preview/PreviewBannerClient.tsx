'use client'

import { usePreview } from '@/contexts/PreviewContext'
import { Eye, X, User, DollarSign, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export function PreviewBannerClient() {
  const { isPreviewMode, previewCustomer, endPreview } = usePreview()
  
  if (!isPreviewMode || !previewCustomer) return null
  
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-[#ff9500] text-white print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-medium">
            <Eye className="w-4 h-4" />
            Preview Mode
          </div>
          
          <div className="h-4 w-px bg-white/30" />
          
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4" />
            <span className="font-medium">{previewCustomer.name}</span>
            <span className="opacity-75">({previewCustomer.email})</span>
          </div>
          
          {previewCustomer.priceType && (
            <>
              <div className="h-4 w-px bg-white/30" />
              <div className="flex items-center gap-1 text-sm">
                <DollarSign className="w-4 h-4" />
                <span>Price: {previewCustomer.priceType}</span>
              </div>
            </>
          )}
          
          {previewCustomer.currency && (
            <span className="text-sm px-2 py-0.5 bg-white/20 rounded">
              {previewCustomer.currency}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-75">
            You are viewing this portal as this customer
          </span>
          <Link
            href="/preview"
            className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition"
          >
            <User className="w-4 h-4" />
            Change customer
          </Link>
          <button
            onClick={endPreview}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </button>
        </div>
      </div>
    </div>
  )
}
