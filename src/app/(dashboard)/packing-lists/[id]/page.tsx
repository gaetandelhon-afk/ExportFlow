'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, Save, Loader2, Plus, Trash2, GripVertical,
  Package, Download, Eye, AlertCircle, Send, Edit3, X
} from 'lucide-react'
import { EmailModal, EmailData } from '@/components/EmailModal'
import { DocumentExportDropdown } from '@/components/DocumentExportDropdown'
import { DocumentTemplate, getTemplatesForType, getTemplateById } from '@/lib/documentTemplates'

interface PackingListItem {
  id: string
  productRef: string
  productName: string
  quantity: number
  unitWeight: number
  totalWeight: number
  dimensions?: string
  notes?: string
}

interface PackingList {
  id: string
  packingListNumber: string
  orderId: string
  orderNumber: string
  customerName: string
  status: 'draft' | 'ready' | 'shipped' | 'delivered'
  shippingMethod: string
  trackingNumber?: string
  carrierName?: string
  shipToCompany?: string
  shipToContact?: string
  shipToAddress?: string
  shipToCity?: string
  shipToPostalCode?: string
  shipToCountry?: string
  shipToPhone?: string
  items: PackingListItem[]
  totalPackages: number
  totalWeight: number
  notes: string
  specialInstructions?: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'orderbridge_packing_lists'

export default function PackingListEditPage() {
  const params = useParams()
  const router = useRouter()
  const packingListId = params.id as string
  const isNew = packingListId === 'new'
  
  const [packingList, setPackingList] = useState<PackingList | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orders, setOrders] = useState<Array<{ id: string; number: string; customerName: string; items: Array<{ productId: string; productRef: string; productName: string; quantity: number }> }>>([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'shipping'>('details')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Edit number/date modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ plNumber: '', plDate: '' })
  const [updating, setUpdating] = useState(false)

  // Template state
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [applyingTemplate, setApplyingTemplate] = useState(false)

  useEffect(() => {
    loadData()
    // Load templates
    const loadTemplates = async () => {
      const factoryPlTemplates = await getTemplatesForType('packingListFactory')
      setTemplates(factoryPlTemplates)
    }
    loadTemplates()
  }, [packingListId])

