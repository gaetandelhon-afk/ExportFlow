'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, Save, Loader2, Plus, Trash2,
  Package, Download, Send, Layers, Split, 
  FileText, Ship, Building2, Users, Truck, Edit3, X
} from 'lucide-react'
import { EmailModal, EmailData } from '@/components/EmailModal'
import { DocumentExportDropdown } from '@/components/DocumentExportDropdown'
import { generateExportPackingListPdf } from '@/lib/generatePdf'
import { DocumentTemplate, getTemplatesForType, getTemplateById } from '@/lib/documentTemplates'

// Types
interface PackingListLine {
  id: string
  sortOrder: number
  productId?: string
  hsCode: string
  specification: string
  unit: string
  quantity: number
  packages: number
  packageNumber?: number  // Which package this item belongs to (for grouping multiple items in one package)
  grossWeight: number
  netWeight: number
  cbm: number
  isGrouped: boolean
  groupedProductIds?: string[]
  lineNotes?: string
}

interface ShippingAgent {
  id: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
}

interface PackingListData {
  id: string
  packingListNumber: string
  type: 'EXPORT' | 'FACTORY'
  status: 'DRAFT' | 'GENERATED' | 'SENT'
  mode: 'simple' | 'advanced'
  language: string
  orderId: string
  orderNumber: string
  
  // Shipper (your company)
  shipper: string
  shipperTaxId: string
  
  // Customer (buyer)
  customerName: string
  customerAddress: string
  customerVat: string
  customerContact: string
  customerCustomFields: Array<{ label: string; value: string }>
  
  // Consignee (can be different from customer)
  consigneeSameAsCustomer: boolean
  consigneeName: string
  consigneeAddress: string
  consigneeContact: string
  consigneeCustomFields: Array<{ label: string; value: string }>
  
  // Shipping Agent
  useShippingAgent: boolean
  shippingAgentId?: string
  shippingAgentName: string
  shippingAgentAddress: string
  shippingAgentContact: string
  
  // Invoice & Shipping
  invoiceNumber: string
  invoiceDate: string
  shippingPort: string
  destinationPort: string
  
  // Totals (calculated)
  totalQuantity: number
  totalPackages: number
  totalGrossWeight: number
  totalNetWeight: number
  totalCbm: number
  
  // Grouping
  groupByHsCode: boolean
  
  // Content
  headerText: string
  footerText: string
  customNotes: string
  
  // Lines
  lines: PackingListLine[]
  
  // Meta
  createdAt: string
  updatedAt: string
  sentAt?: string
  sentTo?: string
}

const STORAGE_KEY = 'orderbridge_export_packing_lists_v2'
const UNITS = [
  { value: 'PCS', label: 'Pieces' },
  { value: 'PAIRS', label: 'Pairs' },
  { value: 'SETS', label: 'Sets' },
  { value: 'BOX', label: 'Box' },
  { value: 'CARTON', label: 'Carton' },
  { value: 'PALLET', label: 'Pallet' },
  { value: 'KG', label: 'Kilogram' },
  { value: 'M', label: 'Meter' },
  { value: 'M2', label: 'Sq. Meter' },
  { value: 'M3', label: 'Cubic Meter' },
  { value: 'ROLL', label: 'Roll' },
  { value: 'BUNDLE', label: 'Bundle' }
]

// Load document settings
const loadDocumentSettings = () => {
  try {
    const stored = localStorage.getItem('orderbridge_document_settings')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore
  }
  return null
}

