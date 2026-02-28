'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, Loader2, FileText, Download, Send, 
  CheckCircle, Clock, AlertCircle, Printer, Building2,
  Calendar, Package, Mail, Copy, ExternalLink, XCircle,
  Edit3, Plus, Trash2, Save, X, DollarSign
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { generateAdminInvoicePdf } from '@/lib/generatePdf'
import { useLocalization, CURRENCY_SYMBOLS } from '@/hooks/useLocalization'
import { EmailModal, EmailData } from '@/components/EmailModal'
import { DocumentExportDropdown } from '@/components/DocumentExportDropdown'
import { getCompanyInfo } from '@/config/features'
import { DocumentTemplate, getTemplatesForType, getTemplateById } from '@/lib/documentTemplates'

interface OrderLine {
  id: string
  quantity: number
  unitPrice: number
  lineTotal: number
  productRef?: string
  productNameEn?: string
  product?: {
    id: string
    ref: string
    nameEn: string
    nameCn: string | null
  }
}

interface Quote {
  id: string
  invoiceNumber: string
  type: string
  status: string
  issueDate: string
  validUntil: string | null
  sentAt: string | null
  sentTo: string | null
  subtotal: number
  totalAmount: number
  currency: string
  pdfUrl: string | null
  order: {
    id: string
    orderNumber: string
    shippingAddress: string | null
    customer: {
      companyName: string
      contactName: string | null
      email: string
      billingAddress: string | null
      vatNumber: string | null
    }
    lines: OrderLine[]
    charges: Array<{
      id: string
      description: string
      amount: number
    }>
    discounts?: Array<{
      id: string
      description: string
      type: string
      value: number
      amount: number
    }>
  }
}

const statusConfig: Record<string, { 
  bg: string
  text: string
  icon: typeof CheckCircle
  label: string 
}> = {
  draft: { bg: 'bg-[#86868b]/10', text: 'text-[#86868b]', icon: Clock, label: 'Draft' },
  sent: { bg: 'bg-[#0071e3]/10', text: 'text-[#0071e3]', icon: Send, label: 'Sent' },
  accepted: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]', icon: CheckCircle, label: 'Accepted' },
  expired: { bg: 'bg-[#ff9500]/10', text: 'text-[#ff9500]', icon: AlertCircle, label: 'Expired' },
  rejected: { bg: 'bg-[#ff3b30]/10', text: 'text-[#ff3b30]', icon: XCircle, label: 'Rejected' },
}

