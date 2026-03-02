'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ChevronLeft, Loader2, Package, Clock, MapPin, Edit3, Save,
  Plus, Minus, Trash2, X, Check, AlertTriangle, History, FileText,
  RefreshCcw, DollarSign, Ship, ClipboardList, FileCheck, Search, ShoppingCart, Hash
} from 'lucide-react'
import Portal from '@/components/Portal'
import { formatNumber } from '@/lib/utils'
import { useLocalization } from '@/hooks/useLocalization'
import { useAuthFetch } from '@/hooks/useAuthFetch'

interface OrderLine {
  id: string
  quantity: number
  unitPrice: number
  lineTotal: number
  product: {
    id: string
    ref: string
    nameEn: string
    requiresSerial?: boolean
    serialPrefix?: string | null
  }
}

interface Product {
  id: string
  ref: string
  nameEn: string
  nameCn?: string | null
  priceDistributor: number | string | null
  photoUrl?: string | null
  requiresSerial?: boolean
  serialPrefix?: string | null
}

interface Order {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  notesEn: string | null
  subtotal: number
  shippingFee?: number
  totalAmount: number
  customer: {
    id: string
    companyName: string
    contactName: string | null
    email: string | null
    country: string | null
    shippingAddress: string | null
  }
  lines: OrderLine[]
}

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-[#86868b]/10', text: 'text-[#86868b]' },
  PENDING: { bg: 'bg-[#ff9500]/10', text: 'text-[#ff9500]' },
  CONFIRMED: { bg: 'bg-[#0071e3]/10', text: 'text-[#0071e3]' },
  PREPARING: { bg: 'bg-[#5856d6]/10', text: 'text-[#5856d6]' },
  READY: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]' },
  SHIPPED: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]' },
  DELIVERED: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]' },
  CANCELLED: { bg: 'bg-[#ff3b30]/10', text: 'text-[#ff3b30]' },
}