export default function ExportPackingListEditPage() {
  const params = useParams()
  const router = useRouter()
  const packingListId = params.id as string
  const isNew = packingListId === 'new'
  
  const [packingList, setPackingList] = useState<PackingListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orders, setOrders] = useState<Array<{ 
    id: string
    orderNumber: string
    customerId: string
    customerName: string
    customerAddress?: string
    customerVat?: string
    customerContact?: string
    lines: Array<{ 
      productId: string
      productRef: string
      productName: string
      hsCode?: string
      quantity: number
      weightKg?: number
    }> 
  }>>([])
  const [shippingAgents, setShippingAgents] = useState<ShippingAgent[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [activeTab, setActiveTab] = useState<'shipper' | 'customer' | 'lines' | 'footer'>('lines')
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
      const exportPlTemplates = await getTemplatesForType('packingListExport')
      setTemplates(exportPlTemplates)
    }
    loadTemplates()
  }, [packingListId])

  const loadData = async () => {
    try {
      // Load orders
      const ordersRes = await fetch('/api/orders')
      if (ordersRes.ok) {
        const data = await ordersRes.json()
        console.log('Orders API response:', data)
        
        const ordersList = data.orders || []
        const mappedOrders = ordersList.map((o: { 
          id: string
          orderNumber: string
          customer?: { 
            id: string
            companyName: string
            billingAddress?: string
            vatNumber?: string
            contactName?: string
            shippingAgents?: ShippingAgent[]
          }
          lines?: Array<{ 
            product?: { 
              id: string
              ref: string
              nameEn: string
              hsCode?: string
              weightKg?: number 
            }
            quantity: number 
          }> 
        }) => {
          // Store shipping agents for this customer
          if (o.customer?.shippingAgents) {
            setShippingAgents(prev => {
              const existing = prev.map(a => a.id)
              const newAgents = o.customer!.shippingAgents!.filter(a => !existing.includes(a.id))
              return [...prev, ...newAgents]
            })
          }
          return {
            id: o.id,
            orderNumber: o.orderNumber,
            customerId: o.customer?.id || '',
            customerName: o.customer?.companyName || '',
            customerAddress: o.customer?.billingAddress || '',
            customerVat: o.customer?.vatNumber || '',
            customerContact: o.customer?.contactName || '',
            lines: o.lines?.map((l) => ({
              productId: l.product?.id || '',
              productRef: l.product?.ref || '',
              productName: l.product?.nameEn || '',
              hsCode: l.product?.hsCode || '',
              quantity: l.quantity,
              weightKg: l.product?.weightKg || 0
            })) || []
          }
        })
        
        console.log('Mapped orders:', mappedOrders)
        setOrders(mappedOrders)
      } else {
        console.error('Orders API error:', ordersRes.status, await ordersRes.text())
      }

      if (isNew) {
        const settings = loadDocumentSettings()
        const newPl: PackingListData = {
          id: `epl_${Date.now()}`,
          packingListNumber: `EPL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
          type: 'EXPORT',
          status: 'DRAFT',
          mode: 'simple',
          language: 'en',
          orderId: '',
          orderNumber: '',
          shipper: settings?.packingListExportDefaultShipper || '',
          shipperTaxId: '',
          customerName: '',
          customerAddress: '',
          customerVat: '',
          customerContact: '',
          customerCustomFields: [],
          consigneeSameAsCustomer: true,
          consigneeName: '',
          consigneeAddress: '',
          consigneeContact: '',
          consigneeCustomFields: [],
          useShippingAgent: false,
          shippingAgentName: '',
          shippingAgentAddress: '',
          shippingAgentContact: '',
          invoiceNumber: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          shippingPort: settings?.packingListExportDefaultShippingPort || '',
          destinationPort: '',
          totalQuantity: 0,
          totalPackages: 0,
          totalGrossWeight: 0,
          totalNetWeight: 0,
          totalCbm: 0,
          groupByHsCode: settings?.packingListExportGroupByHsCode || false,
          headerText: settings?.packingListExportHeader || '',
          footerText: settings?.packingListExportFooter || '',
          customNotes: settings?.packingListExportNotes || '',
          lines: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        setPackingList(newPl)
      } else {
        // Try API first (PLs created via the API are in DB, not localStorage)
        const apiRes = await fetch(`/api/packing-lists/${packingListId}`)
        if (apiRes.ok) {
          const apiData = await apiRes.json()
          const pl = apiData.packingList
          // Parse consignee field (stored as combined text in DB)
          const mapped: PackingListData = {
            id: pl.id,
            packingListNumber: pl.packingListNumber || '',
            type: (pl.type as 'EXPORT' | 'FACTORY') || 'EXPORT',
            status: (pl.status as 'DRAFT' | 'GENERATED' | 'SENT') || 'DRAFT',
            mode: (pl.mode as 'simple' | 'advanced') || 'simple',
            language: pl.language || 'en',
            orderId: pl.orderId || '',
            orderNumber: pl.orderNumber || '',
            shipper: pl.shipper || '',
            shipperTaxId: pl.shipperTaxId || '',
            customerName: pl.customerName || '',
            customerAddress: '',
            customerVat: '',
            customerContact: '',
            customerCustomFields: (() => { try { return JSON.parse(pl.customerCustomFields || '[]') } catch { return [] } })(),
            consigneeSameAsCustomer: !pl.consignee,
            consigneeName: pl.consignee || '',
            consigneeAddress: '',
            consigneeContact: '',
            consigneeCustomFields: (() => { try { return JSON.parse(pl.consigneeCustomFields || '[]') } catch { return [] } })(),
            useShippingAgent: false,
            shippingAgentName: '',
            shippingAgentAddress: '',
            shippingAgentContact: '',
            invoiceNumber: pl.invoiceNumber || '',
            invoiceDate: pl.invoiceDate ? new Date(pl.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            shippingPort: pl.shippingPort || '',
            destinationPort: pl.destinationPort || '',
            totalQuantity: 0,
            totalPackages: pl.totalPackages || 0,
            totalGrossWeight: Number(pl.totalGrossWeight || 0),
            totalNetWeight: Number(pl.totalNetWeight || 0),
            totalCbm: Number(pl.totalCbm || 0),
            groupByHsCode: pl.groupByHsCode || false,
            headerText: pl.headerText || '',
            footerText: pl.footerText || '',
            customNotes: pl.customNotes || '',
            lines: (() => {
              // If DB has saved lines, use them
              if (pl.lines && pl.lines.length > 0) {
                return pl.lines.map((l: {
                  id: string; sortOrder: number; productId?: string; hsCode?: string;
                  specification: string; unit: string; quantity: number; packages: number;
                  packageNumber?: number; grossWeight?: number; netWeight?: number; cbm?: number;
                  isGrouped: boolean; groupedProductIds?: string; lineNotes?: string;
                }) => ({
                  id: l.id,
                  sortOrder: l.sortOrder,
                  productId: l.productId || undefined,
                  hsCode: l.hsCode || '',
                  specification: l.specification || '',
                  unit: l.unit || 'PCS',
                  quantity: l.quantity,
                  packages: l.packages,
                  packageNumber: l.packageNumber || undefined,
                  grossWeight: Number(l.grossWeight || 0),
                  netWeight: Number(l.netWeight || 0),
                  cbm: Number(l.cbm || 0),
                  isGrouped: l.isGrouped || false,
                  groupedProductIds: l.groupedProductIds ? l.groupedProductIds.split(',').filter(Boolean) : undefined,
                  lineNotes: l.lineNotes || undefined,
                }))
              }
              // Auto-populate from shipment orders if lines are empty
              if (pl.shipment?.orders?.length > 0) {
                let sortIdx = 0
                const autoLines: PackingListLine[] = []
                for (const so of pl.shipment.orders) {
                  for (const line of (so.order?.lines || [])) {
                    const weight = line.product?.weightKg ? Number(line.product.weightKg) * line.quantity : 0
                    autoLines.push({
                      id: `auto_${sortIdx}`,
                      sortOrder: sortIdx++,
                      productId: line.product?.id,
                      hsCode: line.product?.hsCode || '',
                      specification: line.product?.nameEn || line.product?.ref || '',
                      unit: 'PCS',
                      quantity: line.quantity,
                      packages: 1,
                      grossWeight: weight * 1.05,
                      netWeight: weight,
                      cbm: 0,
                      isGrouped: false,
                    })
                  }
                }
                return autoLines
              }
              return []
            })(),
            createdAt: pl.createdAt,
            updatedAt: pl.updatedAt,
          }
          setPackingList(mapped)
          // Pre-select the linked order in the dropdown
          if (pl.orderId) setSelectedOrderId(pl.orderId)
          // Restore previously applied template
          const savedTemplate = localStorage.getItem(`exportpl_template_${packingListId}`)
          if (savedTemplate) setSelectedTemplateId(savedTemplate)
        } else {
          // Fallback to localStorage for legacy PLs
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            const allLists = JSON.parse(stored) as PackingListData[]
            const found = allLists.find(pl => pl.id === packingListId)
            if (found) {
              setPackingList(found)
            } else {
              router.push('/packing-lists/export')
            }
          } else {
            router.push('/packing-lists/export')
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals (accounting for grouped packages)
  const totals = useMemo(() => {
    if (!packingList) return { quantity: 0, packages: 0, uniquePackages: 0, grossWeight: 0, netWeight: 0, cbm: 0 }
    
    // For lines with packageNumber, group them and count unique packages
    const linesWithPkgNum = packingList.lines.filter(l => l.packageNumber !== undefined && l.packageNumber !== null)
    const linesWithoutPkgNum = packingList.lines.filter(l => l.packageNumber === undefined || l.packageNumber === null)
    
    // Count unique package numbers
    const uniquePkgNumbers = new Set(linesWithPkgNum.map(l => l.packageNumber))
    
    // Total packages = unique grouped packages + individual packages from non-grouped lines
    const totalPackagesCount = uniquePkgNumbers.size + linesWithoutPkgNum.reduce((sum, l) => sum + l.packages, 0)
    
    return {
      quantity: packingList.lines.reduce((sum, l) => sum + l.quantity, 0),
      packages: totalPackagesCount,
      uniquePackages: uniquePkgNumbers.size,
      grossWeight: packingList.lines.reduce((sum, l) => sum + l.grossWeight, 0),
      netWeight: packingList.lines.reduce((sum, l) => sum + l.netWeight, 0),
      cbm: packingList.lines.reduce((sum, l) => sum + l.cbm, 0)
    }
  }, [packingList?.lines])

  const handleOrderSelect = (orderId: string) => {
    if (!packingList) return
    
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    const lines: PackingListLine[] = order.lines.map((l, idx) => ({
      id: `line_${Date.now()}_${idx}`,
      sortOrder: idx,
      productId: l.productId,
      hsCode: l.hsCode || '',
      specification: l.productName,
      unit: 'PCS',
      quantity: l.quantity,
      packages: 1,
      grossWeight: (l.weightKg || 0) * l.quantity * 1.1,
      netWeight: (l.weightKg || 0) * l.quantity,
      cbm: 0,
      isGrouped: false
    }))

    setPackingList({
      ...packingList,
      orderId,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerAddress: order.customerAddress || '',
      customerVat: order.customerVat || '',
      customerContact: order.customerContact || '',
      lines,
      updatedAt: new Date().toISOString()
    })
    setSelectedOrderId(orderId)
  }

  const handleShippingAgentSelect = (agentId: string) => {
    if (!packingList) return
    
    const agent = shippingAgents.find(a => a.id === agentId)
    if (!agent) {
      setPackingList({
        ...packingList,
        useShippingAgent: false,
        shippingAgentId: undefined,
        shippingAgentName: '',
        shippingAgentAddress: '',
        shippingAgentContact: ''
      })
      return
    }

    setPackingList({
      ...packingList,
      useShippingAgent: true,
      shippingAgentId: agent.id,
      shippingAgentName: agent.name,
      shippingAgentAddress: agent.address || '',
      shippingAgentContact: agent.contactPerson ? `${agent.contactPerson}${agent.phone ? ` - ${agent.phone}` : ''}${agent.email ? ` - ${agent.email}` : ''}` : ''
    })
  }

  const updateLine = (lineId: string, field: keyof PackingListLine, value: string | number | boolean | undefined) => {
    if (!packingList) return
    
    setPackingList({
      ...packingList,
      lines: packingList.lines.map(l => 
        l.id === lineId ? { ...l, [field]: value } : l
      ),
      updatedAt: new Date().toISOString()
    })
  }

  const importFromShipmentOrders = async () => {
    if (!packingList) return
    try {
      const res = await fetch(`/api/packing-lists/${packingListId}`)
      if (!res.ok) return
      const data = await res.json()
      const pl = data.packingList
      if (!pl.shipment?.orders?.length) {
        alert('No shipment orders found to import from.')
        return
      }
      let sortIdx = packingList.lines.length
      const newLines: PackingListLine[] = []
      for (const so of pl.shipment.orders) {
        for (const line of (so.order?.lines || [])) {
          const weight = line.product?.weightKg ? Number(line.product.weightKg) * line.quantity : 0
          newLines.push({
            id: `auto_${Date.now()}_${sortIdx}`,
            sortOrder: sortIdx++,
            productId: line.product?.id,
            hsCode: line.product?.hsCode || '',
            specification: line.product?.nameEn || line.product?.ref || '',
            unit: 'PCS',
            quantity: line.quantity,
            packages: 1,
            grossWeight: weight * 1.05,
            netWeight: weight,
            cbm: 0,
            isGrouped: false,
          })
        }
      }
      setPackingList({ ...packingList, lines: [...packingList.lines, ...newLines] })
    } catch (e) {
      console.error('Failed to import from shipment orders:', e)
    }
  }

  const addLine = () => {
    if (!packingList) return
    
    const newLine: PackingListLine = {
      id: `line_${Date.now()}`,
      sortOrder: packingList.lines.length,
      hsCode: '',
      specification: '',
      unit: 'PCS',
      quantity: 1,
      packages: 1,
      grossWeight: 0,
      netWeight: 0,
      cbm: 0,
      isGrouped: false
    }
    
    setPackingList({
      ...packingList,
      lines: [...packingList.lines, newLine],
      updatedAt: new Date().toISOString()
    })
  }

  const removeLine = (lineId: string) => {
    if (!packingList) return
    
    setPackingList({
      ...packingList,
      lines: packingList.lines.filter(l => l.id !== lineId),
      updatedAt: new Date().toISOString()
    })
  }

  const groupByHsCode = () => {
    if (!packingList) return
    
    const hsGroups: Record<string, PackingListLine[]> = {}
    packingList.lines.forEach(line => {
      const key = line.hsCode || 'NO_HS'
      if (!hsGroups[key]) hsGroups[key] = []
      hsGroups[key].push(line)
    })

    const consolidatedLines: PackingListLine[] = Object.entries(hsGroups).map(([hsCode, lines], idx) => {
      if (lines.length === 1) return lines[0]
      
      const specs = [...new Set(lines.map(l => l.specification))].join(', ')
      return {
        id: `group_${Date.now()}_${idx}`,
        sortOrder: idx,
        hsCode: hsCode === 'NO_HS' ? '' : hsCode,
        specification: specs,
        unit: lines[0].unit,
        quantity: lines.reduce((sum, l) => sum + l.quantity, 0),
        packages: lines.reduce((sum, l) => sum + l.packages, 0),
        grossWeight: lines.reduce((sum, l) => sum + l.grossWeight, 0),
        netWeight: lines.reduce((sum, l) => sum + l.netWeight, 0),
        cbm: lines.reduce((sum, l) => sum + l.cbm, 0),
        isGrouped: true,
        groupedProductIds: lines.map(l => l.productId).filter(Boolean) as string[]
      }
    })

    setPackingList({
      ...packingList,
      lines: consolidatedLines,
      groupByHsCode: true,
      updatedAt: new Date().toISOString()
    })
  }

  const ungroupLines = () => {
    if (!packingList) return
    setPackingList({
      ...packingList,
      groupByHsCode: false,
      updatedAt: new Date().toISOString()
    })
  }

  const handleSave = async () => {
    if (!packingList) return
    setSaving(true)

    try {
      const updatedPl = {
        ...packingList,
        totalQuantity: totals.quantity,
        totalPackages: totals.packages,
        totalGrossWeight: totals.grossWeight,
        totalNetWeight: totals.netWeight,
        totalCbm: totals.cbm,
        updatedAt: new Date().toISOString(),
      }

      if (isNew) {
        // New legacy PL: save to localStorage
        const stored = localStorage.getItem(STORAGE_KEY)
        let allLists: PackingListData[] = stored ? JSON.parse(stored) : []
        const existingIdx = allLists.findIndex(pl => pl.id === updatedPl.id)
        if (existingIdx >= 0) allLists[existingIdx] = updatedPl
        else allLists.push(updatedPl)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allLists))
        setPackingList(updatedPl)
        setSuccessMessage('Saved successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
        router.replace(`/packing-lists/export/${updatedPl.id}`)
      } else {
        // Existing PL: try API first
        const res = await fetch(`/api/packing-lists/${packingList.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: updatedPl.customNotes,
            language: updatedPl.language,
            shipper: updatedPl.shipper,
            shipperTaxId: updatedPl.shipperTaxId,
            consignee: updatedPl.consigneeSameAsCustomer ? updatedPl.customerName : updatedPl.consigneeName,
            invoiceNumber: updatedPl.invoiceNumber,
            invoiceDate: updatedPl.invoiceDate,
            shippingPort: updatedPl.shippingPort,
            destinationPort: updatedPl.destinationPort,
            totalPackages: updatedPl.totalPackages,
            totalGrossWeight: updatedPl.totalGrossWeight,
            totalNetWeight: updatedPl.totalNetWeight,
            totalCbm: updatedPl.totalCbm,
            groupByHsCode: updatedPl.groupByHsCode,
            headerText: updatedPl.headerText,
            footerText: updatedPl.footerText,
            customNotes: updatedPl.customNotes,
            lines: updatedPl.lines.map((l, idx) => ({
              sortOrder: l.sortOrder ?? idx,
              productId: l.productId || null,
              hsCode: l.hsCode || null,
              specification: l.specification || '',
              unit: l.unit || 'PCS',
              quantity: l.quantity,
              packages: l.packages,
              packageNumber: l.packageNumber || null,
              grossWeight: l.grossWeight,
              netWeight: l.netWeight,
              cbm: l.cbm,
              isGrouped: l.isGrouped || false,
              groupedProductIds: Array.isArray(l.groupedProductIds) ? l.groupedProductIds.join(',') : (l.groupedProductIds || null),
              lineNotes: l.lineNotes || null,
            })),
          }),
        })

        if (res.ok) {
          setPackingList(updatedPl)
          setSuccessMessage('Saved successfully!')
          setTimeout(() => setSuccessMessage(''), 3000)
        } else {
          // Fallback: localStorage for legacy PLs
          const stored = localStorage.getItem(STORAGE_KEY)
          let allLists: PackingListData[] = stored ? JSON.parse(stored) : []
          const existingIdx = allLists.findIndex(pl => pl.id === updatedPl.id)
          if (existingIdx >= 0) allLists[existingIdx] = updatedPl
          else allLists.push(updatedPl)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(allLists))
          setPackingList(updatedPl)
          setSuccessMessage('Saved successfully!')
          setTimeout(() => setSuccessMessage(''), 3000)
        }
      }
    } catch (error) {
      console.error('Failed to save:', error)
      alert('Failed to save. Please try again.')
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
        
        // Apply template settings for export packing list
        if (template.settings.layoutElements) {
          settings.exportPackingListLayout = template.settings.layoutElements
        }
        if (template.settings.tableColumns) {
          settings.exportPackingListTableColumns = template.settings.tableColumns
        }
        if (template.settings.margins) {
          settings.marginTop = template.settings.margins.top
          settings.marginBottom = template.settings.margins.bottom
          settings.marginLeft = template.settings.margins.left
          settings.marginRight = template.settings.margins.right
        }
        
        localStorage.setItem('orderbridge_document_settings', JSON.stringify(settings))
        // Persist template selection per document so it survives navigation
        localStorage.setItem(`exportpl_template_${packingListId}`, templateId)
        setSelectedTemplateId(templateId)
        setSuccessMessage(`Template "${template.name}" applied!`)
        setTimeout(() => setSuccessMessage(''), 2000)
      } catch (e) {
        console.error('Failed to apply template:', e)
      }
    }
    
    setTimeout(() => setApplyingTemplate(false), 500)
  }

  const handleGeneratePdf = () => {
    if (!packingList) return
    
    // Use the generateExportPackingListPdf function for direct download
    generateExportPackingListPdf({
      packingListNumber: packingList.packingListNumber,
      shipper: packingList.shipper,
      shipperTaxId: packingList.shipperTaxId,
      customerName: packingList.customerName,
      customerAddress: packingList.customerAddress,
      customerVat: packingList.customerVat,
      customerContact: packingList.customerContact,
      customerCustomFields: packingList.customerCustomFields || [],
      consigneeSameAsCustomer: packingList.consigneeSameAsCustomer,
      consigneeName: packingList.consigneeName,
      consigneeAddress: packingList.consigneeAddress,
      consigneeContact: packingList.consigneeContact,
      consigneeCustomFields: packingList.consigneeCustomFields || [],
      useShippingAgent: packingList.useShippingAgent,
      shippingAgentName: packingList.shippingAgentName,
      shippingAgentAddress: packingList.shippingAgentAddress,
      shippingAgentContact: packingList.shippingAgentContact,
      invoiceNumber: packingList.invoiceNumber,
      invoiceDate: packingList.invoiceDate,
      orderNumber: packingList.orderNumber,
      shippingPort: packingList.shippingPort,
      destinationPort: packingList.destinationPort,
      headerText: packingList.headerText,
      footerText: packingList.footerText,
      customNotes: packingList.customNotes,
      lines: packingList.lines.map(line => ({
        hsCode: line.hsCode,
        specification: line.specification,
        unit: line.unit,
        quantity: line.quantity,
        packages: line.packages,
        packageNumber: line.packageNumber,
        grossWeight: line.grossWeight,
        netWeight: line.netWeight,
        cbm: line.cbm
      })),
      totals: {
        quantity: totals.quantity,
        packages: totals.packages,
        grossWeight: totals.grossWeight,
        netWeight: totals.netWeight,
        cbm: totals.cbm
      }
    })
  }

  const handleSendEmail = async (emailData: EmailData) => {
    if (!packingList) return
    
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'packing_list_export',
          to: emailData.to,
          customerName: packingList.customerName,
          packingListNumber: packingList.packingListNumber,
          orderReference: packingList.orderNumber,
          totalPackages: totals.packages,
          totalWeight: `${totals.grossWeight.toFixed(2)} kg`,
          shipmentDate: packingList.invoiceDate
        })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send email')
      }
      
      // Update local status
      setPackingList({
        ...packingList,
        status: 'SENT',
        sentAt: new Date().toISOString(),
        sentTo: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to
      })
      
      // Save updated status
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const allLists: PackingListData[] = JSON.parse(stored)
        const idx = allLists.findIndex(pl => pl.id === packingList.id)
        if (idx >= 0) {
          allLists[idx] = {
            ...packingList,
            status: 'SENT',
            sentAt: new Date().toISOString(),
            sentTo: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(allLists))
        }
      }
      
      setShowEmailModal(false)
      setSuccessMessage('Email sent successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Failed to send email:', error)
      alert(error instanceof Error ? error.message : 'Failed to send email')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#34c759]" />
      </div>
    )
  }

  if (!packingList) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Package className="w-16 h-16 text-[#86868b] mb-4" />
        <h2 className="text-[20px] font-semibold text-[#1d1d1f]">Packing List Not Found</h2>
        <Link href="/packing-lists/export" className="mt-4 text-[#34c759] hover:underline">
          Back to Export Packing Lists
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/packing-lists/export" className="flex items-center gap-1 text-[#34c759] hover:text-[#2db350] text-[14px] mb-2">
            <ChevronLeft className="w-4 h-4" />
            Export Packing Lists
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
              <Ship className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[24px] font-semibold text-[#1d1d1f]">
                  {isNew ? 'New Export Packing List' : packingList.packingListNumber}
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
              <p className="text-[14px] text-[#86868b]">
                {packingList.createdAt ? new Date(packingList.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'For customs clearance and shipping documentation'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
                onClick={handleGeneratePdf}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-xl text-[14px] font-medium hover:bg-[#e8e8ed] transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <DocumentExportDropdown
                data={{
                  packingListNumber: packingList.packingListNumber,
                  type: 'EXPORT',
                  status: packingList.status,
                  orderNumber: packingList.orderNumber,
                  customerName: packingList.customerName,
                  totalWeight: totals.grossWeight,
                  totalCartons: totals.packages,
                  totalCbm: totals.cbm,
                  lines: packingList.lines.map(l => ({
                    ref: l.hsCode,
                    nameEn: l.specification,
                    quantity: l.quantity,
                    unitPrice: l.netWeight,
                    lineTotal: l.grossWeight
                  }))
                }}
                filename={`packing_list_${packingList.packingListNumber}`}
                title={`Packing List ${packingList.packingListNumber}`}
                documentType="packingList"
              />
              <button
                onClick={() => setShowEmailModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#34c759] text-white rounded-xl text-[14px] font-medium hover:bg-[#2db350] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-[#34c759]/10 border border-[#34c759]/20 rounded-xl text-[#34c759] text-[14px] font-medium">
          {successMessage}
        </div>
      )}

      {/* Order Selection (for new) */}
      {isNew && !packingList.orderId && (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6 mb-6">
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">Select Order</h3>
          <select
            value={selectedOrderId}
            onChange={(e) => handleOrderSelect(e.target.value)}
            className="w-full h-12 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
          >
            <option value="">Choose an order...</option>
            {orders.map(order => (
              <option key={order.id} value={order.id}>
                {order.orderNumber} - {order.customerName} ({order.lines.length} items)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'shipper', label: 'Shipper', icon: Building2 },
          { id: 'customer', label: 'Customer / Consignee', icon: Users },
          { id: 'lines', label: `Items (${packingList.lines.length})`, icon: Package },
          { id: 'footer', label: 'Footer & Notes', icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[#34c759] text-white'
                : 'bg-[#f5f5f7] text-[#86868b] hover:bg-[#e8e8ed]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
        {/* Shipper Tab */}
        {activeTab === 'shipper' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Shipper (Your Company)</label>
                <textarea
                  value={packingList.shipper}
                  onChange={(e) => setPackingList({ ...packingList, shipper: e.target.value })}
                  placeholder="Company name, address, contact..."
                  rows={4}
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759] resize-none"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Tax ID</label>
                  <input
                    type="text"
                    value={packingList.shipperTaxId}
                    onChange={(e) => setPackingList({ ...packingList, shipperTaxId: e.target.value })}
                    className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 pt-4 border-t border-[#d2d2d7]/20">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Invoice No.</label>
                <input
                  type="text"
                  value={packingList.invoiceNumber}
                  onChange={(e) => setPackingList({ ...packingList, invoiceNumber: e.target.value })}
                  className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Invoice Date</label>
                <input
                  type="date"
                  value={packingList.invoiceDate}
                  onChange={(e) => setPackingList({ ...packingList, invoiceDate: e.target.value })}
                  className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Shipping Port</label>
                <input
                  type="text"
                  value={packingList.shippingPort}
                  onChange={(e) => setPackingList({ ...packingList, shippingPort: e.target.value })}
                  placeholder="e.g., SHANGHAI, CHINA"
                  className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Destination Port</label>
                <input
                  type="text"
                  value={packingList.destinationPort}
                  onChange={(e) => setPackingList({ ...packingList, destinationPort: e.target.value })}
                  placeholder="e.g., LE HAVRE, FRANCE"
                  className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">PL Number</label>
              <input
                type="text"
                value={packingList.packingListNumber}
                onChange={(e) => setPackingList({ ...packingList, packingListNumber: e.target.value })}
                className="w-full max-w-xs h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Header Text (optional)</label>
              <textarea
                value={packingList.headerText}
                onChange={(e) => setPackingList({ ...packingList, headerText: e.target.value })}
                placeholder="Additional header information..."
                rows={2}
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759] resize-none"
              />
            </div>
          </div>
        )}

        {/* Customer / Consignee Tab */}
        {activeTab === 'customer' && (
          <div className="p-6 space-y-6">
            {/* Customer */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-[15px] font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0071e3]" />
                  Customer (Buyer)
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Company Name</label>
                    <input
                      type="text"
                      value={packingList.customerName}
                      onChange={(e) => setPackingList({ ...packingList, customerName: e.target.value })}
                      className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Address</label>
                    <textarea
                      value={packingList.customerAddress}
                      onChange={(e) => setPackingList({ ...packingList, customerAddress: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759] resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">VAT Number</label>
                      <input
                        type="text"
                        value={packingList.customerVat}
                        onChange={(e) => setPackingList({ ...packingList, customerVat: e.target.value })}
                        className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Contact</label>
                      <input
                        type="text"
                        value={packingList.customerContact}
                        onChange={(e) => setPackingList({ ...packingList, customerContact: e.target.value })}
                        className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                      />
                    </div>
                  </div>

                  {/* Custom Fields — Customer */}
                  <div className="pt-3 border-t border-[#d2d2d7]/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Custom Fields</span>
                      <button
                        onClick={() => setPackingList({ ...packingList, customerCustomFields: [...(packingList.customerCustomFields || []), { label: '', value: '' }] })}
                        className="flex items-center gap-1 text-[12px] text-[#0071e3] hover:underline"
                      >
                        <Plus className="w-3 h-3" /> Add field
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(packingList.customerCustomFields || []).map((field, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Label (e.g. EORI)"
                            value={field.label}
                            onChange={(e) => {
                              const updated = [...packingList.customerCustomFields]
                              updated[idx] = { ...updated[idx], label: e.target.value }
                              setPackingList({ ...packingList, customerCustomFields: updated })
                            }}
                            className="w-32 h-8 px-2 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                          <input
                            type="text"
                            placeholder="Value"
                            value={field.value}
                            onChange={(e) => {
                              const updated = [...packingList.customerCustomFields]
                              updated[idx] = { ...updated[idx], value: e.target.value }
                              setPackingList({ ...packingList, customerCustomFields: updated })
                            }}
                            className="flex-1 h-8 px-2 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                          <button
                            onClick={() => setPackingList({ ...packingList, customerCustomFields: packingList.customerCustomFields.filter((_, i) => i !== idx) })}
                            className="text-[#ff3b30] hover:text-[#cc2f27] flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Consignee */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[15px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#ff9500]" />
                    Consignee (Receiver)
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={packingList.consigneeSameAsCustomer}
                      onChange={(e) => setPackingList({ 
                        ...packingList, 
                        consigneeSameAsCustomer: e.target.checked,
                        consigneeName: e.target.checked ? '' : packingList.consigneeName,
                        consigneeAddress: e.target.checked ? '' : packingList.consigneeAddress,
                        consigneeContact: e.target.checked ? '' : packingList.consigneeContact
                      })}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#34c759] focus:ring-[#34c759]"
                    />
                    <span className="text-[13px] text-[#86868b]">Same as customer</span>
                  </label>
                </div>
                
                {packingList.consigneeSameAsCustomer ? (
                  <div className="bg-[#f5f5f7] rounded-xl p-4 text-[14px] text-[#86868b]">
                    Consignee information will be the same as customer.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Company Name</label>
                      <input
                        type="text"
                        value={packingList.consigneeName}
                        onChange={(e) => setPackingList({ ...packingList, consigneeName: e.target.value })}
                        className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Address</label>
                      <textarea
                        value={packingList.consigneeAddress}
                        onChange={(e) => setPackingList({ ...packingList, consigneeAddress: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759] resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Contact</label>
                      <input
                        type="text"
                        value={packingList.consigneeContact}
                        onChange={(e) => setPackingList({ ...packingList, consigneeContact: e.target.value })}
                        className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                      />
                    </div>

                    {/* Custom Fields — Consignee */}
                    <div className="pt-3 border-t border-[#d2d2d7]/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Custom Fields</span>
                        <button
                          onClick={() => setPackingList({ ...packingList, consigneeCustomFields: [...(packingList.consigneeCustomFields || []), { label: '', value: '' }] })}
                          className="flex items-center gap-1 text-[12px] text-[#0071e3] hover:underline"
                        >
                          <Plus className="w-3 h-3" /> Add field
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(packingList.consigneeCustomFields || []).map((field, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Label (e.g. Import License)"
                              value={field.label}
                              onChange={(e) => {
                                const updated = [...packingList.consigneeCustomFields]
                                updated[idx] = { ...updated[idx], label: e.target.value }
                                setPackingList({ ...packingList, consigneeCustomFields: updated })
                              }}
                              className="w-36 h-8 px-2 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#ff9500]"
                            />
                            <input
                              type="text"
                              placeholder="Value"
                              value={field.value}
                              onChange={(e) => {
                                const updated = [...packingList.consigneeCustomFields]
                                updated[idx] = { ...updated[idx], value: e.target.value }
                                setPackingList({ ...packingList, consigneeCustomFields: updated })
                              }}
                              className="flex-1 h-8 px-2 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#ff9500]"
                            />
                            <button
                              onClick={() => setPackingList({ ...packingList, consigneeCustomFields: packingList.consigneeCustomFields.filter((_, i) => i !== idx) })}
                              className="text-[#ff3b30] hover:text-[#cc2f27] flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Agent */}
            <div className="pt-6 border-t border-[#d2d2d7]/20">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[15px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                  <Ship className="w-4 h-4 text-[#34c759]" />
                  Shipping Agent (optional)
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={packingList.useShippingAgent}
                    onChange={(e) => setPackingList({ 
                      ...packingList, 
                      useShippingAgent: e.target.checked 
                    })}
                    className="w-4 h-4 rounded border-[#d2d2d7] text-[#34c759] focus:ring-[#34c759]"
                  />
                  <span className="text-[13px] text-[#86868b]">Use shipping agent</span>
                </label>
              </div>

              {packingList.useShippingAgent && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                      Select Agent
                    </label>
                    <select
                      value={packingList.shippingAgentId || ''}
                      onChange={(e) => handleShippingAgentSelect(e.target.value)}
                      className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                    >
                      <option value="">Manual entry...</option>
                      {shippingAgents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Agent Name</label>
                    <input
                      type="text"
                      value={packingList.shippingAgentName}
                      onChange={(e) => setPackingList({ ...packingList, shippingAgentName: e.target.value })}
                      className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Contact Info</label>
                    <input
                      type="text"
                      value={packingList.shippingAgentContact}
                      onChange={(e) => setPackingList({ ...packingList, shippingAgentContact: e.target.value })}
                      className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Agent Address</label>
                    <textarea
                      value={packingList.shippingAgentAddress}
                      onChange={(e) => setPackingList({ ...packingList, shippingAgentAddress: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759] resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lines Tab */}
        {activeTab === 'lines' && (
          <div className="p-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={addLine}
                  className="flex items-center gap-2 px-3 py-2 bg-[#34c759] text-white rounded-lg text-[13px] font-medium hover:bg-[#2db350]"
                >
                  <Plus className="w-4 h-4" />
                  Add Line
                </button>
                <button
                  onClick={importFromShipmentOrders}
                  className="flex items-center gap-2 px-3 py-2 bg-[#0071e3] text-white rounded-lg text-[13px] font-medium hover:bg-[#0077ed]"
                  title="Import all products from shipment orders"
                >
                  <Package className="w-4 h-4" />
                  Import from Orders
                </button>
                <button
                  onClick={packingList.groupByHsCode ? ungroupLines : groupByHsCode}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    packingList.groupByHsCode
                      ? 'bg-[#ff9500] text-white hover:bg-[#e08600]'
                      : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                  }`}
                >
                  {packingList.groupByHsCode ? <Split className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                  {packingList.groupByHsCode ? 'Ungroup' : 'Group by HS Code'}
                </button>
              </div>
            </div>

            {/* Lines Table */}
            {packingList.lines.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
                <p className="text-[#86868b]">No items yet. Select an order or add items manually.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[#f5f5f7]">
                      <th className="px-2 py-3 text-left font-semibold text-[#86868b] w-10">#</th>
                      <th className="px-2 py-3 text-left font-semibold text-[#86868b] w-24">HS Code</th>
                      <th className="px-2 py-3 text-left font-semibold text-[#86868b] min-w-[180px]">Specification</th>
                      <th className="px-2 py-3 text-center font-semibold text-[#86868b] w-20">Unit</th>
                      <th className="px-2 py-3 text-right font-semibold text-[#86868b] w-14">Qty</th>
                      <th className="px-2 py-3 text-center font-semibold text-[#86868b] w-14" title="Package number - items with same number share a package">Pkg#</th>
                      <th className="px-2 py-3 text-right font-semibold text-[#86868b] w-16">Pkgs</th>
                      <th className="px-2 py-3 text-right font-semibold text-[#86868b] w-20">GW (Kgs)</th>
                      <th className="px-2 py-3 text-right font-semibold text-[#86868b] w-20">NW (Kgs)</th>
                      <th className="px-2 py-3 text-right font-semibold text-[#86868b] w-20">CBM</th>
                      <th className="px-2 py-3 text-center font-semibold text-[#86868b] w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d2d2d7]/30">
                    {packingList.lines.map((line, idx) => (
                      <tr key={line.id} className={`hover:bg-[#f5f5f7]/50 ${line.packageNumber ? `border-l-2 border-l-[#0071e3]` : ''}`}>
                        <td className="px-2 py-2 text-[#86868b]">
                          {idx + 1}
                          {line.isGrouped && (
                            <span className="ml-1 text-[#ff9500]" title="Grouped">●</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={line.hsCode}
                            onChange={(e) => updateLine(line.id, 'hsCode', e.target.value)}
                            className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-[#d2d2d7]/50 focus:border-[#34c759] rounded text-[13px] focus:outline-none"
                            placeholder="890399"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={line.specification}
                            onChange={(e) => updateLine(line.id, 'specification', e.target.value)}
                            className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-[#d2d2d7]/50 focus:border-[#34c759] rounded text-[13px] focus:outline-none"
                            placeholder="Product description (editable)"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={line.unit}
                            onChange={(e) => updateLine(line.id, 'unit', e.target.value)}
                            className="w-full h-8 px-1 bg-transparent border border-transparent hover:border-[#d2d2d7]/50 focus:border-[#34c759] rounded text-[12px] focus:outline-none text-center"
                          >
                            {UNITS.map(u => <option key={u.value} value={u.value}>{u.value}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-[#d2d2d7]/50 focus:border-[#34c759] rounded text-[13px] focus:outline-none text-right"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            value={line.packageNumber || ''}
                            onChange={(e) => updateLine(line.id, 'packageNumber', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full h-8 px-1 bg-[#0071e3]/5 border border-transparent hover:border-[#0071e3]/30 focus:border-[#0071e3] rounded text-[13px] focus:outline-none text-center"
                            placeholder="-"
                            title="Items with same package number share one physical package"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={line.packages}
                            onChange={(e) => updateLine(line.id, 'packages', parseInt(e.target.value) || 0)}
                            className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-[#d2d2d7]/50 focus:border-[#34c759] rounded text-[13px] focus:outline-none text-right"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={line.grossWeight || ''}
                            onChange={(e) => updateLine(line.id, 'grossWeight', parseFloat(e.target.value) || 0)}
                            className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-[#d2d2d7]/50 focus:border-[#34c759] rounded text-[13px] focus:outline-none text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={line.netWeight || ''}
                            onChange={(e) => updateLine(line.id, 'netWeight', parseFloat(e.target.value) || 0)}
                            className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-[#d2d2d7]/50 focus:border-[#34c759] rounded text-[13px] focus:outline-none text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={line.cbm || ''}
                            onChange={(e) => updateLine(line.id, 'cbm', parseFloat(e.target.value) || 0)}
                            className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-[#d2d2d7]/50 focus:border-[#34c759] rounded text-[13px] focus:outline-none text-right"
                            placeholder="0.000"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => removeLine(line.id)}
                            className="p-1.5 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#34c759]/10 font-semibold">
                      <td colSpan={4} className="px-2 py-3 text-right text-[#1d1d1f]">TOTAL</td>
                      <td className="px-2 py-3 text-right text-[#1d1d1f]">{totals.quantity}</td>
                      <td className="px-2 py-3 text-center text-[#86868b]">-</td>
                      <td className="px-2 py-3 text-right text-[#1d1d1f]">{totals.packages}</td>
                      <td className="px-2 py-3 text-right text-[#1d1d1f]">{totals.grossWeight.toFixed(2)}</td>
                      <td className="px-2 py-3 text-right text-[#1d1d1f]">{totals.netWeight.toFixed(2)}</td>
                      <td className="px-2 py-3 text-right text-[#1d1d1f]">{totals.cbm.toFixed(3)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                
                {/* Package grouping help */}
                <div className="mt-4 p-3 bg-[#0071e3]/5 rounded-lg text-[12px] text-[#86868b]">
                  <strong className="text-[#0071e3]">Pkg# (Package Number):</strong> To put multiple items in the same physical package, 
                  give them the same package number. Items with the same Pkg# will be grouped together. 
                  Leave empty for items that have their own packages.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Tab */}
        {activeTab === 'footer' && (
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Footer Text</label>
              <textarea
                value={packingList.footerText}
                onChange={(e) => setPackingList({ ...packingList, footerText: e.target.value })}
                placeholder="Company footer, legal information, contact details..."
                rows={3}
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759] resize-none"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Custom Notes</label>
              <textarea
                value={packingList.customNotes}
                onChange={(e) => setPackingList({ ...packingList, customNotes: e.target.value })}
                placeholder="Special instructions, handling notes, remarks..."
                rows={4}
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759] resize-none"
              />
            </div>

            {/* Summary */}
            <div className="bg-[#f5f5f7] rounded-xl p-6">
              <h4 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Summary</h4>
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <p className="text-[12px] text-[#86868b] uppercase">Total Qty</p>
                  <p className="text-[20px] font-semibold text-[#1d1d1f]">{totals.quantity}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[#86868b] uppercase">Total Packages</p>
                  <p className="text-[20px] font-semibold text-[#1d1d1f]">{totals.packages}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[#86868b] uppercase">Gross Weight</p>
                  <p className="text-[20px] font-semibold text-[#1d1d1f]">{totals.grossWeight.toFixed(2)} kg</p>
                </div>
                <div>
                  <p className="text-[12px] text-[#86868b] uppercase">Net Weight</p>
                  <p className="text-[20px] font-semibold text-[#1d1d1f]">{totals.netWeight.toFixed(2)} kg</p>
                </div>
                <div>
                  <p className="text-[12px] text-[#86868b] uppercase">Total CBM</p>
                  <p className="text-[20px] font-semibold text-[#1d1d1f]">{totals.cbm.toFixed(3)} m³</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <EmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          onSend={handleSendEmail}
          documentType="Packing List"
          documentNumber={packingList.packingListNumber}
        />
      )}

      {/* Edit Number & Date Modal */}
      {showEditModal && (
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
                  className="w-full h-10 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Date</label>
                <input
                  type="date"
                  value={editForm.plDate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, plDate: e.target.value }))}
                  className="w-full h-10 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
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
                className="inline-flex items-center gap-2 px-4 h-10 bg-[#34c759] hover:bg-[#2db350] text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
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
