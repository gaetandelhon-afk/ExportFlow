'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AddressSelector from '@/components/AddressSelector'
import { useDistributor } from '@/contexts/DistributorContext'
import { 
  ChevronLeft, Ship, Plane, Building2, MoreHorizontal, Package, 
  FileText, Check, AlertCircle, Loader2
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'

const shippingIcons: Record<string, typeof Ship> = {
  Ship: Ship,
  Plane: Plane,
  Building2: Building2,
  MoreHorizontal: MoreHorizontal,
}

// Loading component for Suspense
function CheckoutLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
    </div>
  )
}

// Main checkout content
function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isQuoteRequest = searchParams.get('quote') === 'true'
  
  const { 
    cart, 
    getCartTotal,
    getCartTotalInvoice,
    getCartItemCount,
    checkout,
    updateCheckout,
    resetCheckout,
    clearCart,
    addresses,
    user,
    config,
    getDisplayPrice,
    getInvoicePrice,
    displayCurrencySymbol,
    invoiceCurrencySymbol,
    saveQuote,
    createOrder
  } = useDistributor()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [savedQuoteNumber, setSavedQuoteNumber] = useState<string | null>(null)
  const [savedOrderNumber, setSavedOrderNumber] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [shippingDetails, setShippingDetails] = useState('')

  const shippingMethods = config?.shipping ?? []
  const subtotalDisplay = getCartTotal()
  const subtotalInvoice = getCartTotalInvoice()
  const itemCount = getCartItemCount()
  const showDualCurrency = user?.displayCurrency !== user?.invoiceCurrency

  const formatDisplay = (amount: number) => `${displayCurrencySymbol}${formatNumber(amount)}`
  const formatInvoice = (amount: number) => `${invoiceCurrencySymbol}${formatNumber(amount)}`

  useEffect(() => {
    if (addresses && addresses.length > 0) {
      const defaultAddress = addresses.find(a => a.isDefault)
      if (defaultAddress && !checkout?.shippingAddressId) {
        updateCheckout({ 
          shippingAddressId: defaultAddress.id,
          billingAddressId: defaultAddress.id
        })
      }
    }
  }, [addresses, checkout?.shippingAddressId, updateCheckout])

  const selectedShippingMethod = shippingMethods.find(m => m.id === checkout?.shippingMethod)

  const validateOrder = (): string[] => {
    const validationErrors: string[] = []
    if (!cart || cart.length === 0) validationErrors.push('Your cart is empty')
    if (!checkout?.shippingAddressId) validationErrors.push('Please select a shipping address')
    if (!checkout?.billingAddressId) validationErrors.push('Please select a billing address')
    if (selectedShippingMethod?.requiresDetails && !shippingDetails.trim()) {
      validationErrors.push('Please specify shipping details')
    }
    return validationErrors
  }

  const handleSubmit = async () => {
    const validationErrors = validateOrder()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    setErrors([])

    await new Promise(resolve => setTimeout(resolve, 1000))

    if (isQuoteRequest && user) {
      // Save quote to system
      const quote = saveQuote({
        status: 'sent',
        items: [...cart],
        subtotalDisplay,
        subtotalInvoice,
        displayCurrency: user.displayCurrency,
        invoiceCurrency: user.invoiceCurrency,
        shippingMethod: shippingMethods.find(m => m.id === checkout?.shippingMethod)?.name || '',
        shippingAddressId: checkout?.shippingAddressId ?? null,
        billingAddressId: checkout?.billingAddressId ?? null,
        poNumber: checkout?.poNumber,
        requestedDate: checkout?.requestedDate,
        instructions: checkout?.instructions,
      })

      setSavedQuoteNumber(quote.number)

      // Generate and download PDF
      const { generateQuotePdf } = await import('@/lib/generatePdf')
      
      const shippingAddress = addresses.find(a => a.id === checkout?.shippingAddressId) || null
      const billingAddress = addresses.find(a => a.id === checkout?.billingAddressId) || null
      const methodName = shippingMethods.find(m => m.id === checkout?.shippingMethod)?.name || ''

      generateQuotePdf({
        items: cart,
        user,
        shippingAddress,
        billingAddress,
        shippingMethod: methodName,
        poNumber: checkout?.poNumber,
        requestedDate: checkout?.requestedDate,
        instructions: checkout?.instructions,
        getDisplayPrice,
        getInvoicePrice,
        displayCurrencySymbol,
        invoiceCurrencySymbol
      })
    } else if (user) {
      // Create actual order
      const order = createOrder({
        status: 'pending',
        items: cart.map(item => ({
          id: item.product.id,
          ref: item.product.ref,
          name: item.product.nameEn,
          quantity: item.quantity,
          price: getInvoicePrice(item.product) + (item.optionsPriceModifier || 0),
          selectedOptions: item.selectedOptions,
          optionsPriceModifier: item.optionsPriceModifier,
        })),
        subtotal: subtotalInvoice,
        shipping: 0,
        total: subtotalInvoice,
        currency: user.invoiceCurrency,
        shippingMethod: shippingMethods.find(m => m.id === checkout?.shippingMethod)?.name || '',
        shippingAddressId: checkout?.shippingAddressId ?? null,
        billingAddressId: checkout?.billingAddressId ?? null,
        poNumber: checkout?.poNumber,
        requestedDate: checkout?.requestedDate,
        instructions: checkout?.instructions,
        fromQuoteId: checkout?.fromQuoteId,
      })

      setSavedOrderNumber(order.number)
    }

    setSubmitted(true)
    clearCart()
    resetCheckout()
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)' }}
        >
            <Check className="w-10 h-10" style={{ color: 'var(--color-success)' }} />
          </div>
          <h1 
            className="text-[28px] font-semibold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {isQuoteRequest ? 'Quote Generated!' : 'Order Placed Successfully!'}
          </h1>
          <p 
            className="text-[15px] mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {isQuoteRequest 
              ? `Quote ${savedQuoteNumber} has been saved and downloaded.`
              : `Order ${savedOrderNumber} has been placed successfully.`}
          </p>
          {isQuoteRequest && (
            <p 
              className="text-[13px] mb-8"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              You can view and confirm this quote from your "My Quotes" page.
            </p>
          )}
          {!isQuoteRequest && (
            <p 
              className="text-[13px] mb-8"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              You will receive a confirmation email shortly.
            </p>
          )}
          <div className="flex gap-3 justify-center flex-wrap">
            {isQuoteRequest ? (
              <>
                <Link href="/my-quotes" className="btn-primary">View My Quotes</Link>
                <Link href="/catalog" className="btn-secondary">Continue Shopping</Link>
              </>
            ) : (
              <>
                <Link href="/my-orders" className="btn-primary">View My Orders</Link>
                <Link href="/catalog" className="btn-secondary">Continue Shopping</Link>
              </>
            )}
          </div>
      </div>
    )
  }

  if (!cart || cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <Package className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
        <h1 className="text-[20px] font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Your cart is empty
        </h1>
        <Link href="/catalog" className="btn-primary mt-4">Browse Catalog</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Link 
        href="/cart"
        className="inline-flex items-center gap-1 text-[13px] mb-6"
        style={{ color: 'var(--color-brand-primary)' }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Cart
      </Link>

        <div className="mb-8">
          <h1 
            className="text-[28px] font-semibold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {isQuoteRequest ? 'Generate Quote' : 'Checkout'}
          </h1>
        </div>

        {errors.length > 0 && (
          <div 
            className="p-4 rounded-xl mb-6 flex items-start gap-3"
            style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)' }}
          >
            <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--color-error)' }} />
            <ul className="text-[13px]" style={{ color: 'var(--color-error)' }}>
              {errors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            <div className="card p-6">
              <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Shipping Method
              </h2>
              <div className="space-y-3">
                {shippingMethods.filter(m => m.enabled).map((method) => {
                  const Icon = shippingIcons[method.icon] || MoreHorizontal
                  const isSelected = checkout?.shippingMethod === method.id
                  return (
                    <div key={method.id}>
                      <button
                        onClick={() => updateCheckout({ shippingMethod: method.id })}
                        className="w-full text-left p-4 rounded-xl transition-all flex items-center gap-4"
                        style={{ 
                          backgroundColor: isSelected ? 'rgba(0, 113, 227, 0.05)' : 'var(--color-bg-secondary)',
                          border: isSelected ? '2px solid var(--color-brand-primary)' : '1px solid rgba(210, 210, 215, 0.3)'
                        }}
                      >
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: isSelected ? 'var(--color-brand-primary)' : 'var(--color-bg-tertiary)' }}
                        >
                          <Icon className="w-5 h-5" style={{ color: isSelected ? 'white' : 'var(--color-text-secondary)' }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {method.name}
                          </p>
                          <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                            {method.description}
                          </p>
                        </div>
                        {isSelected && <Check className="w-5 h-5" style={{ color: 'var(--color-brand-primary)' }} />}
                      </button>
                      
                      {isSelected && method.requiresDetails && (
                        <div className="mt-3 ml-14">
                          <textarea
                            placeholder="Please specify your shipping requirements..."
                            value={shippingDetails}
                            onChange={(e) => setShippingDetails(e.target.value)}
                            rows={3}
                            className="input-field resize-none text-[13px] w-full"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card p-6">
              <AddressSelector
                selectedId={checkout?.shippingAddressId ?? null}
                onSelect={(id) => updateCheckout({ shippingAddressId: id })}
                type="shipping"
              />
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="sameAsShipping"
                  checked={checkout?.billingAddressId === checkout?.shippingAddressId}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateCheckout({ billingAddressId: checkout?.shippingAddressId ?? null })
                    } else {
                      updateCheckout({ billingAddressId: null })
                    }
                  }}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="sameAsShipping" className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                  Same as shipping address
                </label>
              </div>
              
              {checkout?.billingAddressId !== checkout?.shippingAddressId && (
                <AddressSelector
                  selectedId={checkout?.billingAddressId ?? null}
                  onSelect={(id) => updateCheckout({ billingAddressId: id })}
                  type="billing"
                />
              )}
            </div>

            <div className="card p-6">
              <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Additional Details
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Your PO Number (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., PO-2025-001"
                    value={checkout?.poNumber ?? ''}
                    onChange={(e) => updateCheckout({ poNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Requested Delivery Date (optional)
                  </label>
                  <input
                    type="date"
                    value={checkout?.requestedDate ?? ''}
                    onChange={(e) => updateCheckout({ requestedDate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Special Instructions (optional)
                </label>
                <textarea
                  placeholder="Any special requirements..."
                  value={checkout?.instructions ?? ''}
                  onChange={(e) => updateCheckout({ instructions: e.target.value })}
                  rows={3}
                  className="input-field resize-none w-full"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-20">
              <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Order Summary
              </h2>

              <div 
                className="space-y-3 mb-4 max-h-60 overflow-y-auto pb-4"
                style={{ borderBottom: '1px solid rgba(210, 210, 215, 0.3)' }}
              >
                {cart.map((item) => {
                  const displayPrice = getDisplayPrice(item.product)
                  return (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                      >
                        <Package className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {item.product.nameEn}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                          {item.quantity} × {formatDisplay(displayPrice)}
                        </p>
                      </div>
                      <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {formatDisplay(displayPrice * item.quantity)}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-[13px]">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal ({itemCount} units)</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatDisplay(subtotalDisplay)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Shipping</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>To be calculated</span>
                </div>
              </div>

              <div 
                className="flex justify-between py-4 mb-4"
                style={{ borderTop: '1px solid rgba(210, 210, 215, 0.3)' }}
              >
                <span className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Estimated Total
                </span>
                <span className="text-[20px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {formatDisplay(subtotalDisplay)}
                </span>
              </div>

              {showDualCurrency && (
                <div 
                  className="p-3 rounded-lg mb-4"
                  style={{ backgroundColor: 'rgba(0, 113, 227, 0.05)' }}
                >
                  <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Invoice Amount ({user?.invoiceCurrency})
                  </p>
                  <p className="text-[18px] font-semibold" style={{ color: 'var(--color-brand-primary)' }}>
                    {formatInvoice(subtotalInvoice)}
                  </p>
                </div>
              )}

              {user && (
                <div 
                  className="p-3 rounded-xl mb-6"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                >
                  <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Ordering as
                  </p>
                  <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {user.company}
                  </p>
                  <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {user.paymentTerms && `${user.paymentTerms} · `}Invoice in {user.invoiceCurrency}
                  </p>
                </div>
              )}

              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary w-full"
              >
                {isSubmitting ? (
                  'Processing...'
                ) : isQuoteRequest ? (
                  <>
                    <FileText className="w-4 h-4" />
                    Generate Quote
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Place Order
                  </>
                )}
              </button>

              <p className="text-[11px] text-center mt-4" style={{ color: 'var(--color-text-secondary)' }}>
                {isQuoteRequest 
                  ? 'Quote will be saved and PDF downloaded'
                  : 'By placing this order, you agree to our terms'}
              </p>
            </div>
          </div>
        </div>
    </div>
  )
}

// Export wrapper with Suspense boundary for useSearchParams
export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutContent />
    </Suspense>
  )
}