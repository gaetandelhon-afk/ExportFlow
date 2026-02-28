'use client'

// Document template types
export interface DocumentTemplate {
  id: string
  name: string
  documentType: 'invoice' | 'quote' | 'packingListExport' | 'packingListFactory'
  createdAt: string
  updatedAt?: string
  isDefault?: boolean
  isSuggested?: boolean
  settings: {
    // Layout elements
    layoutElements?: Array<{
      id: string
      type: string
      zone: string
      order: number
      visible: boolean
    }>
    // Table columns
    tableColumns?: Array<{
      id: string
      label: string
      field: string
      width: number
      visible: boolean
      order: number
    }>
    // Margins
    margins?: {
      top: number
      bottom: number
      left: number
      right: number
    }
    // Display settings
    headerText?: string
    footerText?: string
    termsAndConditions?: string
    notes?: string
    showBankDetails?: boolean
    showCompanyAddress?: boolean
    showVAT?: boolean
    showPhone?: boolean
    showEmail?: boolean
    showWebsite?: boolean
  }
}

// Cache for templates
let templatesCache: DocumentTemplate[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 30000 // 30 seconds

// Convert API response to DocumentTemplate format
function mapApiTemplate(apiTemplate: {
  id: string
  name: string
  documentType: string
  createdAt: string
  updatedAt?: string
  isDefault?: boolean
  isSuggested?: boolean
  layoutElements?: unknown
  tableColumns?: unknown
  margins?: unknown
  displaySettings?: unknown
}): DocumentTemplate {
  return {
    id: apiTemplate.id,
    name: apiTemplate.name,
    documentType: apiTemplate.documentType as DocumentTemplate['documentType'],
    createdAt: apiTemplate.createdAt,
    updatedAt: apiTemplate.updatedAt,
    isDefault: apiTemplate.isDefault,
    isSuggested: apiTemplate.isSuggested,
    settings: {
      layoutElements: apiTemplate.layoutElements as DocumentTemplate['settings']['layoutElements'],
      tableColumns: apiTemplate.tableColumns as DocumentTemplate['settings']['tableColumns'],
      margins: apiTemplate.margins as DocumentTemplate['settings']['margins'],
      ...(apiTemplate.displaySettings as object || {}),
    },
  }
}

// Fetch all templates from API
export async function fetchTemplates(documentType?: DocumentTemplate['documentType']): Promise<DocumentTemplate[]> {
  try {
    const url = documentType 
      ? `/api/templates?documentType=${documentType}`
      : '/api/templates'
    
    const res = await fetch(url)
    if (!res.ok) {
      console.error('Failed to fetch templates:', await res.text())
      return []
    }
    
    const data = await res.json()
    const templates = (data.templates || []).map(mapApiTemplate)
    
    // Update cache
    if (!documentType) {
      templatesCache = templates
      lastFetchTime = Date.now()
    }
    
    return templates
  } catch (error) {
    console.error('Error fetching templates:', error)
    return []
  }
}

// Get all templates (with caching)
export async function getDocumentTemplates(): Promise<DocumentTemplate[]> {
  // Return cached if fresh
  if (templatesCache && Date.now() - lastFetchTime < CACHE_DURATION) {
    return templatesCache
  }
  
  return fetchTemplates()
}

// Get templates for a specific document type
export async function getTemplatesForType(documentType: DocumentTemplate['documentType']): Promise<DocumentTemplate[]> {
  return fetchTemplates(documentType)
}

// Get templates synchronously from cache (for initial render)
export function getTemplatesFromCache(documentType?: DocumentTemplate['documentType']): DocumentTemplate[] {
  if (!templatesCache) return []
  
  if (documentType) {
    return templatesCache.filter(t => t.documentType === documentType)
  }
  
  return templatesCache
}

// Save a new template
export async function saveTemplate(template: {
  name: string
  documentType: DocumentTemplate['documentType']
  settings: DocumentTemplate['settings']
  isDefault?: boolean
}): Promise<DocumentTemplate | null> {
  try {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: template.name,
        documentType: template.documentType,
        layoutElements: template.settings.layoutElements,
        tableColumns: template.settings.tableColumns,
        margins: template.settings.margins,
        displaySettings: {
          headerText: template.settings.headerText,
          footerText: template.settings.footerText,
          termsAndConditions: template.settings.termsAndConditions,
          notes: template.settings.notes,
          showBankDetails: template.settings.showBankDetails,
          showCompanyAddress: template.settings.showCompanyAddress,
          showVAT: template.settings.showVAT,
          showPhone: template.settings.showPhone,
          showEmail: template.settings.showEmail,
          showWebsite: template.settings.showWebsite,
        },
        isDefault: template.isDefault,
      }),
    })
    
    if (!res.ok) {
      console.error('Failed to save template:', await res.text())
      return null
    }
    
    const data = await res.json()
    
    // Invalidate cache
    templatesCache = null
    
    return mapApiTemplate(data.template)
  } catch (error) {
    console.error('Error saving template:', error)
    return null
  }
}

