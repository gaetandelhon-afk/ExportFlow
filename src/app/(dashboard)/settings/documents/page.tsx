'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, FileText, Save, Loader2, CheckCircle, Plus, Trash2,
  Eye, Receipt, Package, ChevronDown, ChevronUp, GripVertical,
  Move, ToggleLeft, LayoutGrid, Columns
} from 'lucide-react'
import { 
  previewInvoicePdf, 
  previewQuotePdf, 
  previewExportPackingListPdf, 
  previewFactoryPackingListPdf 
} from '@/lib/generatePdf'
import DocumentLayoutEditor from '@/components/DocumentLayoutEditor'
import ColumnConfigurator from '@/components/ColumnConfigurator'
import { 
  DocumentTemplate, 
  getTemplatesForType, 
  saveTemplate, 
  deleteTemplate,
  getTemplateById,
  setDefaultTemplate,
  getDefaultTemplate
} from '@/lib/documentTemplates'

interface CustomFieldOption {
  id: string
  value: string
}

interface CustomField {
  id: string
  label: string
  type: 'text' | 'select'  // text = single value, select = multiple options
  defaultValue: string
  options: CustomFieldOption[]  // For select type
  showOnInvoice: boolean
  showOnPackingList: boolean
  showOnQuote: boolean
  position: 'header' | 'body-top' | 'body-bottom' | 'footer'  // Where to display on document
}

// Document layout element for drag-drop positioning
interface DocumentElement {
  id: string
  type: 'logo' | 'companyInfo' | 'documentTitle' | 'documentInfo' | 'billTo' | 'bankDetails' | 'table' | 'totals' | 'termsNotes'
  zone: 'header-left' | 'header-center' | 'header-right' | 'body-left' | 'body-right' | 'footer'
  order: number
  visible: boolean
}

// Table column configuration
interface TableColumn {
  id: string
  label: string
  field: 'rowNumber' | 'hsCode' | 'reference' | 'description' | 'quantity' | 'unit' | 'unitPrice' | 'total' | 'weight' | 'netWeight' | 'packages' | 'cbm' | 'custom'
  width: number  // percentage
  visible: boolean
  order: number
  customFieldId?: string  // for custom columns
}

interface DocumentSettings {
  // Page margins (in mm)
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
  
  // Invoice settings
  invoiceLogo: boolean
  invoiceLogoPosition: 'left' | 'right' | 'center'
  invoiceTitle: string
  invoiceSubtitle: string
  invoiceHeader: string
  invoiceFooter: string
  invoiceShowCompanyAddress: boolean
  invoiceShowVAT: boolean
  invoiceShowRegistrationNumber: boolean
  invoiceShowPhone: boolean
  invoiceShowEmail: boolean
  invoiceShowWebsite: boolean
  invoiceShowPaymentTerms: boolean
  invoiceShowBankDetails: boolean
  invoiceBankDetails: string
  invoiceNotes: string
  invoiceTermsAndConditions: string
  
  // Packing list EXPORT settings (for customer/customs)
  packingListExportLogo: boolean
  packingListExportTitle: string
  packingListExportHeader: string
  packingListExportFooter: string
  packingListExportShowPrices: boolean
  packingListExportShowWeight: boolean
  packingListExportShowBarcode: boolean
  packingListExportNotes: string
  // New advanced settings
  packingListExportMode: 'simple' | 'advanced'
  packingListExportShowHsCode: boolean
  packingListExportShowGrossWeight: boolean
  packingListExportShowNetWeight: boolean
  packingListExportShowPackages: boolean
  packingListExportShowCbm: boolean
  packingListExportGroupByHsCode: boolean
  packingListExportDefaultShipper: string
  packingListExportDefaultShippingPort: string
  
  // Packing list FACTORY settings (for factory preparation)
  packingListFactoryTitle: string
  packingListFactoryLanguage: string
  packingListFactoryEmail: string
  packingListFactoryShowImages: boolean
  packingListFactoryShowProductRef: boolean
  packingListFactoryShowChineseName: boolean
  packingListFactoryNotes: string
  
  // Legacy support
  packingListLogo: boolean
  packingListTitle: string
  packingListHeader: string
  packingListFooter: string
  packingListShowPrices: boolean
  packingListShowWeight: boolean
  packingListShowBarcode: boolean
  packingListNotes: string
  
  // Quote settings
  quoteLogo: boolean
  quoteTitle: string
  quoteHeader: string
  quoteFooter: string
  quoteValidityDays: number
  quoteTermsAndConditions: string
  
  // Custom fields
  customFields: CustomField[]
  
  // Document layout configuration
  invoiceLayout: DocumentElement[]
  quoteLayout: DocumentElement[]
  packingListExportLayout: DocumentElement[]
  packingListFactoryLayout: DocumentElement[]
  
  // Table columns configuration
  invoiceTableColumns: TableColumn[]
  quoteTableColumns: TableColumn[]
  packingListExportTableColumns: TableColumn[]
  packingListFactoryTableColumns: TableColumn[]
}

const DEFAULT_SETTINGS: DocumentSettings = {
  // Default margins in mm
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 20,
  marginRight: 20,
  
  invoiceLogo: true,
  invoiceLogoPosition: 'right',
  invoiceTitle: 'INVOICE',
  invoiceSubtitle: '',
  invoiceHeader: '',
  invoiceFooter: '',
  invoiceShowCompanyAddress: true,
  invoiceShowVAT: true,
  invoiceShowRegistrationNumber: true,
  invoiceShowPhone: true,
  invoiceShowEmail: false,
  invoiceShowWebsite: true,
  invoiceShowPaymentTerms: true,
  invoiceShowBankDetails: false,
  invoiceBankDetails: '',
  invoiceNotes: '',
  invoiceTermsAndConditions: '',
  
  // Export Packing List
  packingListExportLogo: true,
  packingListExportTitle: 'PACKING LIST',
  packingListExportHeader: '',
  packingListExportFooter: '',
  packingListExportShowPrices: false,
  packingListExportShowWeight: true,
  packingListExportShowBarcode: false,
  packingListExportNotes: '',
  // New advanced settings
  packingListExportMode: 'simple' as const,
  packingListExportShowHsCode: true,
  packingListExportShowGrossWeight: true,
  packingListExportShowNetWeight: true,
  packingListExportShowPackages: true,
  packingListExportShowCbm: true,
  packingListExportGroupByHsCode: false,
  packingListExportDefaultShipper: '',
  packingListExportDefaultShippingPort: '',
  
  // Factory Packing List
  packingListFactoryTitle: 'PREPARATION LIST / 备货清单',
  packingListFactoryLanguage: 'zh',
  packingListFactoryEmail: '',
  packingListFactoryShowImages: true,
  packingListFactoryShowProductRef: true,
  packingListFactoryShowChineseName: true,
  packingListFactoryNotes: '',
  
  // Legacy
  packingListLogo: true,
  packingListTitle: 'PACKING LIST',
  packingListHeader: '',
  packingListFooter: '',
  packingListShowPrices: false,
  packingListShowWeight: true,
  packingListShowBarcode: false,
  packingListNotes: '',
  
  quoteLogo: true,
  quoteTitle: 'QUOTATION',
  quoteHeader: '',
  quoteFooter: '',
  quoteValidityDays: 30,
  quoteTermsAndConditions: '',
  
  customFields: [],
  
  // Default layout configurations (initialized empty, will use defaults below)
  invoiceLayout: [],
  quoteLayout: [],
  packingListExportLayout: [],
  packingListFactoryLayout: [],
  
  // Default table columns (initialized empty, will use defaults below)
  invoiceTableColumns: [],
  quoteTableColumns: [],
  packingListExportTableColumns: [],
  packingListFactoryTableColumns: []
}

