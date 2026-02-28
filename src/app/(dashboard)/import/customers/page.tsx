'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, ArrowRight, 
  ArrowLeft, Download, Loader2, Check, AlertTriangle, Layers,
  Table, Eye, Users, Plus, ChevronLeft
} from 'lucide-react'
import {
  parseExcelFile,
  getSheetData,
  ParsedFile
} from '@/lib/excelImport'
import {
  autoDetectCustomerMappings,
  extractCustomers,
  validateCustomerImport,
  generateCustomerTemplate,
  CustomerColumnMapping,
  ImportedCustomer,
  CustomerImportValidation,
  CUSTOMER_MAPPABLE_FIELDS,
  CustomerMappedField,
  CustomerMappableFieldDef,
  createCustomerCustomFieldId,
  isCustomerCustomField,
  getExcelColumnLetter
} from '@/lib/customerImport'

type ImportStep = 'upload' | 'sheets' | 'mapping' | 'validate' | 'confirm'

const STEPS: { id: ImportStep; label: string; icon: typeof Upload }[] = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'sheets', label: 'Sheets', icon: Layers },
  { id: 'mapping', label: 'Mapping', icon: Table },
  { id: 'validate', label: 'Validate', icon: Eye },
  { id: 'confirm', label: 'Import', icon: Check },
]