// Update a template
export async function updateTemplate(
  templateId: string,
  updates: Partial<{
    name: string
    settings: DocumentTemplate['settings']
    isDefault: boolean
  }>
): Promise<DocumentTemplate | null> {
  try {
    const res = await fetch(`/api/templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: updates.name,
        layoutElements: updates.settings?.layoutElements,
        tableColumns: updates.settings?.tableColumns,
        margins: updates.settings?.margins,
        displaySettings: updates.settings ? {
          headerText: updates.settings.headerText,
          footerText: updates.settings.footerText,
          termsAndConditions: updates.settings.termsAndConditions,
          notes: updates.settings.notes,
          showBankDetails: updates.settings.showBankDetails,
          showCompanyAddress: updates.settings.showCompanyAddress,
          showVAT: updates.settings.showVAT,
          showPhone: updates.settings.showPhone,
          showEmail: updates.settings.showEmail,
          showWebsite: updates.settings.showWebsite,
        } : undefined,
        isDefault: updates.isDefault,
      }),
    })
    
    if (!res.ok) {
      console.error('Failed to update template:', await res.text())
      return null
    }
    
    const data = await res.json()
    
    // Invalidate cache
    templatesCache = null
    
    return mapApiTemplate(data.template)
  } catch (error) {
    console.error('Error updating template:', error)
    return null
  }
}

// Delete a template
export async function deleteTemplate(templateId: string): Promise<boolean> {
  // Don't delete suggested templates
  if (templateId.startsWith('suggested-')) return false
  
  try {
    const res = await fetch(`/api/templates/${templateId}`, {
      method: 'DELETE',
    })
    
    if (!res.ok) {
      console.error('Failed to delete template:', await res.text())
      return false
    }
    
    // Invalidate cache
    templatesCache = null
    
    return true
  } catch (error) {
    console.error('Error deleting template:', error)
    return false
  }
}

// Get a specific template by ID
export async function getTemplateById(templateId: string): Promise<DocumentTemplate | null> {
  // For suggested templates, fetch from cache or API
  if (templateId.startsWith('suggested-')) {
    const templates = await getDocumentTemplates()
    return templates.find(t => t.id === templateId) || null
  }
  
  try {
    const res = await fetch(`/api/templates/${templateId}`)
    if (!res.ok) {
      return null
    }
    
    const data = await res.json()
    return mapApiTemplate(data.template)
  } catch {
    return null
  }
}

// Get template by ID synchronously from cache
export function getTemplateByIdSync(templateId: string): DocumentTemplate | null {
  if (!templatesCache) return null
  return templatesCache.find(t => t.id === templateId) || null
}

// Set a template as default for its document type
export async function setDefaultTemplate(templateId: string, documentType: DocumentTemplate['documentType']): Promise<boolean> {
  try {
    const res = await fetch('/api/templates/default', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, documentType }),
    })
    
    if (!res.ok) {
      console.error('Failed to set default template:', await res.text())
      return false
    }
    
    templatesCache = null
    return true
  } catch (error) {
    console.error('Error setting default template:', error)
    return false
  }
}

// Get the default template for a document type
export async function getDefaultTemplate(documentType: DocumentTemplate['documentType']): Promise<DocumentTemplate | null> {
  try {
    const res = await fetch(`/api/templates/default?documentType=${documentType}`)
    if (!res.ok) {
      return null
    }
    
    const data = await res.json()
    if (!data.template) return null
    
    return {
      id: data.template.id,
      name: data.template.name,
      documentType: data.template.documentType as DocumentTemplate['documentType'],
      createdAt: data.template.createdAt,
      updatedAt: data.template.updatedAt,
      isDefault: true,
      settings: {
        layoutElements: data.template.layoutElements as DocumentTemplate['settings']['layoutElements'],
        tableColumns: data.template.tableColumns as DocumentTemplate['settings']['tableColumns'],
        margins: data.template.margins as DocumentTemplate['settings']['margins'],
        ...(data.template.displaySettings as object || {}),
      },
    }
  } catch (error) {
    console.error('Error getting default template:', error)
    return null
  }
}