  const loadData = async () => {
    try {
      // Load orders for selection
      const ordersRes = await fetch('/api/orders')
      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(data.orders || [])
      }

      if (isNew) {
        // Create new packing list
        const newPl: PackingList = {
          id: `pl_${Date.now()}`,
          packingListNumber: `PL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
          orderId: '',
          orderNumber: '',
          customerName: '',
          status: 'draft',
          shippingMethod: '',
          trackingNumber: '',
          carrierName: '',
          shipToCompany: '',
          shipToContact: '',
          shipToAddress: '',
          shipToCity: '',
          shipToPostalCode: '',
          shipToCountry: '',
          shipToPhone: '',
          items: [],
          totalPackages: 1,
          totalWeight: 0,
          notes: '',
          specialInstructions: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setPackingList(newPl)
      } else {
        // Try API first (PLs created via the new flow are in DB, not localStorage)
        const apiRes = await fetch(`/api/packing-lists/${packingListId}`)
        if (apiRes.ok) {
          const apiData = await apiRes.json()
          const pl = apiData.packingList
          // Map API response to page interface
          const mapped: PackingList = {
            id: pl.id,
            packingListNumber: pl.packingListNumber,
            orderId: pl.orderId || '',
            orderNumber: pl.orderNumber || '',
            customerName: pl.customerName || '',
            status: (pl.status?.toLowerCase() as PackingList['status']) || 'draft',
            shippingMethod: pl.shippingMethod || '',
            trackingNumber: pl.trackingNumber || '',
            carrierName: pl.carrierName || '',
            shipToCompany: pl.consignee || '',
            shipToContact: '',
            shipToAddress: '',
            shipToCity: '',
            shipToPostalCode: '',
            shipToCountry: '',
            shipToPhone: '',
            items: (pl.lines || []).map((l: { id: string; sortOrder: number; specification: string; quantity: number; unitWeight?: number; grossWeight?: number; cbm?: number; lineNotes?: string }) => ({
              id: l.id,
              productRef: '',
              productName: l.specification || '',
              quantity: l.quantity || 0,
              unitWeight: Number(l.grossWeight || 0) / Math.max(l.quantity || 1, 1),
              totalWeight: Number(l.grossWeight || 0),
              dimensions: l.cbm ? `${l.cbm} CBM` : '',
              notes: l.lineNotes || '',
            })),
            totalPackages: pl.totalPackages || 1,
            totalWeight: Number(pl.totalWeight || pl.totalGrossWeight || 0),
            notes: pl.notes || '',
            specialInstructions: '',
            createdAt: pl.createdAt,
            updatedAt: pl.updatedAt,
          }
          setPackingList(mapped)
        } else {
          // Fall back to localStorage for legacy PLs
          const stored = localStorage.getItem(STORAGE_KEY)
          const lists: PackingList[] = stored ? JSON.parse(stored) : []
          const found = lists.find(pl => pl.id === packingListId)
          if (found) {
            setPackingList(found)
          } else {
            router.push('/packing-lists')
            return
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOrderSelect = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order || !packingList) return

    // Populate packing list from order
    const items: PackingListItem[] = order.items.map((item, index) => ({
      id: `item_${index}_${Date.now()}`,
      productRef: item.productRef || '',
      productName: item.productName || '',
      quantity: item.quantity || 1,
      unitWeight: 0, // Admin will fill this
      totalWeight: 0,
      dimensions: '',
      notes: '',
    }))

    setPackingList({
      ...packingList,
      orderId: order.id,
      orderNumber: order.number,
      customerName: order.customerName,
      items,
    })
    setSelectedOrderId(orderId)
  }

  const updateField = <K extends keyof PackingList>(field: K, value: PackingList[K]) => {
    if (!packingList) return
    setPackingList({ ...packingList, [field]: value, updatedAt: new Date().toISOString() })
  }

  const updateItem = (itemId: string, field: keyof PackingListItem, value: string | number) => {
    if (!packingList) return
    
    const updatedItems = packingList.items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value }
        // Recalculate total weight if unit weight or quantity changes
        if (field === 'unitWeight' || field === 'quantity') {
          updated.totalWeight = Number(updated.unitWeight) * Number(updated.quantity)
        }
        return updated
      }
      return item
    })
    
    // Recalculate total weight
    const totalWeight = updatedItems.reduce((sum, item) => sum + item.totalWeight, 0)
    
    setPackingList({ 
      ...packingList, 
      items: updatedItems, 
      totalWeight,
      updatedAt: new Date().toISOString() 
    })
  }

  const addItem = () => {
    if (!packingList) return
    
    const newItem: PackingListItem = {
      id: `item_${Date.now()}`,
      productRef: '',
      productName: '',
      quantity: 1,
      unitWeight: 0,
      totalWeight: 0,
      dimensions: '',
      notes: '',
    }
    
    setPackingList({
      ...packingList,
      items: [...packingList.items, newItem],
      updatedAt: new Date().toISOString(),
    })
  }

  const removeItem = (itemId: string) => {
    if (!packingList) return
    
    const updatedItems = packingList.items.filter(item => item.id !== itemId)
    const totalWeight = updatedItems.reduce((sum, item) => sum + item.totalWeight, 0)
    
    setPackingList({
      ...packingList,
      items: updatedItems,
      totalWeight,
      updatedAt: new Date().toISOString(),
    })
  }

  const handleSave = async () => {
    if (!packingList) return
    
    setSaving(true)
    try {
      if (isNew) {
        // New PL: save to localStorage (legacy path)
        const stored = localStorage.getItem(STORAGE_KEY)
        const lists: PackingList[] = stored ? JSON.parse(stored) : []
        lists.push(packingList)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
        router.push(`/packing-lists/${packingList.id}`)
      } else {
        // Existing PL: try API first, fall back to localStorage
        const res = await fetch(`/api/packing-lists/${packingList.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: packingList.notes,
            totalWeight: packingList.totalWeight,
            totalCartons: packingList.totalPackages,
          }),
        })
        if (res.ok) {
          setSuccessMessage('Saved!')
          setTimeout(() => setSuccessMessage(''), 2000)
        } else {
          // Fallback to localStorage for legacy PLs
          const stored = localStorage.getItem(STORAGE_KEY)
          const lists: PackingList[] = stored ? JSON.parse(stored) : []
          const index = lists.findIndex(pl => pl.id === packingList.id)
          if (index >= 0) lists[index] = packingList
          else lists.push(packingList)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
          setSuccessMessage('Saved!')
          setTimeout(() => setSuccessMessage(''), 2000)
        }
      }
    } catch (error) {
      console.error('Failed to save:', error)
      alert('Failed to save packing list')
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = () => {
    if (!packingList) return
    setEditForm({
      plNumber: packingList.packingListNumber,
      plDate: packingList.createdAt ? packingList.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
    })
    setShowEditModal(true)
  }

  const handleSaveNumberDate = async () => {
    if (!packingList) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/packing-lists/${packingList.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packingListNumber: editForm.plNumber,
          createdAt: editForm.plDate ? new Date(editForm.plDate).toISOString() : undefined,
        }),
      })
      if (res.ok) {
        setPackingList({ ...packingList, packingListNumber: editForm.plNumber, createdAt: editForm.plDate ? new Date(editForm.plDate).toISOString() : packingList.createdAt })
        setShowEditModal(false)
        setSuccessMessage('Updated successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      }
    } catch (error) {
      console.error('Failed to update:', error)
    } finally {
      setUpdating(false)
    }
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
        
        // Apply template settings for factory packing list
        if (template.settings.layoutElements) {
          settings.factoryPackingListLayout = template.settings.layoutElements
        }
        if (template.settings.tableColumns) {
          settings.factoryPackingListTableColumns = template.settings.tableColumns
        }
        if (template.settings.margins) {
          settings.marginTop = template.settings.margins.top
          settings.marginBottom = template.settings.margins.bottom
          settings.marginLeft = template.settings.margins.left
          settings.marginRight = template.settings.margins.right
        }
        
        localStorage.setItem('orderbridge_document_settings', JSON.stringify(settings))
        setSelectedTemplateId(templateId)
        setSuccessMessage(`Template "${template.name}" applied!`)
        setTimeout(() => setSuccessMessage(''), 2000)
      } catch (e) {
        console.error('Failed to apply template:', e)
      }
    }
    
    setTimeout(() => setApplyingTemplate(false), 500)
  }

  const handleDownloadPdf = async () => {
    if (!packingList) return
    
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    let y = 20
    
    // Title
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 113, 227)
    doc.text('PACKING LIST', pageWidth / 2, y, { align: 'center' })
    y += 15
    
    // Info
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(`N°: ${packingList.packingListNumber}`, 20, y)
    doc.text(`Date: ${new Date(packingList.createdAt).toLocaleDateString('fr-FR')}`, pageWidth - 20, y, { align: 'right' })
    y += 7
    doc.text(`Order: ${packingList.orderNumber}`, 20, y)
    y += 7
    doc.text(`Customer: ${packingList.customerName}`, 20, y)
    y += 15
    
    // Ship To
    if (packingList.shipToCompany || packingList.shipToAddress) {
      doc.setFont('helvetica', 'bold')
      doc.text('SHIP TO:', 20, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      if (packingList.shipToCompany) { doc.text(packingList.shipToCompany, 20, y); y += 5 }
      if (packingList.shipToContact) { doc.text(packingList.shipToContact, 20, y); y += 5 }
      if (packingList.shipToAddress) { doc.text(packingList.shipToAddress, 20, y); y += 5 }
      if (packingList.shipToCity || packingList.shipToPostalCode) {
        doc.text(`${packingList.shipToPostalCode} ${packingList.shipToCity}`, 20, y)
        y += 5
      }
      if (packingList.shipToCountry) { doc.text(packingList.shipToCountry, 20, y); y += 5 }
      if (packingList.shipToPhone) { doc.text(`Tel: ${packingList.shipToPhone}`, 20, y); y += 5 }
      y += 5
    }
    
    // Shipping info
    doc.setFontSize(10)
    if (packingList.carrierName) { doc.text(`Carrier: ${packingList.carrierName}`, 20, y); y += 5 }
    if (packingList.shippingMethod) { doc.text(`Method: ${packingList.shippingMethod}`, 20, y); y += 5 }
    if (packingList.trackingNumber) { doc.text(`Tracking: ${packingList.trackingNumber}`, 20, y); y += 5 }
    y += 10
    
    // Items table
    doc.setFillColor(0, 113, 227)
    doc.rect(20, y, pageWidth - 40, 8, 'F')
    y += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('#', 25, y)
    doc.text('Reference', 35, y)
    doc.text('Description', 70, y)
    doc.text('Qty', 125, y)
    doc.text('Unit Wt', 140, y)
    doc.text('Total Wt', 160, y)
    doc.text('Notes', pageWidth - 25, y, { align: 'right' })
    y += 8
    
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    
    packingList.items.forEach((item, index) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 247)
        doc.rect(20, y - 4, pageWidth - 40, 8, 'F')
      }
      
      doc.text(`${index + 1}`, 25, y)
      doc.text(item.productRef.substring(0, 18), 35, y)
      doc.text(item.productName.substring(0, 28), 70, y)
      doc.text(`${item.quantity}`, 125, y)
      doc.text(`${item.unitWeight.toFixed(2)}`, 140, y)
      doc.text(`${item.totalWeight.toFixed(2)}`, 160, y)
      if (item.notes) {
        doc.text(item.notes.substring(0, 12), pageWidth - 25, y, { align: 'right' })
      }
      y += 8
    })
    
    y += 10
    
    // Totals
    doc.setFont('helvetica', 'bold')
    doc.text(`Total Packages: ${packingList.totalPackages}`, 20, y)
    doc.text(`Total Weight: ${packingList.totalWeight.toFixed(2)} kg`, pageWidth - 20, y, { align: 'right' })
    y += 15
    
    // Notes
    if (packingList.notes) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Notes:', 20, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const lines = doc.splitTextToSize(packingList.notes, pageWidth - 40)
      doc.text(lines, 20, y)
      y += lines.length * 5 + 5
    }
    
    // Special instructions
    if (packingList.specialInstructions) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(255, 59, 48)
      doc.text('SPECIAL INSTRUCTIONS:', 20, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const lines = doc.splitTextToSize(packingList.specialInstructions, pageWidth - 40)
      doc.text(lines, 20, y)
    }
    
    doc.save(`packing-list-${packingList.packingListNumber}.pdf`)
  }

  const handleSendEmail = async (emailData: EmailData) => {
    if (!packingList) return
    
    const res = await fetch(`/api/packing-lists/${packingList.id}/send`, {
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
      setSuccessMessage('Packing list sent successfully!')
      // Reload to get updated status
      loadData()
      setTimeout(() => setSuccessMessage(''), 3000)
    } else {
      const data = await res.json()
      throw new Error(data.error || 'Failed to send email')
    }
  }
  
  const getDefaultEmailBody = () => {
    if (!packingList) return ''
    return `Hello,

Please find attached the packing list ${packingList.packingListNumber} for order ${packingList.orderNumber}.

Contents:
- Total packages: ${packingList.totalPackages}
- Total weight: ${packingList.totalWeight} kg
- Items: ${packingList.items.length}

${packingList.specialInstructions ? `Special Instructions: ${packingList.specialInstructions}` : ''}

Please let us know if you have any questions.

Best regards`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0071e3]"></div>
      </div>
    )
  }

  if (!packingList) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-[#ff3b30] mx-auto mb-4" />
        <h2 className="text-[17px] font-medium text-[#1d1d1f]">Packing list not found</h2>
        <Link href="/packing-lists" className="text-[#0071e3] hover:underline mt-2 block">
          Back to Packing Lists
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/packing-lists"
            className="p-2 hover:bg-[#f5f5f7] rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#86868b]" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
                {isNew ? 'New Packing List' : packingList.packingListNumber}
              </h1>
              {!isNew && (
                <button
                  onClick={openEditModal}
                  className="p-1.5 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                  title="Edit number & date"
                >
                  <Edit3 className="w-4 h-4 text-[#86868b]" />
                </button>
              )}
            </div>
            <p className="text-[15px] text-[#86868b] mt-1">
              {isNew ? 'Create a new packing list' : `Order ${packingList.orderNumber} - ${packingList.customerName}`}
              {!isNew && packingList.createdAt && (
                <span className="ml-2 text-[13px]">
                  · {new Date(packingList.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {!isNew && (
            <>
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
                className="flex items-center gap-2 px-4 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-xl text-[14px] font-medium hover:bg-[#e8e8ed] transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <DocumentExportDropdown
                data={{
                  packingListNumber: packingList.packingListNumber,
                  type: 'PACKING_LIST',
                  status: packingList.status,
                  orderNumber: packingList.orderNumber,
                  customerName: packingList.customerName,
                  totalWeight: packingList.items.reduce((sum, i) => sum + (Number(i.totalWeight) || 0), 0),
                  totalCartons: packingList.items.length,
                  lines: packingList.items.map(i => ({
                    ref: i.productRef,
                    nameEn: i.productName,
                    quantity: i.quantity,
                    unitPrice: i.unitWeight,
                    lineTotal: i.totalWeight
                  }))
                }}
                filename={`packing_list_${packingList.packingListNumber}`}
                title={`Packing List ${packingList.packingListNumber}`}
                documentType="packingList"
              />
              <button
                onClick={() => setShowEmailModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#34c759] text-white rounded-xl text-[14px] font-medium hover:bg-[#2db350] transition-colors"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Order Selection for New */}
      {isNew && (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Select Order</h3>
          <select
            value={selectedOrderId}
            onChange={(e) => handleOrderSelect(e.target.value)}
            className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          >
            <option value="">Select an order to create packing list from...</option>
            {orders.map(order => (
              <option key={order.id} value={order.id}>
                {order.number} - {order.customerName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#d2d2d7]/30 pb-2">
        {[
          { id: 'details' as const, label: 'Details' },
          { id: 'items' as const, label: `Items (${packingList.items.length})` },
          { id: 'shipping' as const, label: 'Shipping' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[#0071e3] text-white'
                : 'text-[#86868b] hover:bg-[#f5f5f7]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                Packing List Number
              </label>
              <input
                type="text"
                value={packingList.packingListNumber}
                onChange={(e) => updateField('packingListNumber', e.target.value)}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                Status
              </label>
              <select
                value={packingList.status}
                onChange={(e) => updateField('status', e.target.value as PackingList['status'])}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                Order Number
              </label>
              <input
                type="text"
                value={packingList.orderNumber}
                onChange={(e) => updateField('orderNumber', e.target.value)}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                Customer Name
              </label>
              <input
                type="text"
                value={packingList.customerName}
                onChange={(e) => updateField('customerName', e.target.value)}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                Total Packages
              </label>
              <input
                type="number"
                value={packingList.totalPackages}
                onChange={(e) => updateField('totalPackages', parseInt(e.target.value) || 1)}
                min={1}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                Total Weight (kg)
              </label>
              <input
                type="number"
                value={packingList.totalWeight}
                readOnly
                className="w-full h-10 px-3 bg-[#e8e8ed] border-0 rounded-lg text-[14px] cursor-not-allowed"
              />
              <p className="text-[11px] text-[#86868b] mt-1">Calculated from items</p>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
              Notes
            </label>
            <textarea
              value={packingList.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              placeholder="General notes for this packing list..."
              className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#ff3b30] mb-1.5">
              Special Instructions (visible on PDF)
            </label>
            <textarea
              value={packingList.specialInstructions || ''}
              onChange={(e) => updateField('specialInstructions', e.target.value)}
              rows={2}
              placeholder="FRAGILE - Handle with care, Keep dry, This side up..."
              className="w-full px-3 py-2 bg-[#fff5f5] border border-[#ff3b30]/20 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff3b30] resize-none"
            />
          </div>
        </div>
      )}

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <div className="p-4 border-b border-[#d2d2d7]/30 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Items</h3>
            <button
              onClick={addItem}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#0071e3] text-white rounded-lg text-[13px] font-medium hover:bg-[#0077ED] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {packingList.items.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-[#86868b] mx-auto mb-3" />
              <p className="text-[14px] text-[#86868b]">No items yet. Add items or select an order.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#d2d2d7]/20">
              {packingList.items.map((item, index) => (
                <div key={item.id} className="p-4 hover:bg-[#f5f5f7]/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2 pt-2">
                      <GripVertical className="w-4 h-4 text-[#86868b] cursor-move" />
                      <span className="text-[13px] font-medium text-[#86868b] w-6">{index + 1}</span>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-6 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-[#86868b] mb-1">Reference</label>
                        <input
                          type="text"
                          value={item.productRef}
                          onChange={(e) => updateItem(item.id, 'productRef', e.target.value)}
                          className="w-full h-9 px-2 bg-[#f5f5f7] border-0 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-medium text-[#86868b] mb-1">Description</label>
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                          className="w-full h-9 px-2 bg-[#f5f5f7] border-0 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#86868b] mb-1">Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          min={1}
                          className="w-full h-9 px-2 bg-[#f5f5f7] border-0 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#86868b] mb-1">Unit Wt (kg)</label>
                        <input
                          type="number"
                          value={item.unitWeight}
                          onChange={(e) => updateItem(item.id, 'unitWeight', parseFloat(e.target.value) || 0)}
                          step="0.01"
                          min={0}
                          className="w-full h-9 px-2 bg-[#f5f5f7] border-0 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#86868b] mb-1">Total Wt</label>
                        <input
                          type="text"
                          value={`${item.totalWeight.toFixed(2)} kg`}
                          readOnly
                          className="w-full h-9 px-2 bg-[#e8e8ed] border-0 rounded-lg text-[13px] cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="ml-12 mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-[#86868b] mb-1">Dimensions</label>
                      <input
                        type="text"
                        value={item.dimensions || ''}
                        onChange={(e) => updateItem(item.id, 'dimensions', e.target.value)}
                        placeholder="L x W x H cm"
                        className="w-full h-9 px-2 bg-[#f5f5f7] border-0 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#86868b] mb-1">Notes</label>
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                        placeholder="Fragile, Handle with care..."
                        className="w-full h-9 px-2 bg-[#f5f5f7] border-0 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {packingList.items.length > 0 && (
            <div className="p-4 bg-[#f5f5f7] border-t border-[#d2d2d7]/30">
              <div className="flex justify-end gap-8 text-[14px]">
                <span className="text-[#86868b]">
                  Total Items: <span className="font-semibold text-[#1d1d1f]">{packingList.items.reduce((sum, i) => sum + i.quantity, 0)}</span>
                </span>
                <span className="text-[#86868b]">
                  Total Weight: <span className="font-semibold text-[#1d1d1f]">{packingList.totalWeight.toFixed(2)} kg</span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shipping Tab */}
      {activeTab === 'shipping' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Carrier Information</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Carrier Name
                </label>
                <input
                  type="text"
                  value={packingList.carrierName || ''}
                  onChange={(e) => updateField('carrierName', e.target.value)}
                  placeholder="DHL, FedEx, UPS..."
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Shipping Method
                </label>
                <input
                  type="text"
                  value={packingList.shippingMethod}
                  onChange={(e) => updateField('shippingMethod', e.target.value)}
                  placeholder="Express, Standard, Sea Freight..."
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={packingList.trackingNumber || ''}
                  onChange={(e) => updateField('trackingNumber', e.target.value)}
                  placeholder="Enter tracking number..."
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Ship To Address</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  value={packingList.shipToCompany || ''}
                  onChange={(e) => updateField('shipToCompany', e.target.value)}
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={packingList.shipToContact || ''}
                  onChange={(e) => updateField('shipToContact', e.target.value)}
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  value={packingList.shipToAddress || ''}
                  onChange={(e) => updateField('shipToAddress', e.target.value)}
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={packingList.shipToCity || ''}
                  onChange={(e) => updateField('shipToCity', e.target.value)}
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={packingList.shipToPostalCode || ''}
                  onChange={(e) => updateField('shipToPostalCode', e.target.value)}
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  value={packingList.shipToCountry || ''}
                  onChange={(e) => updateField('shipToCountry', e.target.value)}
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Phone
                </label>
                <input
                  type="text"
                  value={packingList.shipToPhone || ''}
                  onChange={(e) => updateField('shipToPhone', e.target.value)}
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-[#34c759] text-white px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Email Modal */}
      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSend={handleSendEmail}
        documentType="Packing List"
        documentNumber={packingList?.packingListNumber || ''}
        defaultSubject={packingList ? `Packing List ${packingList.packingListNumber} - Order ${packingList.orderNumber}` : ''}
        defaultBody={getDefaultEmailBody()}
      />

      {/* Edit Number & Date Modal */}
      {showEditModal && packingList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Edit Packing List Details</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-[#f5f5f7] rounded-lg">
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">PL Number</label>
                <input
                  type="text"
                  value={editForm.plNumber}
                  onChange={(e) => setEditForm(prev => ({ ...prev, plNumber: e.target.value }))}
                  className="w-full h-10 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Date</label>
                <input
                  type="date"
                  value={editForm.plDate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, plDate: e.target.value }))}
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
                onClick={handleSaveNumberDate}
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
    </div>
  )
}