const statusOptions = ['DRAFT', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED']

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { currencySymbol } = useLocalization()
  const authFetch = useAuthFetch()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Edit mode
  const [isEditing, setIsEditing] = useState(false)
  const [editedLines, setEditedLines] = useState<OrderLine[]>([])
  const [editedNotes, setEditedNotes] = useState('')
  const [modificationReason, setModificationReason] = useState('')
  
  // Invoice creation
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [invoiceCreated, setInvoiceCreated] = useState<string | null>(null)
  
  // Quote creation
  const [creatingQuote, setCreatingQuote] = useState(false)
  const [quoteCreated, setQuoteCreated] = useState<string | null>(null)
  
  // Proforma Invoice creation
  const [creatingProforma, setCreatingProforma] = useState(false)
  const [proformaCreated, setProformaCreated] = useState<string | null>(null)
  
  // Add products modal (for editing)
  const [showAddProductsModal, setShowAddProductsModal] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')
  
  // Substitution modal
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false)
  const [selectedLineForSubstitution, setSelectedLineForSubstitution] = useState<OrderLine | null>(null)
  const [substitutionReason, setSubstitutionReason] = useState('Out of stock')
  const [creatingSubstitution, setCreatingSubstitution] = useState(false)
  
  // Payment tracking
  const [creatingPayment, setCreatingPayment] = useState(false)

  // Serial numbers
  const [serials, setSerials] = useState<Record<string, string[]>>({})
  const [existingSerials, setExistingSerials] = useState<{ orderLineId: string; serial: string }[]>([])
  const [showSerialModal, setShowSerialModal] = useState(false)
  const [savingSerials, setSavingSerials] = useState(false)
  const [serialErrors, setSerialErrors] = useState<Record<string, string>>({})

  // Order history (from audit logs)
  const [orderHistory, setOrderHistory] = useState<{ id: string; action: string; userEmail: string | null; changes: unknown; metadata: unknown; timestamp: string }[]>([])

  const fetchSerials = async () => {
    const res = await fetch(`/api/orders/${orderId}/serials`)
    if (res.ok) {
      const data = await res.json()
      setExistingSerials(data.serials || [])
      const grouped: Record<string, string[]> = {}
      for (const s of data.serials) {
        if (!grouped[s.orderLineId]) grouped[s.orderLineId] = []
        grouped[s.orderLineId].push(s.serial)
      }
      setSerials(grouped)
    }
  }

  const fetchOrder = async (silent = false) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      const data = await res.json()

      if (!res.ok) {
        if (!silent) setError(data.error || 'Order not found')
        return
      }

      const orderData = {
        ...data.order,
        subtotal: parseFloat(data.order.subtotal) || 0,
        shippingFee: parseFloat(data.order.shippingFee) || 0,
        totalAmount: parseFloat(data.order.totalAmount) || 0,
        lines: data.order.lines.map((line: OrderLine) => ({
          ...line,
          unitPrice: parseFloat(String(line.unitPrice)) || 0,
          lineTotal: parseFloat(String(line.lineTotal)) || 0,
        }))
      }

      setOrder(orderData)
      setEditedLines(orderData.lines)
      setEditedNotes(orderData.notesEn || '')
      if (data.history) setOrderHistory(data.history)
      await fetchSerials()
    } catch {
      if (!silent) setError('Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const updateStatus = async (newStatus: string) => {
    setSaving(true)
    if (newStatus === 'CONFIRMED' && order) {
      const requiredLines = order.lines.filter(l => l.product?.requiresSerial)
      const allAssigned = requiredLines.every(l => (serials[l.id]?.length || 0) >= l.quantity)
      if (requiredLines.length > 0 && !allAssigned) {
        setShowSerialModal(true)
        setSaving(false)
        return
      }
    }
    try {
      const res = await authFetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        setOrder(prev => prev ? { ...prev, status: newStatus } : null)
        // Refresh history silently to show the status change
        fetchOrder(true)
      }
    } catch {
      console.error('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  const handleStartEditing = () => {
    if (!order) return
    setEditedLines([...order.lines])
    setEditedNotes(order.notesEn || '')
    setModificationReason('')
    setIsEditing(true)
  }

  const handleCancelEditing = () => {
    if (!order) return
    setEditedLines([...order.lines])
    setEditedNotes(order.notesEn || '')
    setIsEditing(false)
  }

  const handleQuantityChange = (lineId: string, delta: number) => {
    setEditedLines(prev => prev.map(line => {
      if (line.id === lineId) {
        const newQty = Math.max(1, line.quantity + delta)
        return {
          ...line,
          quantity: newQty,
          lineTotal: newQty * line.unitPrice
        }
      }
      return line
    }))
  }

  const handleQuantityInput = (lineId: string, value: string) => {
    const parsed = parseInt(value, 10)
    const newQty = isNaN(parsed) || parsed < 1 ? 1 : parsed
    setEditedLines(prev => prev.map(line => {
      if (line.id === lineId) {
        return { ...line, quantity: newQty, lineTotal: newQty * line.unitPrice }
      }
      return line
    }))
  }

  const handleRemoveLine = (lineId: string) => {
    setEditedLines(prev => prev.filter(line => line.id !== lineId))
  }

  const fetchAvailableProducts = async () => {
    setProductsLoading(true)
    try {
      const res = await fetch('/api/products/list')
      if (res.ok) {
        const data = await res.json()
        setAvailableProducts(data.products || [])
      }
    } catch (err) {
      console.error('Failed to fetch products', err)
    } finally {
      setProductsLoading(false)
    }
  }

  const handleOpenAddProducts = () => {
    setShowAddProductsModal(true)
    if (availableProducts.length === 0) {
      fetchAvailableProducts()
    }
  }

  const getPrice = (price: number | string | null): number => {
    if (price === null) return 0
    return typeof price === 'string' ? parseFloat(price) : Number(price)
  }

  const handleAddProduct = (product: Product, quantity: number = 1) => {
    // Check if product already in edited lines
    const existingLine = editedLines.find(line => line.product.id === product.id)
    if (existingLine) {
      // Update quantity
      setEditedLines(prev => prev.map(line => 
        line.product.id === product.id 
          ? { ...line, quantity: line.quantity + quantity, lineTotal: (line.quantity + quantity) * line.unitPrice }
          : line
      ))
    } else {
      // Add new line
      const unitPrice = getPrice(product.priceDistributor)
      const newLine: OrderLine = {
        id: `new_${Date.now()}_${product.id}`,
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
        product: {
          id: product.id,
          ref: product.ref,
          nameEn: product.nameEn,
        }
      }
      setEditedLines(prev => [...prev, newLine])
    }
  }

  const filteredAvailableProducts = availableProducts.filter(product => {
    if (!productSearchQuery.trim()) return true
    const query = productSearchQuery.toLowerCase()
    return product.nameEn.toLowerCase().includes(query) || 
           product.ref.toLowerCase().includes(query)
  })

  const isSavingRef = useRef(false)

  const handleSaveChanges = async () => {
    if (!order || !modificationReason.trim()) return
    if (isSavingRef.current) return  // guard against double-click / double-invoke
    isSavingRef.current = true

    setSaving(true)
    try {
      // In real app, call API to save changes
      const res = await authFetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: editedLines.map(l => ({ 
            id: l.id, 
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            productId: l.product.id,
            productRef: l.product.ref,
            productNameEn: l.product.nameEn,
          })),
          notesEn: editedNotes,
          modificationReason,
        }),
      })

      if (res.ok) {
        setIsEditing(false)
        setModificationReason('')
        // Re-fetch to update history and order data
        await fetchOrder(true)
      } else {
        const data = await res.json()
        setError(data.details ? `${data.error}: ${data.details}` : data.error || 'Failed to save changes')
      }
    } catch (err) {
      console.error('Failed to save changes:', err)
      setError('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
      isSavingRef.current = false
    }
  }

  const editedSubtotal = editedLines.reduce((sum, l) => sum + l.lineTotal, 0)
  const hasChanges = order && (
    JSON.stringify(editedLines.map(l => ({ id: l.id, quantity: l.quantity }))) !== 
    JSON.stringify(order.lines.map(l => ({ id: l.id, quantity: l.quantity }))) ||
    editedNotes !== (order.notesEn || '')
  )

  const handleCreateInvoice = async () => {
    if (!order) return
    setCreatingInvoice(true)

    try {
      // Set due date to 30 days from now
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)

      const res = await authFetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          dueDate: dueDate.toISOString(),
        })
      })

      const data = await res.json()

      if (res.ok) {
        setInvoiceCreated(data.invoice.id)
        router.push(`/invoices/${data.invoice.id}`)
      } else {
        setError(data.details ? `${data.error}: ${data.details}` : data.error || 'Failed to create invoice')
      }
    } catch {
      setError('Failed to create invoice')
    } finally {
      setCreatingInvoice(false)
    }
  }

  const handleCreateQuote = async () => {
    if (!order) return
    setCreatingQuote(true)

    try {
      // Set validity to 30 days from now
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + 30)

      const res = await authFetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          type: 'QUOTE',
          validUntil: validUntil.toISOString(),
        })
      })

      const data = await res.json()

      if (res.ok) {
        setQuoteCreated(data.invoice.id)
        router.push(`/quotes/${data.invoice.id}`)
      } else {
        setError(data.details ? `${data.error}: ${data.details}` : data.error || 'Failed to create quote')
      }
    } catch {
      setError('Failed to create quote')
    } finally {
      setCreatingQuote(false)
    }
  }

  const handleCreateProformaInvoice = async () => {
    if (!order) return
    setCreatingProforma(true)

    try {
      // Set due date to 7 days from now (standard for proforma)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 7)

      const res = await authFetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          type: 'PROFORMA',
          dueDate: dueDate.toISOString(),
        })
      })

      const data = await res.json()

      if (res.ok) {
        setProformaCreated(data.invoice.id)
        router.push(`/invoices/${data.invoice.id}`)
      } else {
        setError(data.details ? `${data.error}: ${data.details}` : data.error || 'Failed to create proforma invoice')
      }
    } catch {
      setError('Failed to create proforma invoice')
    } finally {
      setCreatingProforma(false)
    }
  }

  const handleCreatePackingList = async (type: 'export' | 'factory') => {
    if (!order) return

    try {
      const res = await authFetch('/api/packing-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type === 'export' ? 'EXPORT' : 'FACTORY',
          orderId: order.id,
          language: type === 'factory' ? 'cn' : 'en',
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to create packing list')
        return
      }

      const data = await res.json()
      const pl = data.packingList

      // Navigate to the correct detail page
      if (type === 'export') {
        router.push(`/packing-lists/export/${pl.id}`)
      } else {
        router.push(`/packing-lists/${pl.id}`)
      }
    } catch {
      setError('Failed to create packing list')
    }
  }

  const handleCreateSubstitution = async () => {
    if (!order || !selectedLineForSubstitution) return
    setCreatingSubstitution(true)

    try {
      const res = await fetch('/api/substitutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderLineId: selectedLineForSubstitution.id,
          originalProductId: selectedLineForSubstitution.product.id,
          originalQty: selectedLineForSubstitution.quantity,
          reason: substitutionReason
        })
      })

      if (res.ok) {
        const data = await res.json()
        setShowSubstitutionModal(false)
        setSelectedLineForSubstitution(null)
        router.push(`/substitutions/${data.substitution.id}`)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create substitution')
      }
    } catch {
      setError('Failed to create substitution')
    } finally {
      setCreatingSubstitution(false)
    }
  }

  const handleGenerateAll = async () => {
    if (!order) return
    const linesToGenerate = order.lines.map(l => ({
      orderLineId: l.id,
      productId: l.product.id,
      quantity: l.quantity,
      prefix: l.product.serialPrefix || null,
    }))
    const res = await authFetch(`/api/orders/${orderId}/serials`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: linesToGenerate }),
    })
    if (res.ok) {
      const data = await res.json()
      const grouped: Record<string, string[]> = {}
      for (const g of data.generated) {
        if (!grouped[g.orderLineId]) grouped[g.orderLineId] = []
        grouped[g.orderLineId].push(g.serial)
      }
      setSerials(prev => ({ ...prev, ...grouped }))
    }
  }

  const handleSaveSerials = async () => {
    setSavingSerials(true)
    setSerialErrors({})
    const serialsArray: { orderLineId: string; productId: string; serial: string }[] = []
    for (const [lineId, lineSerials] of Object.entries(serials)) {
      const line = order?.lines.find(l => l.id === lineId)
      if (!line) continue
      for (const s of lineSerials) {
        if (s && s.trim()) {
          serialsArray.push({ orderLineId: lineId, productId: line.product.id, serial: s.trim() })
        }
      }
    }
    // If no serials entered, just close
    if (serialsArray.length === 0) {
      setShowSerialModal(false)
      setSavingSerials(false)
      return
    }
    const res = await authFetch(`/api/orders/${orderId}/serials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serials: serialsArray }),
    })
    if (res.ok) {
      setShowSerialModal(false)
      fetchSerials()
    } else {
      const data = await res.json()
      if (data.conflicts) {
        const errs: Record<string, string> = {}
        for (const [serial, orderNum] of Object.entries(data.conflicts)) {
          errs[serial] = `Already used in order ${orderNum}`
        }
        setSerialErrors(errs)
      } else {
        setSerialErrors({ _global: data.error || 'Failed to save serials' })
      }
    }
    setSavingSerials(false)
  }

  const handleClearSerials = async () => {
    if (!confirm(`Clear all ${existingSerials.length} serial number(s) for this order? This cannot be undone.`)) return
    const res = await authFetch(`/api/orders/${orderId}/serials`, { method: 'DELETE' })
    if (res.ok) {
      setExistingSerials([])
      setSerials({})
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to clear serials')
    }
  }

  const handleSetupPaymentTracking = async () => {
    if (!order) return
    setCreatingPayment(true)

    try {
      // Calculate deposit (30%) and balance (70%)
      const total = order.totalAmount
      const deposit = Math.round(total * 0.3 * 100) / 100
      const balance = Math.round(total * 0.7 * 100) / 100
      
      // Due dates: deposit in 7 days, balance in 30 days
      const depositDue = new Date()
      depositDue.setDate(depositDue.getDate() + 7)
      const balanceDue = new Date()
      balanceDue.setDate(balanceDue.getDate() + 30)

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          totalAmount: total,
          depositRequired: deposit,
          depositDueDate: depositDue.toISOString(),
          balanceRequired: balance,
          balanceDueDate: balanceDue.toISOString(),
          currency: 'EUR'
        })
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/payments/${data.payment.id}`)
      } else {
        const data = await res.json()
        if (data.paymentId) {
          // Payment tracking already exists
          router.push(`/payments/${data.paymentId}`)
        } else {
          setError(data.error || 'Failed to setup payment tracking')
        }
      }
    } catch {
      setError('Failed to setup payment tracking')
    } finally {
      setCreatingPayment(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Package className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
          <p className="text-[15px] text-[#86868b]">{error || 'Order not found'}</p>
          <Link href="/orders" className="text-[#0071e3] text-[14px] mt-4 inline-block">Back to Orders</Link>
        </div>
      </div>
    )
  }

  const status = statusColors[order.status] || statusColors.DRAFT

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/orders" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to Orders
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f]">{order.orderNumber}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-[12px] font-medium px-2.5 py-1 rounded-md ${status.bg} ${status.text}`}>
                {order.status}
              </span>
              <span className="flex items-center gap-1 text-[13px] text-[#86868b]">
                <Clock className="w-3.5 h-3.5" />
                {new Date(order.createdAt).toLocaleDateString('en-GB', { 
                  day: 'numeric', month: 'short', year: 'numeric' 
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status selector */}
            <select
              value={order.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={saving || isEditing}
              className="h-10 px-4 bg-white border border-[#d2d2d7]/50 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-50"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Action buttons for confirmed+ orders */}
            {(order.status === 'CONFIRMED' || order.status === 'PREPARING' || order.status === 'READY' || order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
              <>
                {/* Payment Tracking button */}
                <button
                  onClick={handleSetupPaymentTracking}
                  disabled={creatingPayment}
                  className="inline-flex items-center gap-2 h-10 px-4 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  <DollarSign className="w-4 h-4" />
                  {creatingPayment ? 'Setting up...' : 'Payment Tracking'}
                </button>
                
                {/* Create Invoice button */}
                <button
                  onClick={handleCreateInvoice}
                  disabled={creatingInvoice}
                  className="inline-flex items-center gap-2 h-10 px-4 bg-[#34c759] hover:bg-[#2db350] text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  {creatingInvoice ? 'Creating...' : 'Create Invoice'}
                </button>
              </>
            )}

            {/* Serial Numbers button */}
            {!isEditing && (
              <button
                onClick={() => setShowSerialModal(true)}
                className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
              >
                <Hash className="w-4 h-4" />
                Serial Numbers
              </button>
            )}

            {/* Edit button */}
            {!isEditing ? (
              <button
                onClick={handleStartEditing}
                disabled={order.status === 'SHIPPED' || order.status === 'DELIVERED' || order.status === 'CANCELLED'}
                className="inline-flex items-center gap-2 h-10 px-4 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium rounded-xl transition-colors disabled:bg-[#86868b] disabled:cursor-not-allowed"
              >
                <Edit3 className="w-4 h-4" />
                Modify Order
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEditing}
                  className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#d2d2d7]/30 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#1d1d1f]">
                Order Items ({isEditing ? editedLines.length : order.lines.length})
              </h2>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <>
                    <button
                      onClick={handleOpenAddProducts}
                      className="inline-flex items-center gap-1.5 h-8 px-3 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[12px] font-medium rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Products
                    </button>
                    <span className="text-[12px] text-[#ff9500] font-medium flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" />
                      Editing Mode
                    </span>
                  </>
                )}
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-[#d2d2d7]/30 bg-[#f5f5f7]/50">
                  <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-6 py-3">Product</th>
                  <th className="text-center text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-6 py-3">Qty</th>
                  <th className="text-right text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-6 py-3">Price</th>
                  <th className="text-right text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-6 py-3">Total</th>
                  {isEditing && <th className="w-12"></th>}
                </tr>
              </thead>
              <tbody>
                {(isEditing ? editedLines : order.lines).map((line) => {
                  const originalLine = order.lines.find(l => l.id === line.id)
                  const qtyChanged = originalLine && originalLine.quantity !== line.quantity

                  return (
                    <tr key={line.id} className="border-b border-[#d2d2d7]/30 last:border-0">
                      <td className="px-6 py-4">
                        <p className="text-[14px] font-medium text-[#1d1d1f]">{line.product.nameEn}</p>
                        <p className="text-[12px] text-[#86868b] font-mono">{line.product.ref}</p>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleQuantityChange(line.id, -1)}
                              disabled={line.quantity <= 1}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#f5f5f7] hover:bg-[#e8e8ed] disabled:opacity-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => handleQuantityInput(line.id, e.target.value)}
                              onBlur={(e) => handleQuantityInput(line.id, e.target.value)}
                              className={`w-14 text-center text-[14px] font-medium rounded-lg border px-1 py-1 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${qtyChanged ? 'text-[#ff9500] border-[#ff9500]/40 bg-[#ff9500]/5' : 'text-[#1d1d1f] border-[#d2d2d7]/50 bg-white'}`}
                            />
                            <button
                              onClick={() => handleQuantityChange(line.id, 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#f5f5f7] hover:bg-[#e8e8ed]"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-center text-[14px] text-[#1d1d1f]">{line.quantity}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-[14px] text-[#1d1d1f]">
                        {currencySymbol}{formatNumber(line.unitPrice)}
                      </td>
                      <td className="px-6 py-4 text-right text-[14px] font-medium text-[#1d1d1f]">
                        {currencySymbol}{formatNumber(line.lineTotal)}
                      </td>
                      {isEditing && (
                        <td className="px-3 py-4">
                          <button
                            onClick={() => handleRemoveLine(line.id)}
                            className="p-2 hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-[#ff3b30]" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="px-6 py-4 bg-[#f5f5f7]/50 border-t border-[#d2d2d7]/30 space-y-2">
              <div className="flex justify-between text-[14px]">
                <span className="text-[#86868b]">Subtotal</span>
                <span className="text-[#1d1d1f]">{currencySymbol}{formatNumber(isEditing ? editedSubtotal : order.subtotal)}</span>
              </div>
              {order.shippingFee > 0 && (
                <div className="flex justify-between text-[14px]">
                  <span className="text-[#86868b]">Shipping</span>
                  <span className="text-[#1d1d1f]">{currencySymbol}{formatNumber(order.shippingFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-[17px] font-semibold pt-2 border-t border-[#d2d2d7]/30">
                <span className="text-[#1d1d1f]">Total</span>
                <span className="text-[#1d1d1f]">
                  {currencySymbol}{formatNumber((isEditing ? editedSubtotal : order.subtotal) + (order.shippingFee || 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned serial numbers summary */}
          {existingSerials.length > 0 && (
            <div className="mt-4 p-4 bg-[#f5f5f7] rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-[#1d1d1f]">Serial Numbers</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSerialModal(true)}
                    className="text-[12px] text-[#0071e3] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleClearSerials}
                    className="text-[12px] text-[#ff3b30] hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear all
                  </button>
                </div>
              </div>
              {order?.lines.filter(l => l.product?.requiresSerial).map(line => {
                const lineSerials = existingSerials.filter(s => s.orderLineId === line.id)
                return (
                  <div key={line.id} className="mb-2">
                    <p className="text-[12px] font-medium text-[#86868b]">{line.product.nameEn}</p>
                    <p className="text-[12px] text-[#1d1d1f] font-mono mt-0.5">
                      {lineSerials.map(s => s.serial).join(', ')}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Serial assignment prompt if serials required but not yet assigned */}
          {order && order.lines.some(l => l.product?.requiresSerial) && existingSerials.length === 0 && (
            <div className="mt-4 p-4 bg-[#ff9500]/5 border border-[#ff9500]/20 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-[#ff9500]">Serial numbers required</p>
                <p className="text-[12px] text-[#86868b] mt-0.5">Assign serial numbers before confirming this order</p>
              </div>
              <button
                onClick={() => setShowSerialModal(true)}
                className="inline-flex items-center gap-2 bg-[#ff9500] hover:bg-[#ff9f0a] text-white text-[13px] font-medium px-4 h-9 rounded-xl transition-colors"
              >
                Assign Serials
              </button>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">Notes</h2>
            {isEditing ? (
              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                rows={3}
                placeholder="Add notes..."
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
              />
            ) : (
              <p className="text-[14px] text-[#1d1d1f]">{order.notesEn || 'No notes'}</p>
            )}
          </div>

          {/* Modification Reason (when editing) */}
          {isEditing && hasChanges && (
            <div className="bg-[#ff9500]/5 border border-[#ff9500]/20 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#ff9500] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-2">Modification Reason</h3>
                  <p className="text-[13px] text-[#86868b] mb-3">
                    Please provide a reason for this modification. This will be recorded in the order history.
                  </p>
                  <textarea
                    value={modificationReason}
                    onChange={(e) => setModificationReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. Customer requested quantity change..."
                    className="w-full px-4 py-3 bg-white border border-[#d2d2d7]/30 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff9500] resize-none"
                  />
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving || !modificationReason.trim()}
                    className="mt-4 inline-flex items-center gap-2 h-10 px-5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium rounded-xl transition-colors disabled:bg-[#86868b]"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Customer Info */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Customer</h2>
            <Link 
              href={`/customers/${order.customer.id}`}
              className="text-[14px] font-medium text-[#0071e3] hover:text-[#0077ed]"
            >
              {order.customer.companyName}
            </Link>
            {order.customer.contactName && (
              <p className="text-[13px] text-[#86868b] mt-1">{order.customer.contactName}</p>
            )}
            {order.customer.email && (
              <p className="text-[13px] text-[#0071e3] mt-1">{order.customer.email}</p>
            )}
            {order.customer.country && (
              <p className="flex items-center gap-1 text-[13px] text-[#86868b] mt-2">
                <MapPin className="w-3.5 h-3.5" />
                {order.customer.country}
              </p>
            )}
          </div>

          {/* Shipping Address */}
          {order.customer.shippingAddress && (
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
              <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">Shipping Address</h2>
              <p className="text-[14px] text-[#1d1d1f] whitespace-pre-line">{order.customer.shippingAddress}</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Actions</h2>
            <div className="space-y-2">
              <button 
                onClick={handleCreateInvoice}
                disabled={creatingInvoice}
                className="w-full h-10 flex items-center justify-center gap-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                Generate Invoice
              </button>
              <button 
                onClick={handleCreateQuote}
                disabled={creatingQuote}
                className="w-full h-10 flex items-center justify-center gap-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                <ClipboardList className="w-4 h-4" />
                {creatingQuote ? 'Creating...' : 'Generate Quote'}
              </button>
              <button 
                onClick={handleCreateProformaInvoice}
                disabled={creatingProforma}
                className="w-full h-10 flex items-center justify-center gap-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                <FileCheck className="w-4 h-4" />
                {creatingProforma ? 'Creating...' : 'Generate Proforma Invoice'}
              </button>
              <button 
                onClick={handleSetupPaymentTracking}
                disabled={creatingPayment}
                className="w-full h-10 flex items-center justify-center gap-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                <DollarSign className="w-4 h-4" />
                Payment Tracking
              </button>
              <button 
                onClick={() => setShowSubstitutionModal(true)}
                className="w-full h-10 flex items-center justify-center gap-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[13px] font-medium rounded-xl transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Product Substitution
              </button>
              <button 
                onClick={() => handleCreatePackingList('export')}
                className="w-full h-10 flex items-center justify-center gap-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[13px] font-medium rounded-xl transition-colors"
              >
                <Package className="w-4 h-4" />
                Export Packing List
              </button>
              <button 
                onClick={() => handleCreatePackingList('factory')}
                className="w-full h-10 flex items-center justify-center gap-2 bg-[#ff9500]/10 hover:bg-[#ff9500]/20 text-[#ff9500] text-[13px] font-medium rounded-xl transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
                Factory Packing List
              </button>
              <Link
                href={`/shipments/new?order=${orderId}`}
                className="w-full h-10 flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#0077ED] text-white text-[13px] font-medium rounded-xl transition-colors"
              >
                <Ship className="w-4 h-4" />
                Add to Shipment
              </Link>
            </div>
          </div>

          {/* Order History */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
              <History className="w-4 h-4" />
              Order History
            </h2>
            <div className="space-y-3">
              {/* Order created — always first */}
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#34c759] rounded-full mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-[13px] text-[#1d1d1f]">Order created</p>
                  <p className="text-[11px] text-[#86868b]">
                    {new Date(order.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              {/* Audit log entries */}
              {orderHistory.map(entry => {
                const meta = entry.metadata as Record<string, unknown> | null
                const isModification = entry.action === 'UPDATE'
                const isStatusChange = isModification && (entry.changes as Record<string, unknown> | null)?.status
                const dotColor = isStatusChange ? 'bg-[#0071e3]' : 'bg-[#ff9500]'
                const label = isStatusChange
                  ? `Status → ${((entry.changes as Record<string, unknown>)?.status as Record<string, unknown>)?.new as string}`
                  : meta?.modificationReason
                    ? `Modified — "${meta.modificationReason as string}"`
                    : 'Order modified'
                return (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 ${dotColor} rounded-full mt-1.5 flex-shrink-0`} />
                    <div>
                      <p className="text-[13px] text-[#1d1d1f]">{label}</p>
                      {entry.userEmail && (
                        <p className="text-[11px] text-[#86868b]">by {entry.userEmail}</p>
                      )}
                      <p className="text-[11px] text-[#86868b]">
                        {new Date(entry.timestamp).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Substitution Modal */}
      {showSubstitutionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Create Substitution Request</h2>
              <button onClick={() => { setShowSubstitutionModal(false); setSelectedLineForSubstitution(null); }}>
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
            
            {/* Select product */}
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-[#86868b] mb-2">
                Select Product (Out of Stock)
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {order.lines.map(line => (
                  <button
                    key={line.id}
                    onClick={() => setSelectedLineForSubstitution(line)}
                    className={`w-full p-3 rounded-xl text-left flex items-center gap-3 transition-colors ${
                      selectedLineForSubstitution?.id === line.id
                        ? 'bg-[#0071e3]/10 border-2 border-[#0071e3]'
                        : 'bg-[#f5f5f7] border-2 border-transparent hover:bg-[#e8e8ed]'
                    }`}
                  >
                    <Package className="w-5 h-5 text-[#86868b]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{line.product.ref}</p>
                      <p className="text-[12px] text-[#86868b] truncate">{line.product.nameEn}</p>
                    </div>
                    <span className="text-[13px] text-[#86868b]">×{line.quantity}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className="mb-6">
              <label className="block text-[13px] font-medium text-[#86868b] mb-2">
                Reason
              </label>
              <select
                value={substitutionReason}
                onChange={(e) => setSubstitutionReason(e.target.value)}
                className="w-full h-10 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="Out of stock">Out of stock</option>
                <option value="Discontinued">Discontinued</option>
                <option value="Quality issue">Quality issue</option>
                <option value="Price change">Price change</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowSubstitutionModal(false); setSelectedLineForSubstitution(null); }}
                className="flex-1 h-11 text-[14px] font-medium text-[#1d1d1f] bg-[#f5f5f7] rounded-xl hover:bg-[#e8e8ed] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubstitution}
                disabled={!selectedLineForSubstitution || creatingSubstitution}
                className="flex-1 h-11 flex items-center justify-center gap-2 text-[14px] font-medium text-white bg-[#0071e3] rounded-xl hover:bg-[#0077ed] transition-colors disabled:opacity-50"
              >
                {creatingSubstitution ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4" />
                )}
                Create Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Serial Assignment Modal */}
      {showSerialModal && order && (
        <Portal>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: 100000 }} onClick={() => setShowSerialModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ zIndex: 100001, maxHeight: '85vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#d2d2d7]/30">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Assign Serial Numbers</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateAll}
                  className="inline-flex items-center gap-1.5 text-[13px] text-[#0071e3] hover:text-[#0077ed] font-medium"
                >
                  Generate All
                </button>
                <button onClick={() => setShowSerialModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f7]">
                  <X className="w-4 h-4 text-[#86868b]" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(85vh - 130px)' }}>
              {serialErrors._global && (
                <div className="p-3 bg-[#ff3b30]/10 rounded-xl text-[13px] text-[#ff3b30]">{serialErrors._global}</div>
              )}
              {order.lines.length === 0 && (
                <p className="text-[13px] text-[#86868b] text-center py-4">No order lines found.</p>
              )}
              {order.lines.map(line => (
                <div key={line.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-[#1d1d1f]">{line.product.nameEn}</p>
                        {line.product?.requiresSerial && (
                          <span className="text-[10px] bg-[#ff9500]/15 text-[#ff9500] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">Required</span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#86868b]">{line.quantity} unit{line.quantity !== 1 ? 's' : ''} · ref: {line.product.ref}</p>
                    </div>
                    <button
                      onClick={async () => {
                        const res = await authFetch(`/api/orders/${orderId}/serials`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ lines: [{ orderLineId: line.id, productId: line.product.id, quantity: line.quantity, prefix: line.product.serialPrefix }] }),
                        })
                        if (res.ok) {
                          const data = await res.json()
                          setSerials(prev => ({ ...prev, [line.id]: data.generated.map((g: { serial: string }) => g.serial) }))
                        }
                      }}
                      className="text-[12px] text-[#0071e3] hover:underline font-medium"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: line.quantity }).map((_, idx) => {
                      const val = serials[line.id]?.[idx] || ''
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[12px] text-[#86868b] w-8 text-right flex-shrink-0">{idx + 1}.</span>
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={val}
                              onChange={e => {
                                const updated = [...(serials[line.id] || Array(line.quantity).fill(''))]
                                updated[idx] = e.target.value
                                setSerials(prev => ({ ...prev, [line.id]: updated }))
                                if (serialErrors[val]) {
                                  setSerialErrors(prev => { const n = { ...prev }; delete n[val]; return n })
                                }
                              }}
                              placeholder={`Serial ${idx + 1}${line.product.serialPrefix ? ` (e.g. ${line.product.serialPrefix}...)` : ''}`}
                              className={`w-full h-10 px-3 rounded-xl text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
                                serialErrors[val] ? 'bg-[#ff3b30]/5 border border-[#ff3b30]/40 ring-1 ring-[#ff3b30]' : 'bg-[#f5f5f7]'
                              }`}
                            />
                            {serialErrors[val] && (
                              <p className="text-[11px] text-[#ff3b30] mt-0.5 px-1">{serialErrors[val]}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3">
                    <details className="group">
                      <summary className="text-[12px] text-[#0071e3] cursor-pointer hover:underline list-none">
                        Paste a list of serials
                      </summary>
                      <div className="mt-2">
                        <textarea
                          placeholder="Paste one serial per line..."
                          rows={4}
                          className="w-full px-3 py-2 bg-[#f5f5f7] rounded-xl text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          onChange={e => {
                            const lines_val = e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                            setSerials(prev => ({ ...prev, [line.id]: lines_val.slice(0, line.quantity) }))
                          }}
                        />
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-[#d2d2d7]/30 flex items-center justify-between">
              <p className="text-[12px] text-[#86868b]">
                {Object.values(serials).flat().filter(Boolean).length} / {order.lines.reduce((s, l) => s + l.quantity, 0)} serials assigned
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowSerialModal(false)} className="h-10 px-4 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSaveSerials}
                  disabled={savingSerials}
                  className="h-10 px-5 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {savingSerials ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Serials'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Add Products Modal */}
      {showAddProductsModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddProductsModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[#d2d2d7]/30">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Add Products</h2>
                <button onClick={() => setShowAddProductsModal(false)} className="p-2 hover:bg-[#f5f5f7] rounded-lg">
                  <X className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>
              
              {/* Search */}
              <div className="p-4 border-b border-[#d2d2d7]/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    autoFocus
                  />
                </div>
              </div>
              
              {/* Products List */}
              <div className="max-h-[50vh] overflow-y-auto">
                {productsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0071e3]" />
                  </div>
                ) : filteredAvailableProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-10 h-10 text-[#d2d2d7] mx-auto mb-2" />
                    <p className="text-[14px] text-[#86868b]">No products found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#d2d2d7]/30">
                    {filteredAvailableProducts.slice(0, 50).map(product => {
                      const price = getPrice(product.priceDistributor)
                      const alreadyInOrder = editedLines.find(line => line.product.id === product.id)
                      
                      return (
                        <div key={product.id} className={`flex items-center gap-3 p-4 hover:bg-[#f5f5f7] transition-colors ${alreadyInOrder ? 'bg-[#0071e3]/5' : ''}`}>
                          <div className="w-12 h-12 bg-[#f5f5f7] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                            {product.photoUrl ? (
                              <Image src={product.photoUrl} alt={product.nameEn} width={48} height={48} className="object-cover" unoptimized />
                            ) : (
                              <Package className="w-6 h-6 text-[#86868b]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{product.nameEn}</p>
                            <p className="text-[12px] text-[#86868b] font-mono">{product.ref}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[14px] font-semibold text-[#0071e3]">{currencySymbol}{price.toFixed(2)}</p>
                            {alreadyInOrder && (
                              <p className="text-[11px] text-[#0071e3]">{alreadyInOrder.quantity} in order</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddProduct(product, 1)}
                            className="h-9 px-4 bg-[#0071e3] text-white text-[13px] font-medium rounded-lg hover:bg-[#0077ed] flex items-center gap-2 flex-shrink-0"
                          >
                            <Plus className="w-4 h-4" />
                            Add
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-[#d2d2d7]/30 bg-[#f5f5f7]">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-[#86868b]">
                    {editedLines.length} items in order
                  </p>
                  <button
                    onClick={() => setShowAddProductsModal(false)}
                    className="h-10 px-6 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed]"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