// Default layout elements - matches current hardcoded PDF positions
const DEFAULT_INVOICE_LAYOUT: DocumentElement[] = [
  { id: 'logo', type: 'logo', zone: 'header-right', order: 0, visible: true },
  { id: 'companyInfo', type: 'companyInfo', zone: 'header-left', order: 0, visible: true },
  { id: 'documentTitle', type: 'documentTitle', zone: 'header-right', order: 1, visible: true },
  { id: 'documentInfo', type: 'documentInfo', zone: 'header-right', order: 2, visible: true },
  { id: 'billTo', type: 'billTo', zone: 'body-left', order: 0, visible: true },
  { id: 'bankDetails', type: 'bankDetails', zone: 'footer', order: 0, visible: true },
  { id: 'table', type: 'table', zone: 'body-left', order: 1, visible: true },
  { id: 'totals', type: 'totals', zone: 'footer', order: 1, visible: true },
  { id: 'termsNotes', type: 'termsNotes', zone: 'footer', order: 2, visible: true },
]

// Default table columns for invoices - matches current hardcoded columns
const DEFAULT_INVOICE_COLUMNS: TableColumn[] = [
  { id: 'col-row', label: '#', field: 'rowNumber', width: 5, visible: true, order: 0 },
  { id: 'col-desc', label: 'Description', field: 'description', width: 45, visible: true, order: 1 },
  { id: 'col-qty', label: 'Qty', field: 'quantity', width: 10, visible: true, order: 2 },
  { id: 'col-price', label: 'Unit Price', field: 'unitPrice', width: 20, visible: true, order: 3 },
  { id: 'col-total', label: 'Total', field: 'total', width: 20, visible: true, order: 4 },
]

// Default table columns for packing lists - includes HS Code, weight, packages, CBM
const DEFAULT_PACKING_LIST_COLUMNS: TableColumn[] = [
  { id: 'col-row', label: '#', field: 'rowNumber', width: 4, visible: true, order: 0 },
  { id: 'col-hs', label: 'HS Code', field: 'hsCode', width: 10, visible: true, order: 1 },
  { id: 'col-desc', label: 'Description', field: 'description', width: 25, visible: true, order: 2 },
  { id: 'col-unit', label: 'Unit', field: 'unit', width: 6, visible: true, order: 3 },
  { id: 'col-qty', label: 'Qty', field: 'quantity', width: 7, visible: true, order: 4 },
  { id: 'col-pkgs', label: 'Pkgs', field: 'packages', width: 7, visible: true, order: 5 },
  { id: 'col-gw', label: 'G.W. (Kgs)', field: 'weight', width: 12, visible: true, order: 6 },
  { id: 'col-nw', label: 'N.W. (Kgs)', field: 'netWeight', width: 12, visible: true, order: 7 },
  { id: 'col-cbm', label: 'CBM', field: 'cbm', width: 9, visible: true, order: 8 },
]

type DocumentType = 'invoice' | 'quote' | 'packingListExport' | 'packingListFactory'