export default function QuoteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const quoteId = params.id as string
  const authFetch = useAuthFetch()

  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    invoiceNumber: '',
    issueDate: '',
    validUntil: ''
  })
  
  // Company info from settings
  const [companyInfo] = useState(() => getCompanyInfo())
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false)
  const [editCharges, setEditCharges] = useState<Array<{ id: string; description: string; amount: number }>>([])
  const [editDiscounts, setEditDiscounts] = useState<Array<{ 
    id: string
    description: string
    type: 'fixed' | 'percent_products' | 'percent_total'
    value: number
  }>>([])
  const [savingCharges, setSavingCharges] = useState(false)
  
  // Template state
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [applyingTemplate, setApplyingTemplate] = useState(false)

  useEffect(() => {
    fetchQuote()
    // Load templates
    const loadTemplates = async () => {
      const quoteTemplates = await getTemplatesForType('quote')
      setTemplates(quoteTemplates)
    }
    loadTemplates()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId])

  const fetchQuote = async () => {
    try {
      // Add cache-busting parameter to avoid stale data
      const res = await authFetch(`/api/quotes/${quoteId}?t=${Date.now()}`, {
        cache: 'no-store'
      })
      if (!res.ok) {
        setError('Quote not found')
        return
      }
      const data = await res.json()
      console.log('Fetched quote data:', { totalAmount: data.quote?.totalAmount, discounts: data.quote?.order?.discounts })
      setQuote(data.quote)
      // Restore previously applied template
      const savedTemplate = localStorage.getItem(`quote_template_${quoteId}`)
      if (savedTemplate) setSelectedTemplateId(savedTemplate)
    } catch {
      setError('Failed to load quote')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!quote) return
    setUpdating(true)

    try {
      const res = await authFetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        const data = await res.json()
        fetchQuote()
        
        if (newStatus === 'accepted') {
          setSuccessMessage(`Quote accepted! Order ${quote.order.orderNumber} has been confirmed.`)
          // Redirect to order page after 2 seconds
          setTimeout(() => {
            router.push(`/orders/${data.quote.orderId}`)
          }, 2000)
        } else if (newStatus === 'rejected') {
          setSuccessMessage('Quote marked as rejected')
          setTimeout(() => setSuccessMessage(''), 3000)
        } else {
          setSuccessMessage(`Quote marked as ${newStatus}`)
          setTimeout(() => setSuccessMessage(''), 3000)
        }
      }
    } catch {
      setError('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const openEditModal = () => {
    if (!quote) return
    setEditForm({
      invoiceNumber: quote.invoiceNumber,
      issueDate: quote.issueDate ? quote.issueDate.split('T')[0] : '',
      validUntil: quote.validUntil ? quote.validUntil.split('T')[0] : ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!quote) return
    setUpdating(true)

    try {
      const res = await authFetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: editForm.invoiceNumber,
          issueDate: editForm.issueDate ? new Date(editForm.issueDate).toISOString() : undefined,
          validUntil: editForm.validUntil ? new Date(editForm.validUntil).toISOString() : null
        })
      })

      if (res.ok) {
        setShowEditModal(false)
        setSuccessMessage('Quote updated successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
        fetchQuote()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update quote')
      }
    } catch {
      setError('Failed to update quote')
    } finally {
      setUpdating(false)
    }
  }

  const handleSendEmail = async (emailData: EmailData) => {
    if (!quote) return
    
    const res = await authFetch(`/api/quotes/${quoteId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: emailData.to,
        cc: emailData.cc,
        subject: emailData.subject,
        body: emailData.body
      })
    })
    
    if (res.ok) {
      setShowEmailModal(false)
      setSuccessMessage('Quote sent successfully!')
      handleStatusChange('sent')
      setTimeout(() => setSuccessMessage(''), 3000)
    } else {
      const data = await res.json()
      throw new Error(data.error || 'Failed to send email')
    }
  }
  
  const getDefaultEmailBody = () => {
    if (!quote) return ''
    const customerName = quote.order.customer.contactName || quote.order.customer.companyName
    const validUntil = quote.validUntil ? formatDate(quote.validUntil) : '30 days from issue date'
    return `Dear ${customerName},

Please find attached our quotation ${quote.invoiceNumber} for your review.

This quote is valid until ${validUntil}.

If you have any questions or would like to proceed, please don't hesitate to contact us.

Best regards`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const handleApplyTemplate = async (templateId: string) => {
    if (!templateId) return
    
    setApplyingTemplate(true)
    const template = await getTemplateById(templateId)
    if (template) {
      // Apply template settings to localStorage
      try {
        const existingSettings = localStorage.getItem('orderbridge_document_settings')
        const settings = existingSettings ? JSON.parse(existingSettings) : {}
        
        // Apply template settings for quote
        if (template.settings.layoutElements) {
          settings.quoteLayout = template.settings.layoutElements
        }
        if (template.settings.tableColumns) {
          settings.quoteTableColumns = template.settings.tableColumns
        }
        if (template.settings.margins) {
          settings.marginTop = template.settings.margins.top
          settings.marginBottom = template.settings.margins.bottom
          settings.marginLeft = template.settings.margins.left
          settings.marginRight = template.settings.margins.right
        }
        
        localStorage.setItem('orderbridge_document_settings', JSON.stringify(settings))
        // Persist selection per document so it survives navigation
        localStorage.setItem(`quote_template_${quoteId}`, templateId)
        setSelectedTemplateId(templateId)
        setSuccessMessage(`Template "${template.name}" applied!`)
        setTimeout(() => setSuccessMessage(''), 2000)
      } catch (e) {
        console.error('Failed to apply template:', e)
      }
    }
    
    setTimeout(() => setApplyingTemplate(false), 500)
  }

  const handleDownloadPdf = () => {
    if (!quote) return
    
    generateAdminInvoicePdf({
      invoice: {
        invoiceNumber: quote.invoiceNumber,
        issueDate: quote.issueDate,
        dueDate: quote.validUntil,
        status: quote.status,
        subtotal: Number(quote.subtotal),
        totalAmount: Number(quote.totalAmount),
        currency: quote.currency,
      },
      order: {
        orderNumber: quote.order.orderNumber,
        lines: quote.order.lines.map(line => ({
          quantity: line.quantity,
          unitPrice: Number(line.unitPrice),
          lineTotal: Number(line.lineTotal),
          product: {
            ref: line.product?.ref || line.productRef || '',
            nameEn: line.product?.nameEn || line.productNameEn || '',
          }
        })),
        charges: quote.order.charges?.map(c => ({
          description: c.description,
          amount: Number(c.amount),
        })) || [],
        discounts: quote.order.discounts?.map(d => ({
          description: d.description,
          type: d.type,
          value: Number(d.value),
          amount: Number(d.amount),
        })) || [],
      },
      customer: {
        companyName: quote.order.customer.companyName,
        contactName: quote.order.customer.contactName,
        billingAddress: quote.order.customer.billingAddress,
        vatNumber: quote.order.customer.vatNumber,
      },
      documentType: 'QUOTE'
    })
  }

  const copyQuoteLink = () => {
    // If PDF exists, copy the PDF URL, otherwise copy the public preview link
    const link = quote?.pdfUrl 
      ? quote.pdfUrl 
      : `${window.location.origin}/quote-preview/${quoteId}`
    navigator.clipboard.writeText(link)
    setSuccessMessage(quote?.pdfUrl ? 'PDF link copied!' : 'Preview link copied!')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  // Edit mode functions
  const startEditing = () => {
    setEditCharges(quote?.order.charges?.map(c => ({
      id: c.id,
      description: c.description,
      amount: Number(c.amount)
    })) || [])
    // Load existing discounts
    setEditDiscounts(quote?.order.discounts?.map(d => ({
      id: d.id,
      description: d.description,
      type: d.type as 'fixed' | 'percent_products' | 'percent_total',
      value: Number(d.value)
    })) || [])
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditCharges([])
    setEditDiscounts([])
  }

  const addNewCharge = () => {
    setEditCharges(prev => [...prev, {
      id: `new_${Date.now()}`,
      description: '',
      amount: 0
    }])
  }

  const updateCharge = (id: string, field: 'description' | 'amount', value: string | number) => {
    setEditCharges(prev => prev.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ))
  }

  const removeCharge = (id: string) => {
    setEditCharges(prev => prev.filter(c => c.id !== id))
  }

  // Discount functions
  const addNewDiscount = () => {
    setEditDiscounts(prev => [...prev, {
      id: `new_${Date.now()}`,
      description: '',
      type: 'fixed' as const,
      value: 0
    }])
  }

  const updateDiscount = (id: string, field: 'description' | 'type' | 'value', value: string | number) => {
    setEditDiscounts(prev => prev.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ))
  }

  const removeDiscount = (id: string) => {
    setEditDiscounts(prev => prev.filter(d => d.id !== id))
  }

  const calculateDiscountAmount = (discount: { type: string; value: number }) => {
    // Calculate subtotal from actual line totals (not from stored quote.subtotal)
    const subtotal = quote 
      ? quote.order.lines.reduce((sum, line) => sum + Number(line.lineTotal), 0)
      : 0
    const charges = editCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
    
    if (discount.type === 'fixed') {
      return discount.value
    } else if (discount.type === 'percent_products') {
      return subtotal * (discount.value / 100)
    } else if (discount.type === 'percent_total') {
      return (subtotal + charges) * (discount.value / 100)
    }
    return 0
  }

  const saveCharges = async () => {
    if (!quote) return
    setSavingCharges(true)

    try {
      const validCharges = editCharges.filter(c => c.description.trim() && c.amount >= 0)
      
      console.log('editDiscounts before filter:', editDiscounts)
      // Filter discounts - allow empty description (will use default)
      const validDiscounts = editDiscounts
        .filter(d => d.value > 0)
        .map(d => ({
          ...d,
          description: d.description.trim() || 'Discount' // Default description if empty
        }))
      console.log('validDiscounts after filter:', validDiscounts)
      
      // Calculate discount amounts on client side (using current displayed values)
      const discountsWithAmounts = validDiscounts.map(d => ({
        ...d,
        amount: calculateDiscountAmount(d)
      }))
      
      console.log('Saving discounts with amounts:', discountsWithAmounts)
      
      // Save discounts scoped to this document
      const discountsRes = await authFetch(`/api/orders/${quote.order.id}/discounts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discounts: discountsWithAmounts, invoiceId: quote.id })
      })
      
      const discountsData = await discountsRes.json()
      console.log('Discounts response:', discountsData)

      // Save charges AFTER discounts — pass invoiceId so only THIS document is updated
      const chargesRes = await authFetch(`/api/orders/${quote.order.id}/charges`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ charges: validCharges, invoiceId: quote.id })
      })

      if (chargesRes.ok) {
        await fetchQuote()
        setIsEditing(false)
        setEditDiscounts([])
        setSuccessMessage('Changes saved successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const data = await chargesRes.json()
        setError(data.error || 'Failed to save changes')
      }
    } catch {
      setError('Failed to save changes')
    } finally {
      setSavingCharges(false)
    }
  }

  // Calculate totals dynamically from actual data (never rely on stale stored totalAmount)
  const editSubtotal = quote 
    ? quote.order.lines.reduce((sum, line) => sum + Number(line.lineTotal), 0)
    : 0
  const editChargesTotal = editCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  const editDiscountsTotal = editDiscounts.reduce((sum, d) => sum + calculateDiscountAmount(d), 0)
  const editTotal = editSubtotal + editChargesTotal - editDiscountsTotal


  const isExpired = quote?.validUntil && new Date(quote.validUntil) < new Date()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <FileText className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
          <p className="text-[15px] text-[#86868b]">{error || 'Quote not found'}</p>
          <Link href="/quotes" className="text-[#0071e3] text-[14px] mt-4 inline-block">
            Back to Quotes
          </Link>
        </div>
      </div>
    )
  }

  const status = statusConfig[quote.status] || statusConfig.draft
  const StatusIcon = status.icon
  const currencySymbol = CURRENCY_SYMBOLS[quote.currency] || quote.currency

  return (
    <div className="max-w-4xl mx-auto">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-[#34c759] text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        {/* Top row: Back link + Action buttons */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/quotes" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px]">
            <ChevronLeft className="w-4 h-4" />
            Quotes
          </Link>
          <div className="flex items-center gap-2">
          {quote.status === 'draft' && (
            <button
              onClick={() => setShowEmailModal(true)}
              disabled={updating}
              className="inline-flex items-center gap-2 h-10 px-4 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Send Quote
            </button>
          )}
          {quote.status === 'sent' && (
            <>
              <button
                onClick={() => handleStatusChange('accepted')}
                disabled={updating}
                className="inline-flex items-center gap-2 h-10 px-4 bg-[#34c759] hover:bg-[#2db350] text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Mark Accepted
              </button>
              <button
                onClick={() => handleStatusChange('rejected')}
                disabled={updating}
                className="inline-flex items-center gap-2 h-10 px-4 bg-[#ff3b30] hover:bg-[#e5352b] text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Mark Rejected
              </button>
              <button
                onClick={() => handleStatusChange('draft')}
                disabled={updating}
                className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                Revert to Draft
              </button>
            </>
          )}
          {(quote.status === 'accepted' || quote.status === 'rejected') && (
            <>
              <button
                onClick={() => handleStatusChange('sent')}
                disabled={updating}
                className="inline-flex items-center gap-2 h-10 px-4 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Revert to Sent
              </button>
              <button
                onClick={() => handleStatusChange('draft')}
                disabled={updating}
                className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                Revert to Draft
              </button>
            </>
          )}
          {!isEditing && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-2 h-10 px-4 bg-[#ff9500] hover:bg-[#e6860a] text-white text-[13px] font-medium rounded-xl transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit Quote
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={saveCharges}
                disabled={savingCharges}
                className="inline-flex items-center gap-2 h-10 px-4 bg-[#34c759] hover:bg-[#2db350] text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {savingCharges ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
              <button
                onClick={cancelEditing}
                className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </>
          )}
          <button
            onClick={copyQuoteLink}
            className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
            title="Copy Link"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <div className="flex items-center gap-2">
            <select
              value={selectedTemplateId}
              onChange={(e) => handleApplyTemplate(e.target.value)}
              disabled={applyingTemplate}
              className="h-10 px-3 bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-50"
            >
              <option value="">Apply Template...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} {template.id.startsWith('suggested-') ? '(Suggested)' : ''}
                </option>
              ))}
            </select>
            {applyingTemplate && <Loader2 className="w-4 h-4 animate-spin text-[#0071e3]" />}
          </div>
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <DocumentExportDropdown
            data={{
              invoiceNumber: quote.invoiceNumber,
              type: quote.type,
              status: quote.status,
              issueDate: quote.issueDate,
              validUntil: quote.validUntil,
              customerName: quote.order?.customer?.companyName,
              currency: quote.currency,
              subtotal: quote.subtotal,
              totalCharges: quote.order?.charges?.reduce((sum, c) => sum + Number(c.amount), 0) || 0,
              totalAmount: quote.totalAmount,
              lines: quote.order?.lines?.map(l => ({
                ref: l.product?.ref || l.productRef,
                nameEn: l.product?.nameEn || l.productNameEn,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                lineTotal: l.lineTotal
              })) || [],
              charges: quote.order?.charges || []
            }}
            filename={`quote_${quote.invoiceNumber}`}
            title={`Quote ${quote.invoiceNumber}`}
            documentType="quote"
          />
          </div>
        </div>
        
        {/* Quote number and status */}
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] whitespace-nowrap">{quote.invoiceNumber}</h1>
            <button
              onClick={openEditModal}
              className="p-1.5 hover:bg-[#f5f5f7] rounded-lg transition-colors"
              title="Edit number & dates"
            >
              <Edit3 className="w-4 h-4 text-[#86868b]" />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium ${status.bg} ${status.text}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {status.label}
            </span>
            {isExpired && quote.status !== 'expired' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-medium bg-[#ff9500]/10 text-[#ff9500]">
                <AlertCircle className="w-3.5 h-3.5" />
                Expired
              </span>
            )}
            <span className="text-[14px] text-[#86868b]">
              Order: <Link href={`/orders/${quote.order.id}`} className="text-[#0071e3] hover:underline">{quote.order.orderNumber}</Link>
            </span>
          </div>
        </div>
      </div>

      {/* Quote Document */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden print:border-0 print:shadow-none">
        {/* Quote Header */}
        <div className="p-8 border-b border-[#d2d2d7]/30">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#0071e3] to-[#00c7be] rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold text-[#1d1d1f]">{companyInfo.name}</h2>
                  <p className="text-[13px] text-[#86868b]">{companyInfo.legalName}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[24px] font-bold text-[#1d1d1f] mb-2">QUOTE</p>
              <p className="text-[15px] font-medium text-[#1d1d1f]">{quote.invoiceNumber}</p>
            </div>
          </div>
        </div>

        {/* Billing Info */}
        <div className="p-8 grid grid-cols-2 gap-8 border-b border-[#d2d2d7]/30">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#86868b] font-medium mb-2">Quote For</p>
            <p className="text-[15px] font-semibold text-[#1d1d1f]">{quote.order.customer.companyName}</p>
            {quote.order.customer.contactName && (
              <p className="text-[14px] text-[#1d1d1f]">{quote.order.customer.contactName}</p>
            )}
            {quote.order.customer.billingAddress && (
              <p className="text-[14px] text-[#86868b] whitespace-pre-line mt-1">
                {quote.order.customer.billingAddress}
              </p>
            )}
            {quote.order.customer.vatNumber && (
              <p className="text-[13px] text-[#86868b] mt-2">VAT: {quote.order.customer.vatNumber}</p>
            )}
          </div>
          <div className="text-right">
            <div className="space-y-2">
              <div className="flex justify-end items-center gap-2">
                <Calendar className="w-4 h-4 text-[#86868b]" />
                <span className="text-[13px] text-[#86868b]">Issue Date:</span>
                <span className="text-[14px] font-medium text-[#1d1d1f]">{formatDate(quote.issueDate)}</span>
              </div>
              {quote.validUntil && (
                <div className="flex justify-end items-center gap-2">
                  <Clock className="w-4 h-4 text-[#86868b]" />
                  <span className="text-[13px] text-[#86868b]">Valid Until:</span>
                  <span className={`text-[14px] font-medium ${isExpired ? 'text-[#ff3b30]' : 'text-[#1d1d1f]'}`}>
                    {formatDate(quote.validUntil)}
                    {isExpired && ' (Expired)'}
                  </span>
                </div>
              )}
              {quote.sentAt && (
                <div className="flex justify-end items-center gap-2">
                  <Send className="w-4 h-4 text-[#34c759]" />
                  <span className="text-[13px] text-[#86868b]">Sent:</span>
                  <span className="text-[14px] font-medium text-[#34c759]">
                    {new Date(quote.sentAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {quote.sentTo && ` to ${quote.sentTo}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="p-8">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#d2d2d7]/30">
                <th className="text-left text-[11px] font-medium text-[#86868b] uppercase tracking-wide pb-3">Item</th>
                <th className="text-right text-[11px] font-medium text-[#86868b] uppercase tracking-wide pb-3">Qty</th>
                <th className="text-right text-[11px] font-medium text-[#86868b] uppercase tracking-wide pb-3">Unit Price</th>
                <th className="text-right text-[11px] font-medium text-[#86868b] uppercase tracking-wide pb-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.order.lines.map((line) => (
                <tr key={line.id} className="border-b border-[#d2d2d7]/20">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#f5f5f7] rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-[#86868b]" />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-[#1d1d1f]">{line.product?.nameEn || line.productNameEn}</p>
                        <p className="text-[12px] text-[#86868b] font-mono">{line.product?.ref || line.productRef}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-right text-[14px] text-[#1d1d1f]">{line.quantity}</td>
                  <td className="py-4 text-right text-[14px] text-[#1d1d1f]">{currencySymbol}{formatNumber(Number(line.unitPrice))}</td>
                  <td className="py-4 text-right text-[14px] font-medium text-[#1d1d1f]">{currencySymbol}{formatNumber(Number(line.lineTotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Additional Charges - View Mode */}
          {!isEditing && quote.order.charges && quote.order.charges.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#d2d2d7]/30">
              <p className="text-[11px] uppercase tracking-wide text-[#86868b] font-medium mb-3">Additional Charges</p>
              {quote.order.charges.map((charge) => (
                <div key={charge.id} className="flex justify-between py-2">
                  <span className="text-[14px] text-[#86868b]">{charge.description}</span>
                  <span className="text-[14px] text-[#1d1d1f]">{currencySymbol}{formatNumber(Number(charge.amount))}</span>
                </div>
              ))}
            </div>
          )}

          {/* Discounts - View Mode */}
          {!isEditing && quote.order.discounts && quote.order.discounts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#d2d2d7]/30">
              <p className="text-[11px] uppercase tracking-wide text-[#34c759] font-medium mb-3">Discounts Applied</p>
              {quote.order.discounts.map((discount) => (
                <div key={discount.id} className="flex justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] text-[#86868b]">{discount.description}</span>
                    <span className="text-[11px] px-2 py-0.5 bg-[#34c759]/10 text-[#34c759] rounded-md">
                      {discount.type === 'fixed' 
                        ? `${currencySymbol}${formatNumber(Number(discount.value))} off`
                        : discount.type === 'percent_products'
                        ? `${Number(discount.value)}% on products`
                        : `${Number(discount.value)}% on total`
                      }
                    </span>
                  </div>
                  <span className="text-[14px] text-[#34c759]">-{currencySymbol}{formatNumber(Number(discount.amount))}</span>
                </div>
              ))}
            </div>
          )}

          {/* Additional Charges - Edit Mode */}
          {isEditing && (
            <div className="mt-6 pt-6 border-t-2 border-dashed border-[#ff9500]/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#ff9500]" />
                  <p className="text-[14px] font-semibold text-[#1d1d1f]">Additional Charges</p>
                </div>
                <button
                  onClick={addNewCharge}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff9500]/10 text-[#ff9500] text-[13px] font-medium rounded-lg hover:bg-[#ff9500]/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Line
                </button>
              </div>
              
              <div className="bg-[#f5f5f7] rounded-xl p-4 space-y-3">
                <p className="text-[12px] text-[#86868b] mb-2">
                  Add shipping costs, loading fees, or any other charges:
                </p>
                
                {editCharges.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-[13px] text-[#86868b]">No additional charges</p>
                    <button
                      onClick={addNewCharge}
                      className="mt-2 text-[13px] text-[#0071e3] hover:underline"
                    >
                      Add your first charge
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editCharges.map((charge) => (
                      <div key={charge.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-[#d2d2d7]/30">
                        <input
                          type="text"
                          value={charge.description}
                          onChange={(e) => updateCharge(charge.id, 'description', e.target.value)}
                          placeholder="Description (e.g., Shipping Cost, Loading Fee)"
                          className="flex-1 h-9 px-3 bg-transparent border-0 text-[14px] focus:outline-none focus:ring-0"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-[14px] text-[#86868b]">{currencySymbol}</span>
                          <input
                            type="number"
                            value={charge.amount ?? ''}
                            onChange={(e) => updateCharge(charge.id, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            className="w-28 h-9 px-3 bg-[#f5f5f7] rounded-lg text-[14px] text-right focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                        </div>
                        <button
                          onClick={() => removeCharge(charge.id)}
                          className="p-2 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Common charges suggestions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-[#d2d2d7]/30 mt-4">
                  <p className="text-[11px] text-[#86868b] w-full mb-1">Quick add:</p>
                  {['Shipping Cost', 'Loading Fee', 'Insurance', 'Documentation Fee', 'Customs Duty', 'Handling Fee']
                    .filter(suggestion => !editCharges.some(c => c.description === suggestion))
                    .map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setEditCharges(prev => [...prev, {
                            id: `new_${Date.now()}_${suggestion}`,
                            description: suggestion,
                            amount: 0
                          }])
                        }}
                        className="px-3 py-1.5 bg-white border border-[#d2d2d7]/30 rounded-lg text-[12px] text-[#86868b] hover:border-[#0071e3] hover:text-[#0071e3] transition-colors"
                      >
                        + {suggestion}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Discounts - Edit Mode */}
          {isEditing && (
            <div className="mt-6 pt-6 border-t-2 border-dashed border-[#34c759]/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#34c759]" />
                  <p className="text-[14px] font-semibold text-[#1d1d1f]">Discounts</p>
                </div>
                <button
                  onClick={addNewDiscount}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#34c759]/10 text-[#34c759] text-[13px] font-medium rounded-lg hover:bg-[#34c759]/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Discount
                </button>
              </div>
              
              <div className="bg-[#34c759]/5 rounded-xl p-4 space-y-3">
                <p className="text-[12px] text-[#86868b] mb-2">
                  Add discounts (fixed amount, % of products, or % of total):
                </p>
                
                {editDiscounts.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-[13px] text-[#86868b]">No discounts applied</p>
                    <button
                      onClick={addNewDiscount}
                      className="mt-2 text-[13px] text-[#34c759] hover:underline"
                    >
                      Add your first discount
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editDiscounts.map((discount) => (
                      <div key={discount.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-[#d2d2d7]/30">
                        <input
                          type="text"
                          value={discount.description}
                          onChange={(e) => updateDiscount(discount.id, 'description', e.target.value)}
                          placeholder="Description (e.g., Volume Discount)"
                          className="flex-1 h-9 px-3 bg-transparent border-0 text-[14px] focus:outline-none focus:ring-0"
                        />
                        <select
                          value={discount.type}
                          onChange={(e) => updateDiscount(discount.id, 'type', e.target.value)}
                          className="h-9 px-3 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                        >
                          <option value="fixed">Fixed Amount</option>
                          <option value="percent_products">% of Products</option>
                          <option value="percent_total">% of Total</option>
                        </select>
                        <div className="flex items-center gap-1">
                          {discount.type === 'fixed' ? (
                            <span className="text-[14px] text-[#86868b]">{currencySymbol}</span>
                          ) : (
                            <span className="text-[14px] text-[#86868b]">%</span>
                          )}
                          <input
                            type="number"
                            value={discount.value || ''}
                            onChange={(e) => updateDiscount(discount.id, 'value', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            step={discount.type === 'fixed' ? '0.01' : '1'}
                            min="0"
                            className="w-20 h-9 px-3 bg-[#f5f5f7] rounded-lg text-[14px] text-right focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                          />
                        </div>
                        <span className="text-[13px] text-[#34c759] w-24 text-right">
                          -{currencySymbol}{formatNumber(calculateDiscountAmount(discount))}
                        </span>
                        <button
                          onClick={() => removeDiscount(discount.id)}
                          className="p-2 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick discount suggestions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-[#34c759]/20 mt-4">
                  <p className="text-[11px] text-[#86868b] w-full mb-1">Quick add:</p>
                  {[
                    { label: '5% off', type: 'percent_products' as const, value: 5 },
                    { label: '10% off', type: 'percent_products' as const, value: 10 },
                    { label: '15% off', type: 'percent_products' as const, value: 15 },
                    { label: 'Volume Discount', type: 'fixed' as const, value: 0 },
                    { label: 'Early Payment', type: 'percent_total' as const, value: 2 },
                  ].map((suggestion) => (
                    <button
                      key={suggestion.label}
                      onClick={() => {
                        setEditDiscounts(prev => [...prev, {
                          id: `new_${Date.now()}_${suggestion.label}`,
                          description: suggestion.label,
                          type: suggestion.type,
                          value: suggestion.value
                        }])
                      }}
                      className="px-3 py-1.5 bg-white border border-[#d2d2d7]/30 rounded-lg text-[12px] text-[#86868b] hover:border-[#34c759] hover:text-[#34c759] transition-colors"
                    >
                      + {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Totals - View Mode */}
          {!isEditing && (
            <div className="mt-6 pt-6 border-t border-[#d2d2d7]/30">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[14px] text-[#86868b]">Subtotal</span>
                    <span className="text-[14px] text-[#1d1d1f]">{currencySymbol}{formatNumber(Number(quote.subtotal))}</span>
                  </div>
                  {quote.order.charges && quote.order.charges.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[14px] text-[#86868b]">Charges</span>
                      <span className="text-[14px] text-[#1d1d1f]">
                        + {currencySymbol}{formatNumber(quote.order.charges.reduce((sum, c) => sum + Number(c.amount), 0))}
                      </span>
                    </div>
                  )}
                  {quote.order.discounts && quote.order.discounts.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[14px] text-[#34c759]">Discounts</span>
                      <span className="text-[14px] text-[#34c759]">
                        - {currencySymbol}{formatNumber(quote.order.discounts.reduce((sum, d) => sum + Number(d.amount), 0))}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-[#d2d2d7]/30">
                    <span className="text-[16px] font-semibold text-[#1d1d1f]">Total</span>
                    <span className="text-[20px] font-bold text-[#0071e3]">{currencySymbol}{formatNumber(Number(quote.totalAmount))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Totals - Edit Mode */}
          {isEditing && (
            <div className="mt-6 pt-6 border-t border-[#d2d2d7]/30">
              <div className="flex justify-end">
                <div className="w-80 space-y-2 bg-[#f5f5f7] rounded-xl p-4 border border-[#d2d2d7]/30">
                  <div className="flex justify-between">
                    <span className="text-[14px] text-[#86868b]">Products Subtotal</span>
                    <span className="text-[14px] text-[#1d1d1f]">{currencySymbol}{formatNumber(editSubtotal)}</span>
                  </div>
                  {editChargesTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[14px] text-[#ff9500]">Additional Charges</span>
                      <span className="text-[14px] text-[#ff9500]">+ {currencySymbol}{formatNumber(editChargesTotal)}</span>
                    </div>
                  )}
                  {editDiscountsTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[14px] text-[#34c759]">Discounts</span>
                      <span className="text-[14px] text-[#34c759]">- {currencySymbol}{formatNumber(editDiscountsTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-[#d2d2d7]/30">
                    <span className="text-[16px] font-semibold text-[#1d1d1f]">New Total</span>
                    <span className="text-[20px] font-bold text-[#0071e3]">{currencySymbol}{formatNumber(editTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-[#f5f5f7] border-t border-[#d2d2d7]/30">
          <p className="text-[12px] text-[#86868b] text-center">
            This quotation is valid for {quote.validUntil ? Math.ceil((new Date(quote.validUntil).getTime() - new Date(quote.issueDate).getTime()) / (1000 * 60 * 60 * 24)) : 30} days from the issue date.
            Prices are subject to change after the validity period.
          </p>
        </div>
      </div>

      {/* Bottom Save Button (Edit Mode) */}
      {isEditing && (
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={cancelEditing}
            className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={saveCharges}
            disabled={savingCharges}
            className="inline-flex items-center gap-2 h-10 px-4 bg-[#34c759] hover:bg-[#2db350] text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {savingCharges ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Edit Quote Details</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-[#f5f5f7] rounded-lg">
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Quote Number</label>
                <input
                  type="text"
                  value={editForm.invoiceNumber}
                  onChange={(e) => setEditForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="w-full h-10 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Issue Date</label>
                <input
                  type="date"
                  value={editForm.issueDate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, issueDate: e.target.value }))}
                  className="w-full h-10 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Valid Until</label>
                <input
                  type="date"
                  value={editForm.validUntil}
                  onChange={(e) => setEditForm(prev => ({ ...prev, validUntil: e.target.value }))}
                  className="w-full h-10 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 h-10 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updating}
                className="inline-flex items-center gap-2 px-4 h-10 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSend={handleSendEmail}
        documentType="Quote"
        documentNumber={quote?.invoiceNumber || ''}
        defaultTo={quote?.order.customer.email}
        defaultSubject={quote ? `Quote ${quote.invoiceNumber} - ${quote.order.customer.companyName}` : ''}
        defaultBody={getDefaultEmailBody()}
      />
    </div>
  )
}