export default function CustomerImportPage() {
  const router = useRouter()
  
  // Step state
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // File state
  const [file, setFile] = useState<File | null>(null)
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  
  // Data state
  const [sheetData, setSheetData] = useState<string[][]>([])
  const [headerRowIndex, setHeaderRowIndex] = useState(0)
  const [mappings, setMappings] = useState<CustomerColumnMapping[]>([])
  const [manualMappings, setManualMappings] = useState<Record<number, CustomerMappedField>>({})
  const [duplicateAction, setDuplicateAction] = useState<'update' | 'skip' | 'create_new'>('update')
  const [customers, setCustomers] = useState<ImportedCustomer[]>([])
  const [validation, setValidation] = useState<CustomerImportValidation | null>(null)
  
  // Import state
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null)
  
  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomerMappableFieldDef[]>([])
  const [showAddCustomField, setShowAddCustomField] = useState(false)
  const [newCustomFieldName, setNewCustomFieldName] = useState('')
  
  // Existing customers
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set())
  
  // Price tiers for mapping
  const [priceTiers, setPriceTiers] = useState<{ id: string; name: string; code: string }[]>([])

  // Load price tiers and existing customers
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load price tiers
        const tiersRes = await fetch('/api/settings/price-tiers')
        if (tiersRes.ok) {
          const data = await tiersRes.json()
          setPriceTiers(data.tiers || [])
        }
        
        // Load existing customers to check for duplicates
        const customersRes = await fetch('/api/customers/list')
        if (customersRes.ok) {
          const data = await customersRes.json()
          const emails = new Set<string>(
            (data.customers || []).map((c: { email: string }) => c.email.toLowerCase())
          )
          setExistingEmails(emails)
        }
      } catch {
        console.error('Failed to load data')
      }
    }
    loadData()
  }, [])
  
  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'upload': return file !== null
      case 'sheets': return selectedSheet !== ''
      case 'mapping': {
        const hasCompanyName = mappings.some(m => m.mappedTo === 'companyName')
        const hasEmail = mappings.some(m => m.mappedTo === 'email')
        return hasCompanyName && hasEmail
      }
      case 'validate': return validation?.isValid ?? false
      case 'confirm': return true
      default: return false
    }
  }, [currentStep, file, selectedSheet, mappings, validation])

  const stepIndex = STEPS.findIndex(s => s.id === currentStep)

  const goNext = async () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep)
    if (currentIndex < STEPS.length - 1) {
      setIsProcessing(true)
      setError(null)
      
      try {
        // Process data before moving to next step
        if (currentStep === 'sheets') {
          if (!fileBuffer || !selectedSheet) return
          const data = getSheetData(fileBuffer, selectedSheet)
          setSheetData(data)
          const detectedMappings = autoDetectCustomerMappings(data[0] || [])
          setMappings(detectedMappings)
          setHeaderRowIndex(0)
        }
        
        if (currentStep === 'mapping') {
          // Extract customers from sheet data
          const extracted = extractCustomers(
            sheetData,
            mappings,
            headerRowIndex,
            existingEmails,
            duplicateAction
          )
          setCustomers(extracted)
          
          // Validate
          const valid = validateCustomerImport(extracted)
          setValidation(valid)
        }
        
        setCurrentStep(STEPS[currentIndex + 1].id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Processing failed')
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const goBack = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id)
    }
  }

  const handleFileUpload = async (uploadedFile: File) => {
    setIsProcessing(true)
    setError(null)
    
    try {
      const buffer = await uploadedFile.arrayBuffer()
      const parsed = parseExcelFile(buffer, uploadedFile.name)
      
      setFile(uploadedFile)
      setFileBuffer(buffer)
      setParsedFile(parsed)
      
      // Auto-select first sheet if only one
      if (parsed.sheets.length === 1) {
        setSelectedSheet(parsed.sheets[0].name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setIsProcessing(false)
    }
  }

  const updateMapping = (columnIndex: number, field: CustomerMappedField) => {
    setMappings(prev => prev.map(m =>
      m.columnIndex === columnIndex ? { ...m, mappedTo: field } : m
    ))
    setManualMappings(prev => ({ ...prev, [columnIndex]: field }))
  }

  const addCustomField = () => {
    if (!newCustomFieldName.trim()) return
    const fieldId = createCustomerCustomFieldId(newCustomFieldName)
    const newField: CustomerMappableFieldDef = {
      id: fieldId,
      label: newCustomFieldName.trim(),
      required: false
    }
    setCustomFields(prev => [...prev, newField])
    setNewCustomFieldName('')
    setShowAddCustomField(false)
  }

  const handleImport = async () => {
    if (!validation || !validation.isValid) return
    
    setIsImporting(true)
    setError(null)
    
    try {
      const customersToImport = customers
        .filter(c => c.action !== 'skip' && c.errors.length === 0)
      
      const res = await fetch('/api/customers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customers: customersToImport,
          priceTiers // Send price tiers for code -> id mapping
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Import failed')
      }
      
      setImportResult({
        created: data.created,
        updated: data.updated,
        errors: data.errors || []
      })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const buffer = generateCustomerTemplate()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ExportFlow_Customer_Import_Template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/customers" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to Customers
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f]">Import Customers</h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              Import customers from Excel or CSV files
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 text-[#0071e3] hover:text-[#0077ed] text-[14px] font-medium"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon
            const isActive = step.id === currentStep
            const isCompleted = index < stepIndex
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-2 ${
                  isActive ? 'text-[#0071e3]' : isCompleted ? 'text-[#34c759]' : 'text-[#86868b]'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-[#0071e3] text-white' : 
                    isCompleted ? 'bg-[#34c759] text-white' : 
                    'bg-[#f5f5f7]'
                  }`}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                  </div>
                  <span className={`text-[13px] font-medium ${
                    isActive ? 'text-[#1d1d1f]' : 'text-[#86868b]'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    index < stepIndex ? 'bg-[#34c759]' : 'bg-[#d2d2d7]'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#ff3b30] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-medium text-[#ff3b30]">Error</p>
            <p className="text-[13px] text-[#ff3b30]/80">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-[#ff3b30]" />
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6 min-h-[400px]">
        
        {/* Upload Step */}
        {currentStep === 'upload' && (
          <div>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">Upload Customer File</h2>
            
            <div 
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                file ? 'border-[#34c759] bg-[#34c759]/5' : 'border-[#d2d2d7] hover:border-[#0071e3]'
              }`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const droppedFile = e.dataTransfer.files[0]
                if (droppedFile) handleFileUpload(droppedFile)
              }}
            >
              {file ? (
                <div className="flex items-center justify-center gap-4">
                  <FileSpreadsheet className="w-12 h-12 text-[#34c759]" />
                  <div className="text-left">
                    <p className="text-[15px] font-medium text-[#1d1d1f]">{file.name}</p>
                    <p className="text-[13px] text-[#86868b]">
                      {(file.size / 1024).toFixed(1)} KB
                      {parsedFile && ` • ${parsedFile.sheets.length} sheet(s)`}
                    </p>
                  </div>
                  <button
                    onClick={() => { setFile(null); setParsedFile(null); setFileBuffer(null) }}
                    className="p-2 hover:bg-[#f5f5f7] rounded-lg"
                  >
                    <X className="w-5 h-5 text-[#86868b]" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
                  <p className="text-[15px] text-[#1d1d1f] mb-2">
                    Drag and drop your file here, or{' '}
                    <label className="text-[#0071e3] cursor-pointer hover:underline">
                      browse
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleFileUpload(f)
                        }}
                      />
                    </label>
                  </p>
                  <p className="text-[13px] text-[#86868b]">
                    Supports Excel (.xlsx, .xls) and CSV files
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Sheets Step */}
        {currentStep === 'sheets' && parsedFile && (
          <div>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">Select Sheet</h2>
            <div className="grid grid-cols-2 gap-4">
              {parsedFile.sheets.map((sheet) => (
                <button
                  key={sheet.name}
                  onClick={() => setSelectedSheet(sheet.name)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedSheet === sheet.name 
                      ? 'border-[#0071e3] bg-[#0071e3]/5' 
                      : 'border-[#d2d2d7]/50 hover:border-[#0071e3]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Layers className={`w-5 h-5 ${
                      selectedSheet === sheet.name ? 'text-[#0071e3]' : 'text-[#86868b]'
                    }`} />
                    <div>
                      <p className="text-[14px] font-medium text-[#1d1d1f]">{sheet.name}</p>
                      <p className="text-[12px] text-[#86868b]">
                        {sheet.rowCount} rows • {sheet.columnCount} columns
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mapping Step */}
        {currentStep === 'mapping' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Map Columns</h2>
              <div className="flex items-center gap-3">
                <label className="text-[13px] text-[#86868b]">Header row:</label>
                <select
                  value={headerRowIndex}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value)
                    setHeaderRowIndex(idx)
                    const newMappings = autoDetectCustomerMappings(sheetData[idx] || [])
                    const mergedMappings = newMappings.map(m => {
                      if (manualMappings[m.columnIndex] !== undefined) {
                        return { ...m, mappedTo: manualMappings[m.columnIndex] }
                      }
                      return m
                    })
                    setMappings(mergedMappings)
                  }}
                  className="h-8 px-2 bg-[#f5f5f7] rounded-lg text-[13px]"
                >
                  {sheetData.slice(0, 10).map((_, idx) => (
                    <option key={idx} value={idx}>Row {idx + 1}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#d2d2d7]/30">
                    <th className="text-left py-3 px-2 text-[12px] font-medium text-[#86868b] uppercase">Column</th>
                    <th className="text-left py-3 px-2 text-[12px] font-medium text-[#86868b] uppercase">Sample Data</th>
                    <th className="text-left py-3 px-2 text-[12px] font-medium text-[#86868b] uppercase">Map To</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping) => {
                    const sampleValues = sheetData
                      .slice(headerRowIndex + 1, headerRowIndex + 4)
                      .map(row => row[mapping.columnIndex])
                      .filter(v => v)
                      .slice(0, 2)
                    
                    return (
                      <tr key={mapping.columnIndex} className="border-b border-[#d2d2d7]/20">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-[#0071e3]/10 text-[#0071e3] text-[11px] font-mono font-semibold rounded">
                              {getExcelColumnLetter(mapping.columnIndex)}
                            </span>
                            <span className="font-medium text-[#1d1d1f]">
                              {mapping.columnHeader || `Column ${mapping.columnIndex + 1}`}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-[13px] text-[#86868b]">
                            {sampleValues.join(', ') || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <select
                            value={mapping.mappedTo}
                            onChange={(e) => updateMapping(mapping.columnIndex, e.target.value as CustomerMappedField)}
                            className="h-9 px-3 bg-[#f5f5f7] rounded-lg text-[14px] w-full"
                          >
                            <optgroup label="Standard Fields">
                              {CUSTOMER_MAPPABLE_FIELDS.map(field => (
                                <option key={field.id} value={field.id}>
                                  {field.label} {field.required && '*'}
                                </option>
                              ))}
                            </optgroup>
                            {priceTiers.length > 0 && (
                              <optgroup label="Price Tier Values">
                                {priceTiers.map(tier => (
                                  <option key={tier.id} value={tier.code} disabled>
                                    {tier.name} (code: {tier.code})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {customFields.length > 0 && (
                              <optgroup label="Custom Fields">
                                {customFields.map(field => (
                                  <option key={field.id} value={field.id}>
                                    {field.label}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Custom Field */}
            <div className="mt-4 pt-4 border-t border-[#d2d2d7]/30">
              {showAddCustomField ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCustomFieldName}
                    onChange={(e) => setNewCustomFieldName(e.target.value)}
                    placeholder="Custom field name"
                    className="h-9 px-3 bg-[#f5f5f7] rounded-lg text-[14px] flex-1"
                    autoFocus
                  />
                  <button
                    onClick={addCustomField}
                    disabled={!newCustomFieldName.trim()}
                    className="h-9 px-4 bg-[#0071e3] text-white text-[13px] font-medium rounded-lg disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setShowAddCustomField(false); setNewCustomFieldName('') }}
                    className="h-9 px-3 text-[#86868b] hover:text-[#1d1d1f]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddCustomField(true)}
                  className="text-[14px] text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Field
                </button>
              )}
            </div>

            {/* Required fields indicator */}
            <div className="mt-4 flex items-center gap-4">
              {!mappings.some(m => m.mappedTo === 'companyName') && (
                <span className="text-[13px] text-[#ff3b30] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Company name required
                </span>
              )}
              {!mappings.some(m => m.mappedTo === 'email') && (
                <span className="text-[13px] text-[#ff3b30] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Email required
                </span>
              )}
            </div>
          </div>
        )}

        {/* Validate Step */}
        {currentStep === 'validate' && validation && (
          <div>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">Review Import</h2>
            
            {/* Stats */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="bg-[#f5f5f7] rounded-xl p-4 text-center">
                <p className="text-[24px] font-semibold text-[#1d1d1f]">{validation.stats.total}</p>
                <p className="text-[12px] text-[#86868b]">Total</p>
              </div>
              <div className="bg-[#34c759]/10 rounded-xl p-4 text-center">
                <p className="text-[24px] font-semibold text-[#34c759]">{validation.stats.toCreate}</p>
                <p className="text-[12px] text-[#86868b]">To Create</p>
              </div>
              <div className="bg-[#0071e3]/10 rounded-xl p-4 text-center">
                <p className="text-[24px] font-semibold text-[#0071e3]">{validation.stats.toUpdate}</p>
                <p className="text-[12px] text-[#86868b]">To Update</p>
              </div>
              <div className="bg-[#ff9500]/10 rounded-xl p-4 text-center">
                <p className="text-[24px] font-semibold text-[#ff9500]">{validation.stats.toSkip}</p>
                <p className="text-[12px] text-[#86868b]">To Skip</p>
              </div>
              <div className="bg-[#ff3b30]/10 rounded-xl p-4 text-center">
                <p className="text-[24px] font-semibold text-[#ff3b30]">{validation.stats.errors}</p>
                <p className="text-[12px] text-[#86868b]">Errors</p>
              </div>
            </div>

            {/* Duplicate handling */}
            <div className="mb-6 p-4 bg-[#f5f5f7] rounded-xl">
              <p className="text-[14px] font-medium text-[#1d1d1f] mb-2">When email already exists:</p>
              <div className="flex gap-4">
                {(['update', 'skip', 'create_new'] as const).map((action) => (
                  <label key={action} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="duplicateAction"
                      value={action}
                      checked={duplicateAction === action}
                      onChange={() => {
                        setDuplicateAction(action)
                        // Re-extract with new action
                        const extracted = extractCustomers(
                          sheetData,
                          mappings,
                          headerRowIndex,
                          existingEmails,
                          action
                        )
                        setCustomers(extracted)
                        setValidation(validateCustomerImport(extracted))
                      }}
                      className="accent-[#0071e3]"
                    />
                    <span className="text-[13px] text-[#1d1d1f]">
                      {action === 'update' && 'Update existing'}
                      {action === 'skip' && 'Skip'}
                      {action === 'create_new' && 'Create duplicate'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Customer preview */}
            <div className="border border-[#d2d2d7]/30 rounded-xl overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-[#f5f5f7] sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-3 text-[11px] font-medium text-[#86868b] uppercase">Status</th>
                      <th className="text-left py-2 px-3 text-[11px] font-medium text-[#86868b] uppercase">Company</th>
                      <th className="text-left py-2 px-3 text-[11px] font-medium text-[#86868b] uppercase">Email</th>
                      <th className="text-left py-2 px-3 text-[11px] font-medium text-[#86868b] uppercase">Contact</th>
                      <th className="text-left py-2 px-3 text-[11px] font-medium text-[#86868b] uppercase">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer, idx) => (
                      <tr key={idx} className={`border-t border-[#d2d2d7]/20 ${
                        customer.errors.length > 0 ? 'bg-[#ff3b30]/5' : ''
                      }`}>
                        <td className="py-2 px-3">
                          {customer.errors.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#ff3b30]">
                              <AlertCircle className="w-3 h-3" />
                              Error
                            </span>
                          ) : customer.action === 'update' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0071e3]">
                              <ArrowRight className="w-3 h-3" />
                              Update
                            </span>
                          ) : customer.action === 'skip' ? (
                            <span className="text-[11px] font-medium text-[#86868b]">Skip</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#34c759]">
                              <Plus className="w-3 h-3" />
                              Create
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-[13px] text-[#1d1d1f]">{customer.companyName || '-'}</td>
                        <td className="py-2 px-3 text-[13px] text-[#1d1d1f]">{customer.email || '-'}</td>
                        <td className="py-2 px-3 text-[13px] text-[#86868b]">{customer.contactName || '-'}</td>
                        <td className="py-2 px-3">
                          {customer.errors.length > 0 && (
                            <span className="text-[11px] text-[#ff3b30]">{customer.errors.join(', ')}</span>
                          )}
                          {customer.warnings.length > 0 && customer.errors.length === 0 && (
                            <span className="text-[11px] text-[#ff9500]">{customer.warnings.join(', ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {!validation.isValid && (
              <div className="mt-4 p-4 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-xl">
                <div className="flex items-center gap-2 text-[#ff3b30]">
                  <AlertTriangle className="w-5 h-5" />
                  <p className="text-[14px] font-medium">Cannot proceed with errors</p>
                </div>
                <p className="text-[13px] text-[#ff3b30]/80 mt-1">
                  Fix the errors above before importing
                </p>
              </div>
            )}
          </div>
        )}

        {/* Confirm Step */}
        {currentStep === 'confirm' && (
          <div className="text-center py-8">
            {importResult ? (
              <div>
                <CheckCircle className="w-16 h-16 text-[#34c759] mx-auto mb-4" />
                <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-2">
                  Import Complete!
                </h2>
                <p className="text-[15px] text-[#86868b] mb-6">
                  {importResult.created} created, {importResult.updated} updated
                </p>
                {importResult.errors.length > 0 && (
                  <div className="mb-6 p-4 bg-[#ff9500]/10 rounded-xl text-left max-w-md mx-auto">
                    <p className="text-[13px] font-medium text-[#ff9500] mb-2">
                      {importResult.errors.length} error(s) occurred:
                    </p>
                    <ul className="text-[12px] text-[#ff9500]/80 space-y-1">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>...and {importResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => router.push('/customers')}
                  className="h-11 px-6 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors"
                >
                  Go to Customers
                </button>
              </div>
            ) : (
              <div>
                <Users className="w-16 h-16 text-[#0071e3] mx-auto mb-4" />
                <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-2">
                  Ready to Import
                </h2>
                <p className="text-[15px] text-[#86868b] mb-6">
                  {validation?.stats.toCreate || 0} customers to create,{' '}
                  {validation?.stats.toUpdate || 0} to update
                </p>
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="h-11 px-6 bg-[#34c759] text-white text-[14px] font-medium rounded-xl hover:bg-[#2db350] transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Start Import
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={goBack}
          disabled={stepIndex === 0 || isProcessing}
          className="h-11 px-5 flex items-center gap-2 text-[14px] font-medium text-[#1d1d1f] bg-[#f5f5f7] rounded-xl hover:bg-[#e8e8ed] transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        
        {currentStep !== 'confirm' && (
          <button
            onClick={goNext}
            disabled={!canGoNext() || isProcessing}
            className="h-11 px-5 flex items-center gap-2 text-[14px] font-medium text-white bg-[#0071e3] rounded-xl hover:bg-[#0077ed] transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