export default function DocumentSettingsPage() {
  const [settings, setSettings] = useState<DocumentSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState<DocumentType>('invoice')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    header: false,
    footer: false,
    options: false,
    customFields: false,
    layout: false,
    columns: false,
    templates: false
  })
  
  // Template management state
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null)
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(null)
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = () => {
    // Load from localStorage
    const stored = localStorage.getItem('orderbridge_document_settings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      } catch {
        setSettings(DEFAULT_SETTINGS)
      }
    }
    setLoading(false)
  }

  // Load templates when activeSection changes
  useEffect(() => {
    const loadTemplates = async () => {
      const docType = activeSection as DocumentTemplate['documentType']
      const fetchedTemplates = await getTemplatesForType(docType)
      setTemplates(fetchedTemplates)
      
      // Load default template
      const defaultTemplate = await getDefaultTemplate(docType)
      setDefaultTemplateId(defaultTemplate?.id || null)
    }
    loadTemplates()
  }, [activeSection])

  // Handle setting a template as default
  const handleSetDefault = async (templateId: string) => {
    setSettingDefaultId(templateId)
    const docType = activeSection as DocumentTemplate['documentType']
    const success = await setDefaultTemplate(templateId, docType)
    if (success) {
      setDefaultTemplateId(templateId)
      const refreshedTemplates = await getTemplatesForType(docType)
      setTemplates(refreshedTemplates)
    }
    setTimeout(() => setSettingDefaultId(null), 1000)
  }

  // Clear default template
  const handleClearDefault = async () => {
    const docType = activeSection as DocumentTemplate['documentType']
    try {
      await fetch(`/api/templates/default?documentType=${docType}`, { method: 'DELETE' })
      setDefaultTemplateId(null)
    } catch (error) {
      console.error('Failed to clear default:', error)
    }
  }

  // Apply a template to current settings
  const applyTemplate = async (templateId: string) => {
    const template = await getTemplateById(templateId)
    if (!template) return

    // Show feedback
    setApplyingTemplateId(templateId)

    // Map document type to settings keys
    const docType = activeSection
    
    setSettings(prev => {
      const newSettings = { ...prev }
      
      // Apply layout elements
      if (docType === 'invoice') {
        newSettings.invoiceLayout = template.settings.layoutElements as DocumentElement[]
        newSettings.invoiceTableColumns = template.settings.tableColumns as TableColumn[]
      } else if (docType === 'quote') {
        newSettings.quoteLayout = template.settings.layoutElements as DocumentElement[]
        newSettings.quoteTableColumns = template.settings.tableColumns as TableColumn[]
      } else if (docType === 'packingListExport') {
        newSettings.packingListExportLayout = template.settings.layoutElements as DocumentElement[]
        newSettings.packingListExportTableColumns = template.settings.tableColumns as TableColumn[]
      } else if (docType === 'packingListFactory') {
        newSettings.packingListFactoryLayout = template.settings.layoutElements as DocumentElement[]
        newSettings.packingListFactoryTableColumns = template.settings.tableColumns as TableColumn[]
      }
      
      // Apply margins
      if (template.settings.margins) {
        newSettings.marginTop = template.settings.margins.top
        newSettings.marginBottom = template.settings.margins.bottom
        newSettings.marginLeft = template.settings.margins.left
        newSettings.marginRight = template.settings.margins.right
      }
      
      // Apply display settings
      if (template.settings.headerText !== undefined) newSettings.invoiceHeader = template.settings.headerText
      if (template.settings.footerText !== undefined) newSettings.invoiceFooter = template.settings.footerText
      if (template.settings.termsAndConditions !== undefined) newSettings.invoiceTermsAndConditions = template.settings.termsAndConditions
      if (template.settings.notes !== undefined) newSettings.invoiceNotes = template.settings.notes
      if (template.settings.showBankDetails !== undefined) newSettings.invoiceShowBankDetails = template.settings.showBankDetails
      if (template.settings.showCompanyAddress !== undefined) newSettings.invoiceShowCompanyAddress = template.settings.showCompanyAddress
      if (template.settings.showVAT !== undefined) newSettings.invoiceShowVAT = template.settings.showVAT
      if (template.settings.showPhone !== undefined) newSettings.invoiceShowPhone = template.settings.showPhone
      if (template.settings.showEmail !== undefined) newSettings.invoiceShowEmail = template.settings.showEmail
      if (template.settings.showWebsite !== undefined) newSettings.invoiceShowWebsite = template.settings.showWebsite
      
      return newSettings
    })
    
    setSaved(false) // Indicate unsaved changes
    
    // Clear feedback after 1.5 seconds
    setTimeout(() => setApplyingTemplateId(null), 1500)
  }

  // Save current settings as a new template
  const saveCurrentAsTemplate = async () => {
    if (!newTemplateName.trim()) return
    
    const docType = activeSection as DocumentTemplate['documentType']
    
    // Get current layout elements and table columns based on doc type
    let layoutElements: DocumentElement[] = []
    let tableColumns: TableColumn[] = []
    
    if (docType === 'invoice') {
      layoutElements = settings.invoiceLayout || []
      tableColumns = settings.invoiceTableColumns || []
    } else if (docType === 'quote') {
      layoutElements = settings.quoteLayout || []
      tableColumns = settings.quoteTableColumns || []
    } else if (docType === 'packingListExport') {
      layoutElements = settings.packingListExportLayout || []
      tableColumns = settings.packingListExportTableColumns || []
    } else if (docType === 'packingListFactory') {
      layoutElements = settings.packingListFactoryLayout || []
      tableColumns = settings.packingListFactoryTableColumns || []
    }
    
    await saveTemplate({
      name: newTemplateName.trim(),
      documentType: docType,
      settings: {
        layoutElements: layoutElements.map(el => ({
          id: el.id,
          type: el.type,
          zone: el.zone,
          order: el.order,
          visible: el.visible,
        })),
        tableColumns: tableColumns.map(col => ({
          id: col.id,
          label: col.label,
          field: col.field,
          width: col.width,
          visible: col.visible,
          order: col.order,
        })),
        margins: {
          top: settings.marginTop,
          bottom: settings.marginBottom,
          left: settings.marginLeft,
          right: settings.marginRight,
        },
        headerText: settings.invoiceHeader,
        footerText: settings.invoiceFooter,
        termsAndConditions: settings.invoiceTermsAndConditions,
        notes: settings.invoiceNotes,
        showBankDetails: settings.invoiceShowBankDetails,
        showCompanyAddress: settings.invoiceShowCompanyAddress,
        showVAT: settings.invoiceShowVAT,
        showPhone: settings.invoiceShowPhone,
        showEmail: settings.invoiceShowEmail,
        showWebsite: settings.invoiceShowWebsite,
      }
    })
    
    // Refresh templates
    const refreshedTemplates = await getTemplatesForType(docType)
    setTemplates(refreshedTemplates)
    setShowSaveTemplateModal(false)
    setNewTemplateName('')
  }

  // Delete a user template
  const handleDeleteTemplate = async (templateId: string) => {
    const success = await deleteTemplate(templateId)
    if (success) {
      const refreshedTemplates = await getTemplatesForType(activeSection as DocumentTemplate['documentType'])
      setTemplates(refreshedTemplates)
    }
  }

  const handleSave = () => {
    setSaving(true)
    
    // Save to localStorage
    localStorage.setItem('orderbridge_document_settings', JSON.stringify(settings))
    
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Generate preview PDF based on active section
  const generatePreview = useCallback(() => {
    // Save current settings to localStorage first so preview uses latest values
    localStorage.setItem('orderbridge_document_settings', JSON.stringify(settings))
    
    // Clean up previous URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    
    let url: string
    switch (activeSection) {
      case 'invoice':
        url = previewInvoicePdf()
        break
      case 'quote':
        url = previewQuotePdf()
        break
      case 'packingListExport':
        url = previewExportPackingListPdf()
        break
      case 'packingListFactory':
        url = previewFactoryPackingListPdf()
        break
      default:
        url = previewInvoicePdf()
    }
    
    setPreviewUrl(url)
    setShowPreview(true)
  }, [activeSection, previewUrl, settings])

  // Clean up preview URL when closing
  const closePreview = useCallback(() => {
    setShowPreview(false)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }, [previewUrl])

  // Handle Escape key to close preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPreview) {
        closePreview()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showPreview, closePreview])

  const addCustomField = () => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      label: '',
      type: 'select',
      defaultValue: '',
      options: [],
      showOnInvoice: true,
      showOnPackingList: false,
      showOnQuote: false,
      position: 'body-top'
    }
    setSettings(prev => ({
      ...prev,
      customFields: [...prev.customFields, newField]
    }))
  }

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setSettings(prev => ({
      ...prev,
      customFields: prev.customFields.map(f => 
        f.id === id ? { ...f, ...updates } : f
      )
    }))
  }

  const removeCustomField = (id: string) => {
    setSettings(prev => ({
      ...prev,
      customFields: prev.customFields.filter(f => f.id !== id)
    }))
  }

  const addOptionToField = (fieldId: string) => {
    setSettings(prev => ({
      ...prev,
      customFields: prev.customFields.map(f => {
        if (f.id === fieldId) {
          return {
            ...f,
            options: [...f.options, { id: `opt_${Date.now()}`, value: '' }]
          }
        }
        return f
      })
    }))
  }

  const updateFieldOption = (fieldId: string, optionId: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      customFields: prev.customFields.map(f => {
        if (f.id === fieldId) {
          return {
            ...f,
            options: f.options.map(opt => 
              opt.id === optionId ? { ...opt, value } : opt
            )
          }
        }
        return f
      })
    }))
  }

  const removeFieldOption = (fieldId: string, optionId: string) => {
    setSettings(prev => ({
      ...prev,
      customFields: prev.customFields.map(f => {
        if (f.id === fieldId) {
          return {
            ...f,
            options: f.options.filter(opt => opt.id !== optionId)
          }
        }
        return f
      })
    }))
  }

  const SectionHeader = ({ 
    title, 
    section, 
    icon: Icon 
  }: { 
    title: string
    section: string
    icon: typeof FileText 
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 hover:bg-[#f5f5f7]/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-[#86868b]" />
        <span className="text-[15px] font-medium text-[#1d1d1f]">{title}</span>
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="w-5 h-5 text-[#86868b]" />
      ) : (
        <ChevronDown className="w-5 h-5 text-[#86868b]" />
      )}
    </button>
  )

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#e8e8ed] rounded w-48" />
          <div className="h-64 bg-[#e8e8ed] rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/settings" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-2">
            <ChevronLeft className="w-4 h-4" />
            Back to Settings
          </Link>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Document Templates</h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            Customize invoices, quotes, and packing lists
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={generatePreview}
            className="inline-flex items-center gap-2 bg-white border border-[#d2d2d7]/50 hover:bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-medium px-4 h-10 rounded-xl transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview {activeSection === 'invoice' ? 'Invoice' : activeSection === 'quote' ? 'Quote' : activeSection === 'packingListExport' ? 'Export PL' : 'Factory PL'}
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white text-[13px] font-medium px-5 h-10 rounded-xl transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Templates Section */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[14px] font-semibold text-[#1d1d1f]">Document Templates</h3>
            <p className="text-[12px] text-[#86868b] mt-0.5">
              Set a default template to automatically apply to all new {activeSection === 'invoice' ? 'invoices' : activeSection === 'quote' ? 'quotes' : 'packing lists'}.
            </p>
          </div>
          <button
            onClick={() => setShowSaveTemplateModal(true)}
            className="text-[12px] text-[#0071e3] hover:underline flex items-center gap-1"
          >
            <Save className="w-3 h-3" />
            Save Current as Template
          </button>
        </div>
        
        {/* Default template indicator */}
        {defaultTemplateId && (
          <div className="flex items-center justify-between bg-[#34c759]/10 border border-[#34c759]/30 rounded-lg px-3 py-2 mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#34c759]" />
              <span className="text-[12px] font-medium text-[#34c759]">
                Default template set: {templates.find(t => t.id === defaultTemplateId)?.name || 'Custom'}
              </span>
            </div>
            <button
              onClick={handleClearDefault}
              className="text-[11px] text-[#86868b] hover:text-[#ff3b30] transition-colors"
            >
              Clear default
            </button>
          </div>
        )}
        
        {/* Template list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((template) => {
            const isDefault = template.id === defaultTemplateId || template.isDefault
            return (
              <div
                key={template.id}
                className={`border rounded-lg p-3 transition-colors group ${
                  isDefault 
                    ? 'border-[#34c759] bg-[#34c759]/5' 
                    : 'border-[#d2d2d7]/50 hover:border-[#0071e3]/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[13px] font-medium text-[#1d1d1f]">
                        {template.name}
                      </h4>
                      {isDefault && (
                        <span className="text-[9px] bg-[#34c759] text-white px-1.5 py-0.5 rounded-full font-medium">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {template.isSuggested && (
                        <span className="text-[10px] bg-[#0071e3]/10 text-[#0071e3] px-2 py-0.5 rounded-full">
                          Suggested
                        </span>
                      )}
                    </div>
                  </div>
                  {!template.isSuggested && (
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#ff3b30]/10 rounded transition-all"
                      title="Delete template"
                    >
                      <Trash2 className="w-3 h-3 text-[#ff3b30]" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => applyTemplate(template.id)}
                    className={`flex-1 text-[12px] py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                      applyingTemplateId === template.id
                        ? 'bg-[#34c759] text-white'
                        : 'bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f]'
                    }`}
                  >
                    {applyingTemplateId === template.id ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Applied!
                      </>
                    ) : (
                      'Apply'
                    )}
                  </button>
                  {!isDefault && (
                    <button
                      onClick={() => handleSetDefault(template.id)}
                      disabled={settingDefaultId === template.id}
                      className={`text-[11px] px-2 py-1.5 rounded-md transition-all ${
                        settingDefaultId === template.id
                          ? 'bg-[#34c759] text-white'
                          : 'text-[#86868b] hover:bg-[#34c759]/10 hover:text-[#34c759]'
                      }`}
                      title="Set as default"
                    >
                      {settingDefaultId === template.id ? 'Set!' : 'Set Default'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          
          {templates.length === 0 && (
            <p className="text-[12px] text-[#86868b] col-span-full text-center py-4">
              No templates available for this document type.
            </p>
          )}
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-[16px] font-semibold text-[#1d1d1f] mb-4">
              Save as Template
            </h3>
            <p className="text-[13px] text-[#86868b] mb-4">
              Save your current {activeSection === 'invoice' ? 'invoice' : activeSection === 'quote' ? 'quote' : 'packing list'} configuration as a reusable template.
            </p>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Template name..."
              className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false)
                  setNewTemplateName('')
                }}
                className="flex-1 py-2 text-[14px] text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#e8e8ed] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveCurrentAsTemplate}
                disabled={!newTemplateName.trim()}
                className="flex-1 py-2 text-[14px] text-white bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Margins - Global Settings */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-[#1d1d1f]">Page Margins (mm)</h3>
          <span className="text-[12px] text-[#86868b]">Applies to all documents</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-[12px] text-[#86868b] mb-1">Top</label>
            <input
              type="number"
              min={5}
              max={50}
              value={settings.marginTop}
              onChange={(e) => setSettings(prev => ({ ...prev, marginTop: parseInt(e.target.value) || 20 }))}
              className="w-full h-9 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] text-center focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#86868b] mb-1">Bottom</label>
            <input
              type="number"
              min={5}
              max={50}
              value={settings.marginBottom}
              onChange={(e) => setSettings(prev => ({ ...prev, marginBottom: parseInt(e.target.value) || 20 }))}
              className="w-full h-9 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] text-center focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#86868b] mb-1">Left</label>
            <input
              type="number"
              min={5}
              max={50}
              value={settings.marginLeft}
              onChange={(e) => setSettings(prev => ({ ...prev, marginLeft: parseInt(e.target.value) || 20 }))}
              className="w-full h-9 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] text-center focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#86868b] mb-1">Right</label>
            <input
              type="number"
              min={5}
              max={50}
              value={settings.marginRight}
              onChange={(e) => setSettings(prev => ({ ...prev, marginRight: parseInt(e.target.value) || 20 }))}
              className="w-full h-9 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] text-center focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
        </div>
      </div>

      {/* Document Type Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'invoice' as DocumentType, label: 'Invoices', icon: Receipt },
          { id: 'quote' as DocumentType, label: 'Quotes', icon: FileText },
          { id: 'packingListExport' as DocumentType, label: 'Packing List Export', icon: Package, color: '#34c759' },
          { id: 'packingListFactory' as DocumentType, label: 'Packing List Factory', icon: Package, color: '#ff9500' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
              activeSection === tab.id 
                ? tab.color 
                  ? `text-white`
                  : 'bg-[#0071e3] text-white' 
                : 'bg-white border border-[#d2d2d7]/30 text-[#1d1d1f] hover:bg-[#f5f5f7]'
            }`}
            style={activeSection === tab.id && tab.color ? { backgroundColor: tab.color } : undefined}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoice Settings */}
      {activeSection === 'invoice' && (
        <div className="space-y-4">
          {/* Basic Settings */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Basic Settings" section="basic" icon={FileText} />
            {expandedSections.basic && (
              <div className="p-6 pt-2 space-y-4 border-t border-[#d2d2d7]/20">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      Invoice Title
                    </label>
                    <input
                      type="text"
                      value={settings.invoiceTitle}
                      onChange={(e) => setSettings(prev => ({ ...prev, invoiceTitle: e.target.value }))}
                      placeholder="INVOICE"
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      Subtitle (optional)
                    </label>
                    <input
                      type="text"
                      value={settings.invoiceSubtitle}
                      onChange={(e) => setSettings(prev => ({ ...prev, invoiceSubtitle: e.target.value }))}
                      placeholder="Tax Invoice"
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.invoiceLogo}
                      onChange={(e) => setSettings(prev => ({ ...prev, invoiceLogo: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Show Logo</span>
                  </label>
                  
                  {settings.invoiceLogo && (
                    <select
                      value={settings.invoiceLogoPosition}
                      onChange={(e) => setSettings(prev => ({ ...prev, invoiceLogoPosition: e.target.value as 'left' | 'right' | 'center' }))}
                      className="h-9 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  )}
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.invoiceShowCompanyAddress}
                      onChange={(e) => setSettings(prev => ({ ...prev, invoiceShowCompanyAddress: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Show Company Address</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.invoiceShowVAT}
                      onChange={(e) => setSettings(prev => ({ ...prev, invoiceShowVAT: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Show VAT Number</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.invoiceShowRegistrationNumber}
                      onChange={(e) => setSettings(prev => ({ ...prev, invoiceShowRegistrationNumber: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Show Registration Number</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.invoiceShowPhone}
                      onChange={(e) => setSettings(prev => ({ ...prev, invoiceShowPhone: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Show Phone Number</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.invoiceShowEmail}
                      onChange={(e) => setSettings(prev => ({ ...prev, invoiceShowEmail: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Show Email Address</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.invoiceShowWebsite}
                      onChange={(e) => setSettings(prev => ({ ...prev, invoiceShowWebsite: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Show Website</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.invoiceShowPaymentTerms}
                      onChange={(e) => setSettings(prev => ({ ...prev, invoiceShowPaymentTerms: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Show Payment Terms</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Header Section */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Header Content" section="header" icon={FileText} />
            {expandedSections.header && (
              <div className="p-6 pt-2 space-y-4 border-t border-[#d2d2d7]/20">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                    Header Text
                  </label>
                  <textarea
                    value={settings.invoiceHeader}
                    onChange={(e) => setSettings(prev => ({ ...prev, invoiceHeader: e.target.value }))}
                    placeholder="Text that appears at the top of the invoice..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Section */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Footer Content" section="footer" icon={FileText} />
            {expandedSections.footer && (
              <div className="p-6 pt-2 space-y-4 border-t border-[#d2d2d7]/20">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                    Footer Text
                  </label>
                  <textarea
                    value={settings.invoiceFooter}
                    onChange={(e) => setSettings(prev => ({ ...prev, invoiceFooter: e.target.value }))}
                    placeholder="Text that appears at the bottom of the invoice..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.invoiceShowBankDetails}
                    onChange={(e) => setSettings(prev => ({ ...prev, invoiceShowBankDetails: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                  />
                  <span className="text-[14px] text-[#1d1d1f]">Show Bank Details</span>
                </div>

                {settings.invoiceShowBankDetails && (
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      Bank Details
                    </label>
                    <textarea
                      value={settings.invoiceBankDetails}
                      onChange={(e) => setSettings(prev => ({ ...prev, invoiceBankDetails: e.target.value }))}
                      placeholder="Bank: Example Bank&#10;IBAN: XX00 0000 0000 0000&#10;BIC: EXAMPLEXX"
                      rows={4}
                      className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                    Terms & Conditions
                  </label>
                  <textarea
                    value={settings.invoiceTermsAndConditions}
                    onChange={(e) => setSettings(prev => ({ ...prev, invoiceTermsAndConditions: e.target.value }))}
                    placeholder="Payment terms, legal notices, etc."
                    rows={4}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                    Notes (appears on every invoice)
                  </label>
                  <textarea
                    value={settings.invoiceNotes}
                    onChange={(e) => setSettings(prev => ({ ...prev, invoiceNotes: e.target.value }))}
                    placeholder="Thank you for your business!"
                    rows={2}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Custom Fields */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Custom Fields" section="customFields" icon={Plus} />
            {expandedSections.customFields && (
              <div className="p-6 pt-2 space-y-4 border-t border-[#d2d2d7]/20">
                <p className="text-[13px] text-[#86868b]">
                  Add custom fields with multiple options (e.g., Incoterms with EXW, FOB, CIF, etc.)
                </p>
                
                {settings.customFields.length > 0 && (
                  <div className="space-y-4">
                    {settings.customFields.map((field) => (
                      <div key={field.id} className="p-4 bg-[#f5f5f7] rounded-xl">
                        <div className="flex items-start gap-3">
                          <GripVertical className="w-5 h-5 text-[#86868b] mt-2 cursor-move flex-shrink-0" />
                          
                          <div className="flex-1 space-y-4">
                            {/* Field Label and Type */}
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                                placeholder="Field Label (e.g., Incoterms)"
                                className="flex-1 h-10 px-3 bg-white border border-[#d2d2d7]/30 rounded-lg text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                              />
                              <select
                                value={field.type}
                                onChange={(e) => updateCustomField(field.id, { type: e.target.value as 'text' | 'select' })}
                                className="h-10 px-3 bg-white border border-[#d2d2d7]/30 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                              >
                                <option value="select">Dropdown (multiple options)</option>
                                <option value="text">Text (single value)</option>
                              </select>
                            </div>

                            {/* Options for Select type */}
                            {field.type === 'select' && (
                              <div className="space-y-2">
                                <p className="text-[12px] font-medium text-[#86868b]">Available Options:</p>
                                <div className="flex flex-wrap gap-2">
                                  {field.options.map((option) => (
                                    <div key={option.id} className="flex items-center gap-1 bg-white border border-[#d2d2d7]/30 rounded-lg px-1 pr-2">
                                      <input
                                        type="text"
                                        value={option.value}
                                        onChange={(e) => updateFieldOption(field.id, option.id, e.target.value)}
                                        placeholder="Value"
                                        className="h-8 px-2 bg-transparent border-0 text-[13px] focus:outline-none w-24"
                                      />
                                      <button
                                        onClick={() => removeFieldOption(field.id, option.id)}
                                        className="p-1 text-[#86868b] hover:text-[#ff3b30] transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => addOptionToField(field.id)}
                                    className="flex items-center gap-1 h-8 px-3 bg-white border border-dashed border-[#d2d2d7] rounded-lg text-[12px] text-[#86868b] hover:border-[#0071e3] hover:text-[#0071e3] transition-colors"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Add Option
                                  </button>
                                </div>
                                
                                {/* Default Value Dropdown */}
                                {field.options.length > 0 && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[12px] text-[#86868b]">Default:</span>
                                    <select
                                      value={field.defaultValue}
                                      onChange={(e) => updateCustomField(field.id, { defaultValue: e.target.value })}
                                      className="h-8 px-2 bg-white border border-[#d2d2d7]/30 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                                    >
                                      <option value="">No default</option>
                                      {field.options.filter(o => o.value).map((option) => (
                                        <option key={option.id} value={option.value}>{option.value}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Default Value for Text type */}
                            {field.type === 'text' && (
                              <input
                                type="text"
                                value={field.defaultValue}
                                onChange={(e) => updateCustomField(field.id, { defaultValue: e.target.value })}
                                placeholder="Default Value"
                                className="w-full h-9 px-3 bg-white border border-[#d2d2d7]/30 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                              />
                            )}
                            
                            {/* Show on documents */}
                            <div className="flex items-center gap-4 pt-2 border-t border-[#d2d2d7]/30">
                              <span className="text-[12px] text-[#86868b]">Show on:</span>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.showOnInvoice}
                                  onChange={(e) => updateCustomField(field.id, { showOnInvoice: e.target.checked })}
                                  className="w-3.5 h-3.5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                                />
                                <span className="text-[12px] text-[#1d1d1f]">Invoices</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.showOnPackingList}
                                  onChange={(e) => updateCustomField(field.id, { showOnPackingList: e.target.checked })}
                                  className="w-3.5 h-3.5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                                />
                                <span className="text-[12px] text-[#1d1d1f]">Packing Lists</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.showOnQuote}
                                  onChange={(e) => updateCustomField(field.id, { showOnQuote: e.target.checked })}
                                  className="w-3.5 h-3.5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                                />
                                <span className="text-[12px] text-[#1d1d1f]">Quotes</span>
                              </label>
                            </div>
                            
                            {/* Position on document */}
                            <div className="flex items-center gap-3 pt-2">
                              <span className="text-[12px] text-[#86868b]">Position:</span>
                              <select
                                value={field.position || 'body-top'}
                                onChange={(e) => updateCustomField(field.id, { position: e.target.value as CustomField['position'] })}
                                className="h-8 px-2 bg-white border border-[#d2d2d7]/30 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                              >
                                <option value="header">Header (top of document)</option>
                                <option value="body-top">Body Top (after Bill To)</option>
                                <option value="body-bottom">Body Bottom (after items table)</option>
                                <option value="footer">Footer (end of document)</option>
                              </select>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => removeCustomField(field.id)}
                            className="p-2 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  onClick={addCustomField}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-[#d2d2d7] rounded-xl text-[13px] font-medium text-[#86868b] hover:border-[#0071e3] hover:text-[#0071e3] transition-colors w-full justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Field
                </button>
                
                {/* Example hint */}
                <div className="bg-[#0071e3]/5 rounded-lg p-3 mt-4">
                  <p className="text-[12px] text-[#0071e3] font-medium mb-1">Example: Incoterms</p>
                  <p className="text-[11px] text-[#86868b]">
                    Create a field called &quot;Incoterms&quot; with options: EXW, FCA, FAS, FOB, CFR, CIF, CPT, CIP, DAP, DPU, DDP
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Document Layout */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Document Layout" section="layout" icon={LayoutGrid} />
            {expandedSections.layout && (
              <div className="p-6 pt-2 border-t border-[#d2d2d7]/20">
                <DocumentLayoutEditor
                  elements={settings.invoiceLayout?.length > 0 ? settings.invoiceLayout : DEFAULT_INVOICE_LAYOUT}
                  onChange={(elements) => setSettings(prev => ({ ...prev, invoiceLayout: elements }))}
                />
              </div>
            )}
          </div>

          {/* Table Columns Configuration */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Table Columns" section="columns" icon={Columns} />
            {expandedSections.columns && (
              <div className="p-6 pt-2 border-t border-[#d2d2d7]/20">
                <ColumnConfigurator
                  columns={settings.invoiceTableColumns?.length > 0 ? settings.invoiceTableColumns : DEFAULT_INVOICE_COLUMNS}
                  onChange={(columns) => setSettings(prev => ({ ...prev, invoiceTableColumns: columns }))}
                  documentType="invoice"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Packing List EXPORT Settings */}
      {activeSection === 'packingListExport' && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-[#34c759]/5 rounded-2xl p-4 border border-[#34c759]/20">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-[#34c759]" />
              <h3 className="text-[14px] font-semibold text-[#34c759]">Export Packing List</h3>
            </div>
            <p className="text-[13px] text-[#86868b]">
              For customer and customs clearance. Contains shipping details, HS codes, weights, CBM, and package information.
            </p>
          </div>

          {/* Settings Card */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Title</label>
                  <input
                    type="text"
                    value={settings.packingListExportTitle}
                    onChange={(e) => setSettings(prev => ({ ...prev, packingListExportTitle: e.target.value }))}
                    placeholder="PACKING LIST"
                    className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                  />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.packingListExportLogo}
                      onChange={(e) => setSettings(prev => ({ ...prev, packingListExportLogo: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#34c759] focus:ring-[#34c759]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Show Logo</span>
                  </label>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.packingListExportShowPrices}
                    onChange={(e) => setSettings(prev => ({ ...prev, packingListExportShowPrices: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#d2d2d7] text-[#34c759] focus:ring-[#34c759]"
                  />
                  <span className="text-[14px] text-[#1d1d1f]">Show Prices</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.packingListExportShowWeight}
                    onChange={(e) => setSettings(prev => ({ ...prev, packingListExportShowWeight: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#d2d2d7] text-[#34c759] focus:ring-[#34c759]"
                  />
                  <span className="text-[14px] text-[#1d1d1f]">Show Weight</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.packingListExportShowBarcode}
                    onChange={(e) => setSettings(prev => ({ ...prev, packingListExportShowBarcode: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#d2d2d7] text-[#34c759] focus:ring-[#34c759]"
                  />
                  <span className="text-[14px] text-[#1d1d1f]">Show Barcode</span>
                </label>
              </div>

              {/* Customs & Export Fields */}
              <div className="pt-4 border-t border-[#d2d2d7]/20">
                <h4 className="text-[13px] font-semibold text-[#1d1d1f] mb-3">Customs & Export Fields</h4>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.packingListExportShowHsCode}
                      onChange={(e) => setSettings(prev => ({ ...prev, packingListExportShowHsCode: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#34c759] focus:ring-[#34c759]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">HS Code</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.packingListExportShowGrossWeight}
                      onChange={(e) => setSettings(prev => ({ ...prev, packingListExportShowGrossWeight: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#34c759] focus:ring-[#34c759]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Gross Weight</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.packingListExportShowNetWeight}
                      onChange={(e) => setSettings(prev => ({ ...prev, packingListExportShowNetWeight: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#34c759] focus:ring-[#34c759]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Net Weight</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.packingListExportShowPackages}
                      onChange={(e) => setSettings(prev => ({ ...prev, packingListExportShowPackages: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#34c759] focus:ring-[#34c759]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Packages</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.packingListExportShowCbm}
                      onChange={(e) => setSettings(prev => ({ ...prev, packingListExportShowCbm: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#34c759] focus:ring-[#34c759]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">CBM (m³)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.packingListExportGroupByHsCode}
                      onChange={(e) => setSettings(prev => ({ ...prev, packingListExportGroupByHsCode: e.target.checked }))}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#34c759] focus:ring-[#34c759]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Group by HS Code</span>
                  </label>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="pt-4 border-t border-[#d2d2d7]/20">
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">Default Mode</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="packingListMode"
                      checked={settings.packingListExportMode === 'simple'}
                      onChange={() => setSettings(prev => ({ ...prev, packingListExportMode: 'simple' }))}
                      className="w-4 h-4 text-[#34c759] focus:ring-[#34c759]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Simple (auto from order)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="packingListMode"
                      checked={settings.packingListExportMode === 'advanced'}
                      onChange={() => setSettings(prev => ({ ...prev, packingListExportMode: 'advanced' }))}
                      className="w-4 h-4 text-[#34c759] focus:ring-[#34c759]"
                    />
                    <span className="text-[14px] text-[#1d1d1f]">Advanced (manual editing)</span>
                  </label>
                </div>
              </div>

              {/* Default Values */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#d2d2d7]/20">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Default Shipper Info</label>
                  <textarea
                    value={settings.packingListExportDefaultShipper}
                    onChange={(e) => setSettings(prev => ({ ...prev, packingListExportDefaultShipper: e.target.value }))}
                    placeholder="Your company name, address, tax ID..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Default Shipping Port</label>
                  <input
                    type="text"
                    value={settings.packingListExportDefaultShippingPort}
                    onChange={(e) => setSettings(prev => ({ ...prev, packingListExportDefaultShippingPort: e.target.value }))}
                    placeholder="e.g., SHANGHAI, CHINA"
                    className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Header Text</label>
                <textarea
                  value={settings.packingListExportHeader}
                  onChange={(e) => setSettings(prev => ({ ...prev, packingListExportHeader: e.target.value }))}
                  placeholder="Text that appears at the top..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759] resize-none"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Footer Text</label>
                <textarea
                  value={settings.packingListExportFooter}
                  onChange={(e) => setSettings(prev => ({ ...prev, packingListExportFooter: e.target.value }))}
                  placeholder="Text that appears at the bottom..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759] resize-none"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Handling Notes</label>
                <textarea
                  value={settings.packingListExportNotes}
                  onChange={(e) => setSettings(prev => ({ ...prev, packingListExportNotes: e.target.value }))}
                  placeholder="Handle with care, fragile items, keep dry..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#34c759] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Document Layout */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Document Layout" section="layout" icon={LayoutGrid} />
            {expandedSections.layout && (
              <div className="p-6 pt-2 border-t border-[#d2d2d7]/20">
                <DocumentLayoutEditor
                  elements={settings.packingListExportLayout?.length > 0 ? settings.packingListExportLayout : DEFAULT_INVOICE_LAYOUT}
                  onChange={(elements) => setSettings(prev => ({ ...prev, packingListExportLayout: elements }))}
                />
              </div>
            )}
          </div>

          {/* Table Columns Configuration */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Table Columns" section="columns" icon={Columns} />
            {expandedSections.columns && (
              <div className="p-6 pt-2 border-t border-[#d2d2d7]/20">
                <ColumnConfigurator
                  columns={settings.packingListExportTableColumns?.length > 0 ? settings.packingListExportTableColumns : DEFAULT_PACKING_LIST_COLUMNS}
                  onChange={(columns) => setSettings(prev => ({ ...prev, packingListExportTableColumns: columns }))}
                  documentType="packingListExport"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Packing List FACTORY Settings */}
      {activeSection === 'packingListFactory' && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-[#ff9500]/5 rounded-2xl p-4 border border-[#ff9500]/20">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-[#ff9500]" />
              <h3 className="text-[14px] font-semibold text-[#ff9500]">Factory Packing List</h3>
            </div>
            <p className="text-[13px] text-[#86868b]">
              For factory preparation. Contains product images, Chinese names, and can be sent directly to factory email.
            </p>
          </div>

          {/* Settings Card */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Title</label>
                  <input
                    type="text"
                    value={settings.packingListFactoryTitle}
                    onChange={(e) => setSettings(prev => ({ ...prev, packingListFactoryTitle: e.target.value }))}
                    placeholder="PREPARATION LIST / 备货清单"
                    className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff9500]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Language</label>
                  <select
                    value={settings.packingListFactoryLanguage}
                    onChange={(e) => setSettings(prev => ({ ...prev, packingListFactoryLanguage: e.target.value }))}
                    className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff9500]"
                  >
                    <option value="en">English</option>
                    <option value="zh">Chinese (中文)</option>
                    <option value="en-zh">Bilingual (English + 中文)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Factory Email Address
                  <span className="text-[11px] text-[#86868b] font-normal ml-2">
                    (the packing list will be sent here)
                  </span>
                </label>
                <input
                  type="email"
                  value={settings.packingListFactoryEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, packingListFactoryEmail: e.target.value }))}
                  placeholder="factory@example.com"
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff9500]"
                />
              </div>
              
              <div className="flex flex-wrap gap-4 pt-4 border-t border-[#d2d2d7]/20">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.packingListFactoryShowImages}
                    onChange={(e) => setSettings(prev => ({ ...prev, packingListFactoryShowImages: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#d2d2d7] text-[#ff9500] focus:ring-[#ff9500]"
                  />
                  <span className="text-[14px] text-[#1d1d1f]">Show Product Images</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.packingListFactoryShowProductRef}
                    onChange={(e) => setSettings(prev => ({ ...prev, packingListFactoryShowProductRef: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#d2d2d7] text-[#ff9500] focus:ring-[#ff9500]"
                  />
                  <span className="text-[14px] text-[#1d1d1f]">Show Product Reference</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.packingListFactoryShowChineseName}
                    onChange={(e) => setSettings(prev => ({ ...prev, packingListFactoryShowChineseName: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#d2d2d7] text-[#ff9500] focus:ring-[#ff9500]"
                  />
                  <span className="text-[14px] text-[#1d1d1f]">Show Chinese Name (中文名称)</span>
                </label>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Preparation Notes</label>
                <textarea
                  value={settings.packingListFactoryNotes}
                  onChange={(e) => setSettings(prev => ({ ...prev, packingListFactoryNotes: e.target.value }))}
                  placeholder="Special handling instructions for factory..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff9500] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Custom Fields for Packing List */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Custom Fields for Packing Lists" section="customFields" icon={Plus} />
            {expandedSections.customFields && (
              <div className="p-6 pt-2 space-y-4 border-t border-[#d2d2d7]/20">
                {settings.customFields.filter(f => f.showOnPackingList).length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-[13px] text-[#86868b] mb-3">
                      No custom fields configured for packing lists
                    </p>
                    <p className="text-[12px] text-[#86868b]">
                      Go to the <button onClick={() => setActiveSection('invoice')} className="text-[#0071e3] hover:underline">Invoices tab</button> and 
                      create custom fields with &quot;Packing Lists&quot; enabled
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[13px] text-[#86868b] mb-2">
                      Custom fields that will appear on packing lists:
                    </p>
                    {settings.customFields.filter(f => f.showOnPackingList).map(field => (
                      <div key={field.id} className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-lg">
                        <div>
                          <span className="text-[14px] font-medium text-[#1d1d1f]">{field.label || 'Untitled'}</span>
                          {field.type === 'select' && field.options.length > 0 && (
                            <span className="text-[12px] text-[#86868b] ml-2">
                              ({field.options.filter(o => o.value).length} options)
                            </span>
                          )}
                        </div>
                        <span className="text-[12px] text-[#86868b]">
                          Default: {field.defaultValue || 'None'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document Layout */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Document Layout" section="layout" icon={LayoutGrid} />
            {expandedSections.layout && (
              <div className="p-6 pt-2 border-t border-[#d2d2d7]/20">
                <DocumentLayoutEditor
                  elements={settings.packingListFactoryLayout?.length > 0 ? settings.packingListFactoryLayout : DEFAULT_INVOICE_LAYOUT}
                  onChange={(elements) => setSettings(prev => ({ ...prev, packingListFactoryLayout: elements }))}
                />
              </div>
            )}
          </div>

          {/* Table Columns Configuration */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Table Columns" section="columns" icon={Columns} />
            {expandedSections.columns && (
              <div className="p-6 pt-2 border-t border-[#d2d2d7]/20">
                <ColumnConfigurator
                  columns={settings.packingListFactoryTableColumns?.length > 0 ? settings.packingListFactoryTableColumns : DEFAULT_PACKING_LIST_COLUMNS}
                  onChange={(columns) => setSettings(prev => ({ ...prev, packingListFactoryTableColumns: columns }))}
                  documentType="packingListFactory"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quote Settings */}
      {activeSection === 'quote' && (
        <div className="space-y-4">
          {/* Basic Settings */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Basic Settings" section="basic" icon={FileText} />
            {expandedSections.basic && (
              <div className="p-6 pt-2 space-y-4 border-t border-[#d2d2d7]/20">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      Quote Title
                    </label>
                    <input
                      type="text"
                      value={settings.quoteTitle}
                      onChange={(e) => setSettings(prev => ({ ...prev, quoteTitle: e.target.value }))}
                      placeholder="QUOTATION"
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                      Validity Period (days)
                    </label>
                    <input
                      type="number"
                      value={settings.quoteValidityDays}
                      onChange={(e) => setSettings(prev => ({ ...prev, quoteValidityDays: parseInt(e.target.value) || 30 }))}
                      min={1}
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.quoteLogo}
                    onChange={(e) => setSettings(prev => ({ ...prev, quoteLogo: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                  />
                  <span className="text-[14px] text-[#1d1d1f]">Show Logo</span>
                </label>
              </div>
            )}
          </div>

          {/* Header Section */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Header Content" section="header" icon={FileText} />
            {expandedSections.header && (
              <div className="p-6 pt-2 space-y-4 border-t border-[#d2d2d7]/20">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                    Header Text
                  </label>
                  <textarea
                    value={settings.quoteHeader}
                    onChange={(e) => setSettings(prev => ({ ...prev, quoteHeader: e.target.value }))}
                    placeholder="Thank you for your inquiry. Please find below our quotation..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Section */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Footer Content" section="footer" icon={FileText} />
            {expandedSections.footer && (
              <div className="p-6 pt-2 space-y-4 border-t border-[#d2d2d7]/20">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                    Footer Text
                  </label>
                  <textarea
                    value={settings.quoteFooter}
                    onChange={(e) => setSettings(prev => ({ ...prev, quoteFooter: e.target.value }))}
                    placeholder="We look forward to receiving your order. Please don't hesitate to contact us for any questions."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                    Terms & Conditions
                  </label>
                  <textarea
                    value={settings.quoteTermsAndConditions}
                    onChange={(e) => setSettings(prev => ({ ...prev, quoteTermsAndConditions: e.target.value }))}
                    placeholder="- Prices are valid for 30 days&#10;- Delivery time: 4-6 weeks&#10;- Payment terms: 50% deposit, 50% before shipment&#10;- Incoterms: FOB"
                    rows={5}
                    className="w-full px-3 py-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Custom Fields for Quotes */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Custom Fields for Quotes" section="customFields" icon={Plus} />
            {expandedSections.customFields && (
              <div className="p-6 pt-2 space-y-4 border-t border-[#d2d2d7]/20">
                {settings.customFields.filter(f => f.showOnQuote).length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-[13px] text-[#86868b] mb-3">
                      No custom fields configured for quotes
                    </p>
                    <p className="text-[12px] text-[#86868b]">
                      Go to the <button onClick={() => setActiveSection('invoice')} className="text-[#0071e3] hover:underline">Invoices tab</button> and 
                      create custom fields with &quot;Quotes&quot; enabled
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[13px] text-[#86868b] mb-2">
                      Custom fields that will appear on quotes:
                    </p>
                    {settings.customFields.filter(f => f.showOnQuote).map(field => (
                      <div key={field.id} className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-lg">
                        <div>
                          <span className="text-[14px] font-medium text-[#1d1d1f]">{field.label || 'Untitled'}</span>
                          {field.type === 'select' && field.options.length > 0 && (
                            <span className="text-[12px] text-[#86868b] ml-2">
                              ({field.options.filter(o => o.value).length} options)
                            </span>
                          )}
                        </div>
                        <span className="text-[12px] text-[#86868b]">
                          Default: {field.defaultValue || 'None'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document Layout */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Document Layout" section="layout" icon={LayoutGrid} />
            {expandedSections.layout && (
              <div className="p-6 pt-2 border-t border-[#d2d2d7]/20">
                <DocumentLayoutEditor
                  elements={settings.quoteLayout?.length > 0 ? settings.quoteLayout : DEFAULT_INVOICE_LAYOUT}
                  onChange={(elements) => setSettings(prev => ({ ...prev, quoteLayout: elements }))}
                />
              </div>
            )}
          </div>

          {/* Table Columns Configuration */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <SectionHeader title="Table Columns" section="columns" icon={Columns} />
            {expandedSections.columns && (
              <div className="p-6 pt-2 border-t border-[#d2d2d7]/20">
                <ColumnConfigurator
                  columns={settings.quoteTableColumns?.length > 0 ? settings.quoteTableColumns : DEFAULT_INVOICE_COLUMNS}
                  onChange={(columns) => setSettings(prev => ({ ...prev, quoteTableColumns: columns }))}
                  documentType="quote"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons - Bottom */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={generatePreview}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] rounded-xl text-[13px] font-medium hover:bg-[#f5f5f7] transition-colors"
        >
          <Eye className="w-4 h-4" />
          Preview {activeSection === 'invoice' ? 'Invoice' : activeSection === 'quote' ? 'Quote' : activeSection === 'packingListExport' ? 'Export PL' : 'Factory PL'}
        </button>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white text-[13px] font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Preview Modal - Real PDF Preview - Fullscreen */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Preview Header */}
          <div className="bg-[#1d1d1f] border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <h3 className="text-[15px] font-medium text-white">
              {activeSection === 'invoice' ? 'Invoice' : activeSection === 'quote' ? 'Quote' : activeSection === 'packingListExport' ? 'Export Packing List' : 'Factory Packing List'} Preview
            </h3>
            <div className="flex items-center gap-4">
              <p className="text-[12px] text-white/60">
                Sample data preview
              </p>
              <button
                onClick={closePreview}
                className="px-4 py-1.5 bg-white/10 text-white rounded-lg text-[13px] font-medium hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {/* PDF Preview - iframe - Full height */}
          <div className="flex-1 overflow-hidden">
            <iframe
              src={previewUrl}
              className="w-full h-full bg-white"
              title="Document Preview"
            />
          </div>
        </div>
      )}
    </div>
  )
}
