'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDistributor, CURRENCY_SYMBOLS } from '@/contexts/DistributorContext'
import { 
  FileText, Download, ShoppingCart, Trash2, Edit3,
  Clock, CheckCircle, XCircle, AlertCircle, X
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'var(--color-text-secondary)', bgColor: 'rgba(142, 142, 147, 0.1)', icon: FileText },
  sent: { label: 'Sent', color: 'var(--color-brand-primary)', bgColor: 'rgba(0, 113, 227, 0.1)', icon: Clock },
  accepted: { label: 'Accepted', color: 'var(--color-success)', bgColor: 'rgba(52, 199, 89, 0.1)', icon: CheckCircle },
  expired: { label: 'Expired', color: 'var(--color-warning)', bgColor: 'rgba(255, 149, 0, 0.1)', icon: AlertCircle },
  rejected: { label: 'Rejected', color: 'var(--color-error)', bgColor: 'rgba(255, 59, 48, 0.1)', icon: XCircle },
}

export default function MyQuotesPage() {
  const router = useRouter()
  const { 
    quotes, 
    cart,
    convertQuoteToOrder, 
    loadQuoteForModification,
    deleteQuote,
    user,
    addresses,
    getDisplayPrice,
    getInvoicePrice,
    displayCurrencySymbol,
    invoiceCurrencySymbol
  } = useDistributor()

  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [showModifyModal, setShowModifyModal] = useState<string | null>(null)

  const handleConvertToOrder = (quoteId: string) => {
    convertQuoteToOrder(quoteId)
    router.push('/checkout')
  }

  const handleModify = (quoteId: string) => {
    // If cart has items, show modal to ask user
    if (cart.length > 0) {
      setShowModifyModal(quoteId)
    } else {
      // Cart is empty, just load the quote
      loadQuoteForModification(quoteId, 'replace')
      router.push('/cart')
    }
  }

  const handleModifyConfirm = (mode: 'replace' | 'merge') => {
    if (showModifyModal) {
      loadQuoteForModification(showModifyModal, mode)
      setShowModifyModal(null)
      router.push('/cart')
    }
  }

  const handleDownloadPdf = async (quote: typeof quotes[0]) => {
    if (!user) return
    
    setDownloadingId(quote.id)
    
    const { generateQuotePdf } = await import('@/lib/generatePdf')
    
    const shippingAddress = addresses.find(a => a.id === quote.shippingAddressId) || null
    const billingAddress = addresses.find(a => a.id === quote.billingAddressId) || null

    generateQuotePdf({
      items: quote.items,
      user,
      shippingAddress,
      billingAddress,
      shippingMethod: quote.shippingMethod,
      poNumber: quote.poNumber,
      requestedDate: quote.requestedDate,
      instructions: quote.instructions,
      getDisplayPrice,
      getInvoicePrice,
      displayCurrencySymbol,
      invoiceCurrencySymbol
    })
    
    setDownloadingId(null)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this quote?')) {
      deleteQuote(id)
    }
  }

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date()

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 
            className="text-[28px] font-semibold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            My Quotes
          </h1>
          <p 
            className="text-[15px] mt-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
          </p>
        </div>

        {quotes.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-[15px] mb-2" style={{ color: 'var(--color-text-primary)' }}>
              No quotes yet
            </p>
            <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              Generate a quote from your cart to see it here
            </p>
            <Link href="/catalog" className="btn-primary">
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {quotes.map((quote) => {
              const status = statusConfig[quote.status]
              const StatusIcon = status.icon
              const expired = isExpired(quote.expiresAt) && quote.status === 'sent'
              const itemCount = quote.items.reduce((sum, item) => sum + item.quantity, 0)
              const displaySymbol = CURRENCY_SYMBOLS[quote.displayCurrency] || '¥'
              const invoiceSymbol = CURRENCY_SYMBOLS[quote.invoiceCurrency] || '€'
              const canModify = quote.status === 'sent' && !expired

              return (
                <div key={quote.id} className="card p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p 
                          className="text-[15px] font-semibold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {quote.number}
                        </p>
                        <span 
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ 
                            backgroundColor: expired ? statusConfig.expired.bgColor : status.bgColor, 
                            color: expired ? statusConfig.expired.color : status.color 
                          }}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {expired ? 'Expired' : status.label}
                        </span>
                      </div>
                      <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                        Created {new Date(quote.createdAt).toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                        {quote.poNumber && ` · PO: ${quote.poNumber}`}
                      </p>
                      {!expired && quote.status === 'sent' && (
                        <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                          Valid until {new Date(quote.expiresAt).toLocaleDateString('en-GB')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {displaySymbol}{formatNumber(quote.subtotalDisplay)}
                      </p>
                      {quote.displayCurrency !== quote.invoiceCurrency && (
                        <p className="text-[12px]" style={{ color: 'var(--color-brand-primary)' }}>
                          ≈ {invoiceSymbol}{formatNumber(quote.subtotalInvoice)} {quote.invoiceCurrency}
                        </p>
                      )}
                      <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {itemCount} units
                      </p>
                    </div>
                  </div>

                  <div 
                    className="py-3 mb-4"
                    style={{ borderTop: '1px solid rgba(210, 210, 215, 0.3)' }}
                  >
                    <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {quote.items.slice(0, 3).map(item => `${item.quantity}× ${item.product.nameEn}`).join(', ')}
                      {quote.items.length > 3 && ` +${quote.items.length - 3} more`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex gap-2 flex-wrap">
                      {canModify && (
                        <>
                          <button
                            onClick={() => handleConvertToOrder(quote.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white transition-colors hover:opacity-90"
                            style={{ backgroundColor: 'var(--color-success)' }}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            Confirm & Order
                          </button>

                          <button
                            onClick={() => handleModify(quote.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
                            style={{ 
                              backgroundColor: 'rgba(255, 149, 0, 0.1)',
                              color: 'var(--color-warning)'
                            }}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Modify
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => handleDownloadPdf(quote)}
                        disabled={downloadingId === quote.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
                        style={{ 
                          backgroundColor: 'rgba(0, 113, 227, 0.1)',
                          color: 'var(--color-brand-primary)'
                        }}
                      >
                        <Download className={`w-3.5 h-3.5 ${downloadingId === quote.id ? 'animate-pulse' : ''}`} />
                        {downloadingId === quote.id ? 'Generating...' : 'Download PDF'}
                      </button>

                      {quote.status !== 'accepted' && (
                        <button
                          onClick={() => handleDelete(quote.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
                          style={{ 
                            backgroundColor: 'rgba(255, 59, 48, 0.1)',
                            color: 'var(--color-error)'
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      {/* Modify Modal */}
      {showModifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 
                className="text-[17px] font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Modify Quote
              </h3>
              <button onClick={() => setShowModifyModal(null)}>
                <X className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>
            
            <p className="text-[14px] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Your cart currently has <strong>{cartItemCount} items</strong>. What would you like to do?
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleModifyConfirm('replace')}
                className="w-full p-4 rounded-xl text-left transition-all hover:shadow-md"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid rgba(210, 210, 215, 0.3)'
                }}
              >
                <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Replace cart
                </p>
                <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                  Clear current cart and load only the quote items
                </p>
              </button>
              
              <button
                onClick={() => handleModifyConfirm('merge')}
                className="w-full p-4 rounded-xl text-left transition-all hover:shadow-md"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid rgba(210, 210, 215, 0.3)'
                }}
              >
                <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Merge with cart
                </p>
                <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                  Add quote items to your existing cart
                </p>
              </button>
            </div>
            
            <button
              onClick={() => setShowModifyModal(null)}
              className="w-full mt-4 text-[13px] font-medium py-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}