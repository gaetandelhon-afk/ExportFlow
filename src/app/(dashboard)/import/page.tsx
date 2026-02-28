'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, ArrowRight, 
  ArrowLeft, Download, Loader2, Check, AlertTriangle, Layers,
  Table, Eye, Settings2, Package, Plus, Tag, FolderPlus, Folder, DollarSign
} from 'lucide-react'
import {
  parseExcelFile,
  getSheetData,
  autoDetectMappings,
  classifyRows,
  extractProducts,
  validateImport,
  generateTemplate,
  ParsedFile,
  ColumnMapping,
  ClassifiedRow,
  ImportedProduct,
  ImportValidation,
  MAPPABLE_FIELDS,
  MappedField,
  MappableFieldDef,
  createCustomFieldId,
  isCustomField,
  getMappableFieldsWithTiers,
  ImportPriceTier,
  isPriceTierField,
  getTierCodeFromField
} from '@/lib/excelImport'
import BatchImageImport from '@/components/BatchImageImport'
import { VariantGroup } from '@/lib/fuzzyMatch'

type ImportStep = 'upload' | 'sheets' | 'mapping' | 'classify' | 'variants' | 'validate' | 'confirm'

// Convert column index to Excel column letter (0 = A, 1 = B, ..., 25 = Z, 26 = AA, etc.)
function getExcelColumnLetter(index: number): string {
  let letter = ''
  let temp = index
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter
    temp = Math.floor(temp / 26) - 1
  }
  return letter
}

const STEPS: { id: ImportStep; label: string; icon: typeof Upload }[] = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'sheets', label: 'Sheets', icon: Layers },
  { id: 'mapping', label: 'Mapping', icon: Table },
  { id: 'classify', label: 'Classify', icon: Settings2 },
  { id: 'variants', label: 'Variants', icon: Package },
  { id: 'validate', label: 'Validate', icon: Eye },
  { id: 'confirm', label: 'Import', icon: Check },
]

export default function ImportPage() {
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
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [manualMappings, setManualMappings] = useState<Record<number, MappedField>>({}) // Track user's manual choices by column index
  const [classifiedRows, setClassifiedRows] = useState<ClassifiedRow[]>([])
  const [duplicateAction, setDuplicateAction] = useState<'update' | 'skip' | 'create_new'>('update')
  const [products, setProducts] = useState<ImportedProduct[]>([])
  const [validation, setValidation] = useState<ImportValidation | null>(null)
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
  const [variantDecisions, setVariantDecisions] = useState<Record<string, 'separate' | 'combined'>>({})
  
  // Import state
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null)
  
  // Custom fields state
  const [customFields, setCustomFields] = useState<MappableFieldDef[]>([])
  const [showAddCustomField, setShowAddCustomField] = useState(false)
  const [newCustomFieldName, setNewCustomFieldName] = useState('')
  
  // Category state for import
  const [categories, setCategories] = useState<{ id: string; nameEn: string }[]>([])
  const [selectedImportCategory, setSelectedImportCategory] = useState<string>('')
  const [overrideFileCategories, setOverrideFileCategories] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  
  // Price mapping configuration
  const [primaryPriceField, setPrimaryPriceField] = useState<'auto' | 'price' | 'priceDistributor' | 'priceWholesale'>('auto')
  
  // Price tiers state
  const [priceTiers, setPriceTiers] = useState<ImportPriceTier[]>([])
  const [mappableFields, setMappableFields] = useState<MappableFieldDef[]>(MAPPABLE_FIELDS)
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false)

  // Step navigation
  const stepIndex = STEPS.findIndex(s => s.id === currentStep)

  // Load categories when reaching validate step
  // Load price tiers on mount
  useEffect(() => {
    const fetchPriceTiers = async () => {
      try {
        const res = await fetch('/api/settings/price-tiers')
        if (res.ok) {
          const data = await res.json()
          if (data.tiers && data.tiers.length > 0) {
            const tiers: ImportPriceTier[] = data.tiers.map((t: { id: string; name: string; code: string; modifier?: number }) => ({
              id: t.id,
              name: t.name,
              code: t.code,
              modifier: Number(t.modifier) || 0
            }))
            setPriceTiers(tiers)
            setMappableFields(getMappableFieldsWithTiers(tiers))
          }
        }
      } catch {
        console.error('Failed to fetch price tiers')
      }
    }
    fetchPriceTiers()
  }, [])

  useEffect(() => {
    if (currentStep === 'validate') {
      fetchCategories()
    }
  }, [currentStep])
  
  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'upload': return file !== null
      case 'sheets': return selectedSheet !== ''
      case 'mapping': {
        const hasRef = mappings.some(m => m.mappedTo === 'ref')
        const hasName = mappings.some(m => m.mappedTo === 'nameEn')
        return hasRef && hasName
      }
      case 'classify': return classifiedRows.some(r => r.classification === 'product')
      case 'variants': return true
      case 'validate': return validation?.isValid ?? false
      case 'confirm': return true
      default: return false
    }
  }, [currentStep, file, selectedSheet, mappings, classifiedRows, validation])

  const goNext = async () => {
    if (!canGoNext()) return
    
    const nextIndex = stepIndex + 1
    if (nextIndex >= STEPS.length) return
    
    const nextStep = STEPS[nextIndex].id
    
    // Process data before moving to next step
    setIsProcessing(true)
    try {
      switch (currentStep) {
        case 'upload':
          await processFile()
          break
        case 'sheets':
          await processSheet()
          break
        case 'mapping':
          processClassification()
          break
        case 'classify':
          await processProducts()
          break
        case 'variants':
          // Variant decisions are already saved
          break
        case 'validate':
          // Ready to import
          break
      }
      setCurrentStep(nextStep)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const goBack = () => {
    const prevIndex = stepIndex - 1
    if (prevIndex < 0) return
    setCurrentStep(STEPS[prevIndex].id)
  }

  // File handling
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) validateAndSetFile(droppedFile)
  }, [])

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please upload an Excel (.xlsx, .xls) or CSV file')
      return
    }
    
    setError(null)
    setFile(selectedFile)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) validateAndSetFile(selectedFile)
  }

  const removeFile = () => {
    setFile(null)
    setFileBuffer(null)
    setParsedFile(null)
    setError(null)
  }

  // Processing functions
  const processFile = async () => {
    if (!file) return
    
    const buffer = await file.arrayBuffer()
    setFileBuffer(buffer)
    
    const parsed = parseExcelFile(buffer, file.name)
    setParsedFile(parsed)
    
    if (parsed.sheets.length === 1) {
      setSelectedSheet(parsed.sheets[0].name)
    } else if (parsed.selectedSheet) {
      setSelectedSheet(parsed.selectedSheet)
    }
  }

  const processSheet = async () => {
    if (!fileBuffer || !selectedSheet) return
    
    const data = getSheetData(fileBuffer, selectedSheet)
    setSheetData(data)
    
    // Auto-detect header row (usually first non-empty row)
    let headerRow = 0
    for (let i = 0; i < Math.min(5, data.length); i++) {
      if (data[i] && data[i].some(cell => cell && String(cell).trim() !== '')) {
        headerRow = i
        break
      }
    }
    setHeaderRowIndex(headerRow)
    
    // Auto-detect column mappings
    const detectedMappings = autoDetectMappings(data[headerRow] || [])
    setMappings(detectedMappings)
  }

  const processClassification = () => {
    const classified = classifyRows(sheetData, headerRowIndex, mappings)
    setClassifiedRows(classified)
  }

  const processProducts = async () => {
    // Fetch existing products for matching
    let existingProducts: { id: string; ref: string; nameEn: string }[] = []
    try {
      const res = await fetch('/api/products/list')
      if (res.ok) {
        const data = await res.json()
        existingProducts = data.products || []
      }
    } catch {
      // Continue without existing products
    }
    
    const extracted = extractProducts(classifiedRows, existingProducts, duplicateAction)
    setProducts(extracted)
    
    const validationResult = validateImport(extracted)
    setValidation(validationResult)
    setVariantGroups(validationResult.variantGroups)
    
    // Initialize variant decisions
    const decisions: Record<string, 'separate' | 'combined'> = {}
    validationResult.variantGroups.forEach(g => {
      decisions[g.baseName] = 'separate'
    })
    setVariantDecisions(decisions)
  }

  const handleImport = async () => {
    if (!validation || !validation.isValid) return
    
    setIsImporting(true)
    setError(null)
    
    try {
      // If a global category is selected, apply it to products without a category
      const productsToImport = products
        .filter(p => p.action !== 'skip' && p.errors.length === 0)
        .map(p => {
          const updated = { ...p }
          
          // Apply primary price field configuration
          if (primaryPriceField !== 'auto') {
            const primaryPrice = p[primaryPriceField] as number | undefined
            if (primaryPrice !== undefined && primaryPrice !== null) {
              // Set the chosen field as the main price for both distributor and direct
              if (!updated.priceDistributor) updated.priceDistributor = primaryPrice
              if (!updated.priceWholesale) updated.priceWholesale = primaryPrice
              // Also set it as the generic price
              if (!updated.price) updated.price = primaryPrice
            }
          }
          
          // If override is enabled OR product has no category, use the global category
          if (selectedImportCategory && (overrideFileCategories || !p.category)) {
            const selectedCat = categories.find(c => c.id === selectedImportCategory)
            updated.category = selectedCat?.nameEn
            updated.categoryId = selectedImportCategory
          }
          
          return updated
        })
      
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: productsToImport,
          variantDecisions,
          globalCategoryId: selectedImportCategory || undefined
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
    const buffer = generateTemplate()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ExportFlow_Import_Template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Fetch categories when reaching validate step
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories/list')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch {
      console.error('Failed to fetch categories')
    }
  }

  // Create a new category
  const createCategory = async () => {
    if (!newCategoryName.trim()) return
    setIsCreatingCategory(true)
    
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameEn: newCategoryName.trim() }),
      })

      if (res.ok) {
        const data = await res.json()
        // Add new category to list and select it
        setCategories(prev => [...prev, { id: data.id, nameEn: newCategoryName.trim() }])
        setSelectedImportCategory(data.id)
        setNewCategoryName('')
        setShowCreateCategory(false)
      }
    } catch {
      console.error('Failed to create category')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const updateMapping = (columnIndex: number, field: MappedField) => {
    setMappings(prev => prev.map(m => 
      m.columnIndex === columnIndex ? { ...m, mappedTo: field } : m
    ))
    // Save manual choice to preserve when changing header row
    setManualMappings(prev => ({ ...prev, [columnIndex]: field }))
  }

  const updateRowClassification = (rowIndex: number, classification: ClassifiedRow['classification']) => {
    setClassifiedRows(prev => prev.map(r => {
      if (r.rowIndex !== rowIndex) return r
      
      const updated = { ...r, classification }
      
      // If classified as header or subcategory, extract the name from the first non-empty value
      if (classification === 'header' || classification === 'subcategory') {
        const values = Object.values(r.originalData).filter(v => v && String(v).trim())
        const name = values.length > 0 ? String(values[0]).trim() : undefined
        
        if (classification === 'header') {
          updated.categoryName = name
          updated.subcategoryName = undefined
        } else {
          updated.subcategoryName = name
          updated.categoryName = undefined
        }
      } else {
        // Clear both names for other classifications
        updated.categoryName = undefined
        updated.subcategoryName = undefined
      }
      
      return updated
    }))
  }

  const addCustomField = () => {
    if (!newCustomFieldName.trim()) return
    
    const fieldId = createCustomFieldId(newCustomFieldName.trim())
    const newField: MappableFieldDef = {
      id: fieldId,
      label: newCustomFieldName.trim(),
      required: false,
      isCustom: true
    }
    
    setCustomFields(prev => [...prev, newField])
    setNewCustomFieldName('')
    setShowAddCustomField(false)
  }
  
  // Add custom field from suggestion and auto-map the column
  const addCustomFieldFromSuggestion = (columnIndex: number, columnHeader: string) => {
    const fieldId = createCustomFieldId(columnHeader)
    
    // Check if already exists
    if (customFields.some(f => f.id === fieldId)) {
      // Just map to existing field
      setMappings(prev => prev.map(m =>
        m.columnIndex === columnIndex ? { ...m, mappedTo: fieldId } : m
      ))
      setManualMappings(prev => ({ ...prev, [columnIndex]: fieldId }))
      return
    }
    
    const newField: MappableFieldDef = {
      id: fieldId,
      label: columnHeader,
      required: false,
      isCustom: true
    }
    
    setCustomFields(prev => [...prev, newField])
    // Auto-map this column to the new custom field
    setMappings(prev => prev.map(m =>
      m.columnIndex === columnIndex ? { ...m, mappedTo: fieldId } : m
    ))
    // Save manual choice
    setManualMappings(prev => ({ ...prev, [columnIndex]: fieldId }))
  }

  const removeCustomField = (fieldId: MappedField) => {
    setCustomFields(prev => prev.filter(f => f.id !== fieldId))
    // Reset any mappings using this custom field
    setMappings(prev => prev.map(m => 
      m.mappedTo === fieldId ? { ...m, mappedTo: 'ignore' as MappedField } : m
    ))
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Import Products</h1>
        <p className="text-[15px] text-[#86868b] mt-1">
          Import your product catalog from Excel or CSV files
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          const isActive = step.id === currentStep
          const isCompleted = index < stepIndex
          
          return (
            <div key={step.id} className="flex items-center">
              {index > 0 && (
                <div className={`w-8 h-0.5 ${isCompleted ? 'bg-[#34c759]' : 'bg-[#d2d2d7]'}`} />
              )}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap ${
                isActive ? 'bg-[#0071e3] text-white' : 
                isCompleted ? 'bg-[#34c759]/10 text-[#34c759]' : 
                'bg-[#f5f5f7] text-[#86868b]'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="text-[13px] font-medium">{step.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#ff3b30] flex-shrink-0" />
          <p className="text-[14px] text-[#ff3b30]">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-[#ff3b30]" />
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
        
        {/* Step 1: Upload */}
        {currentStep === 'upload' && (
          <div className="p-8">
            {/* Instructions */}
            <div className="bg-[#0071e3]/5 border border-[#0071e3]/20 rounded-xl p-5 mb-6">
              <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#0071e3]" />
                File Format Guidelines
              </h2>
              <ul className="space-y-2 text-[14px] text-[#1d1d1f]">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#34c759] mt-0.5 flex-shrink-0" />
                  <span>First row should contain column headers (Reference, Name, Price, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#34c759] mt-0.5 flex-shrink-0" />
                  <span>Required columns: Product Reference, Product Name (English)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#34c759] mt-0.5 flex-shrink-0" />
                  <span>Optional: Chinese Name, Category, Price, Stock, etc.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#34c759] mt-0.5 flex-shrink-0" />
                  <span>Smart SKU matching: "TB030" will match "TB-030"</span>
                </li>
              </ul>
              <button 
                onClick={downloadTemplate}
                className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-[#0071e3] hover:text-[#0077ed]"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>

            {/* Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
                isDragging 
                  ? 'border-[#0071e3] bg-[#0071e3]/5' 
                  : file
                    ? 'border-[#34c759] bg-[#34c759]/5'
                    : 'border-[#d2d2d7]/50 hover:border-[#0071e3]/50'
              }`}
            >
              {file ? (
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
                      <FileSpreadsheet className="w-7 h-7 text-[#34c759]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-[#1d1d1f] truncate">{file.name}</p>
                      <p className="text-[13px] text-[#86868b]">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={removeFile}
                      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#f5f5f7] transition-colors"
                    >
                      <X className="w-5 h-5 text-[#86868b]" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="block p-12 cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="text-center">
                    <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                      isDragging ? 'bg-[#0071e3]/10' : 'bg-[#f5f5f7]'
                    }`}>
                      <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-[#0071e3]' : 'text-[#86868b]'}`} />
                    </div>
                    <p className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
                      {isDragging ? 'Drop your file here' : 'Drop your file here or click to browse'}
                    </p>
                    <p className="text-[14px] text-[#86868b]">
                      Supports Excel (.xlsx, .xls) and CSV files
                    </p>
                  </div>
                </label>
              )}
            </div>

            {/* Batch Image Import Section */}
            <div className="mt-6">
              <BatchImageImport />
            </div>
          </div>
        )}

        {/* Step 2: Sheet Selection */}
        {currentStep === 'sheets' && parsedFile && (
          <div className="p-8">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">Select Sheet to Import</h2>
            
            {parsedFile.sheets.length === 1 ? (
              <div className="p-4 bg-[#34c759]/10 border border-[#34c759]/30 rounded-xl">
                <p className="text-[14px] text-[#1d1d1f]">
                  <CheckCircle className="w-4 h-4 text-[#34c759] inline mr-2" />
                  Only one sheet found: <strong>{parsedFile.sheets[0].name}</strong>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {parsedFile.sheets.map(sheet => (
                  <label
                    key={sheet.name}
                    className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedSheet === sheet.name
                        ? 'border-[#0071e3] bg-[#0071e3]/5'
                        : 'border-[#d2d2d7]/30 hover:border-[#0071e3]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sheet"
                      value={sheet.name}
                      checked={selectedSheet === sheet.name}
                      onChange={(e) => setSelectedSheet(e.target.value)}
                      className="hidden"
                    />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[15px] font-medium text-[#1d1d1f]">{sheet.name}</p>
                        <p className="text-[13px] text-[#86868b]">
                          {sheet.rowCount} rows × {sheet.columnCount} columns
                        </p>
                      </div>
                      {selectedSheet === sheet.name && (
                        <CheckCircle className="w-5 h-5 text-[#0071e3]" />
                      )}
                    </div>
                    {/* Preview */}
                    {sheet.preview.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="text-[11px] w-full">
                          <tbody>
                            {sheet.preview.slice(0, 3).map((row, i) => (
                              <tr key={i} className={i === 0 ? 'font-medium' : ''}>
                                {row.slice(0, 5).map((cell, j) => (
                                  <td key={j} className="px-2 py-1 border border-[#d2d2d7]/30 truncate max-w-[100px]">
                                    {cell || '—'}
                                  </td>
                                ))}
                                {row.length > 5 && <td className="px-2 py-1 text-[#86868b]">...</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Column Mapping */}
        {currentStep === 'mapping' && sheetData.length > 0 && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Map Columns</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[#86868b]">Header row:</span>
                  <select
                    value={headerRowIndex}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value)
                      setHeaderRowIndex(idx)
                      // Auto-detect mappings but preserve manual choices
                      const newMappings = autoDetectMappings(sheetData[idx] || [])
                      // Re-apply user's manual mapping choices
                      const mergedMappings = newMappings.map(m => {
                        if (manualMappings[m.columnIndex] !== undefined) {
                          return { ...m, mappedTo: manualMappings[m.columnIndex] }
                        }
                        return m
                      })
                      setMappings(mergedMappings)
                    }}
                    className="h-8 px-3 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    {sheetData.slice(0, 10).map((_, i) => (
                      <option key={i} value={i}>Row {i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Custom Fields Section */}
            <div className="mb-4 p-4 bg-[#f5f5f7] rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#86868b]" />
                  <span className="text-[14px] font-medium text-[#1d1d1f]">Custom Fields</span>
                  <span className="text-[12px] text-[#86868b]">({customFields.length} created)</span>
                </div>
                {!showAddCustomField && (
                  <button
                    type="button"
                    onClick={() => setShowAddCustomField(true)}
                    className="flex items-center gap-1 text-[13px] text-[#0071e3] hover:text-[#0077ed] font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Custom Field
                  </button>
                )}
              </div>
              
              {/* Add custom field form */}
              {showAddCustomField && (
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={newCustomFieldName}
                    onChange={(e) => setNewCustomFieldName(e.target.value)}
                    placeholder="Enter custom field name..."
                    className="flex-1 h-9 px-3 text-[13px] bg-white rounded-lg border border-[#d2d2d7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCustomField()
                      if (e.key === 'Escape') {
                        setShowAddCustomField(false)
                        setNewCustomFieldName('')
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={addCustomField}
                    disabled={!newCustomFieldName.trim()}
                    className="h-9 px-4 bg-[#0071e3] text-white text-[13px] font-medium rounded-lg hover:bg-[#0077ed] disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCustomField(false)
                      setNewCustomFieldName('')
                    }}
                    className="h-9 px-3 text-[13px] text-[#86868b] hover:text-[#1d1d1f]"
                  >
                    Cancel
                  </button>
                </div>
              )}
              
              {/* Custom fields list */}
              {customFields.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customFields.map(field => (
                    <div
                      key={field.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#d2d2d7]/50 rounded-lg"
                    >
                      <span className="text-[12px] text-[#1d1d1f]">{field.label}</span>
                      <button
                        type="button"
                        onClick={() => removeCustomField(field.id)}
                        className="text-[#86868b] hover:text-[#ff3b30]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {customFields.length === 0 && !showAddCustomField && (
                <p className="text-[12px] text-[#86868b]">
                  Create custom fields to import data that doesn&apos;t fit standard fields (e.g., &quot;Standard on Swift boats?&quot;, &quot;Total&quot;, etc.)
                </p>
              )}
              
              {/* Suggestions from unmapped columns */}
              {(() => {
                const unmappedColumns = mappings.filter(m => 
                  m.mappedTo === 'ignore' && 
                  m.columnHeader && 
                  m.columnHeader.trim().length > 1 &&
                  !customFields.some(f => f.label.toLowerCase() === m.columnHeader.toLowerCase())
                )
                
                if (unmappedColumns.length === 0) return null
                
                return (
                  <div className="mt-3 pt-3 border-t border-[#d2d2d7]/30">
                    <p className="text-[12px] text-[#86868b] mb-2">
                      Suggested custom fields from unmapped columns:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {unmappedColumns.slice(0, 10).map(mapping => (
                        <button
                          key={mapping.columnIndex}
                          type="button"
                          onClick={() => addCustomFieldFromSuggestion(mapping.columnIndex, mapping.columnHeader)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-dashed border-[#0071e3]/40 text-[#0071e3] rounded-lg hover:bg-[#0071e3]/5 hover:border-[#0071e3] transition-colors group"
                        >
                          <Plus className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                          <span className="text-[11px] font-medium">{mapping.columnHeader}</span>
                          <span className="text-[10px] text-[#86868b] font-mono">({getExcelColumnLetter(mapping.columnIndex)})</span>
                        </button>
                      ))}
                      {unmappedColumns.length > 10 && (
                        <span className="text-[11px] text-[#86868b] self-center">
                          +{unmappedColumns.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#d2d2d7]/30">
                    <th className="text-left py-3 px-2 text-[#86868b] font-medium">Column</th>
                    <th className="text-left py-3 px-2 text-[#86868b] font-medium">Sample Data</th>
                    <th className="text-left py-3 px-2 text-[#86868b] font-medium">Map To</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping) => {
                    const samples = sheetData
                      .slice(headerRowIndex + 1, headerRowIndex + 4)
                      .map(row => row[mapping.columnIndex])
                      .filter(Boolean)
                    
                    const isCustomMapping = isCustomField(mapping.mappedTo)
                    
                    return (
                      <tr key={mapping.columnIndex} className="border-b border-[#d2d2d7]/20">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-[#0071e3]/10 text-[#0071e3] text-[11px] font-mono font-semibold rounded">
                              {getExcelColumnLetter(mapping.columnIndex)}
                            </span>
                            <span className="font-medium text-[#1d1d1f]">{mapping.columnHeader || `Column ${mapping.columnIndex + 1}`}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-[#86868b] truncate max-w-[200px]">
                            {samples.join(', ') || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <select
                            value={mapping.mappedTo}
                            onChange={(e) => updateMapping(mapping.columnIndex, e.target.value as MappedField)}
                            className={`h-9 px-3 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
                              mapping.mappedTo === 'ref' || mapping.mappedTo === 'nameEn'
                                ? 'bg-[#0071e3]/10 border border-[#0071e3]/30'
                                : isCustomMapping
                                  ? 'bg-[#ff9500]/10 border border-[#ff9500]/30'
                                  : mapping.mappedTo === 'ignore'
                                    ? 'bg-[#f5f5f7] text-[#86868b]'
                                    : 'bg-[#f5f5f7]'
                            }`}
                          >
                            <optgroup label="Standard Fields">
                              {mappableFields.filter(f => !isPriceTierField(f.id)).map(field => (
                                <option key={field.id} value={field.id}>
                                  {field.label} {field.required && '*'}
                                </option>
                              ))}
                            </optgroup>
                            {priceTiers.length > 0 && (
                              <optgroup label="Price Tiers">
                                {mappableFields.filter(f => isPriceTierField(f.id)).map(field => (
                                  <option key={field.id} value={field.id}>
                                    💰 {field.label}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {customFields.length > 0 && (
                              <optgroup label="Custom Fields">
                                {customFields.map(field => (
                                  <option key={field.id} value={field.id}>
                                    📋 {field.label}
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

            {/* Required fields indicator */}
            <div className="mt-4 flex items-center gap-4">
              {!mappings.some(m => m.mappedTo === 'ref') && (
                <span className="text-[13px] text-[#ff3b30] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Reference column required
                </span>
              )}
              {!mappings.some(m => m.mappedTo === 'nameEn') && (
                <span className="text-[13px] text-[#ff3b30] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Name column required
                </span>
              )}
            </div>
            
            {/* Help text */}
            <div className="mt-4 p-3 bg-[#0071e3]/5 border border-[#0071e3]/20 rounded-xl">
              <p className="text-[12px] text-[#1d1d1f]">
                <strong>Tip:</strong> Map &quot;RIGGERS AND ASSOCIATED PARTS&quot; or similar product description columns to <strong>Name (English)</strong>. 
                If your file has no dedicated Reference column, you can use a Material code or other unique identifier as the Reference.
                Custom fields can be used to import additional data like &quot;Standard on Swift boats?&quot; or price calculations.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Row Classification */}
        {currentStep === 'classify' && classifiedRows.length > 0 && (
          <div className="p-8">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">Classify Rows</h2>
            <p className="text-[14px] text-[#86868b] mb-4">
              Review how each row will be imported. Category headers will group products beneath them.
            </p>

            <div className="max-h-[400px] overflow-y-auto border border-[#d2d2d7]/30 rounded-xl">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-[#f5f5f7]">
                  <tr className="border-b border-[#d2d2d7]/30">
                    <th className="text-left py-2 px-3 text-[#86868b] font-medium w-16">Row</th>
                    <th className="text-left py-2 px-3 text-[#86868b] font-medium">Data</th>
                    <th className="text-left py-2 px-3 text-[#86868b] font-medium w-32">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {classifiedRows.slice(headerRowIndex + 1).map((row) => (
                    <tr key={row.rowIndex} className={`border-b border-[#d2d2d7]/20 ${
                      row.classification === 'skip' ? 'opacity-50' : ''
                    }`}>
                      <td className="py-2 px-3 text-[#86868b]">{row.rowIndex + 1}</td>
                      <td className="py-2 px-3">
                        <div className="truncate max-w-[400px] text-[#1d1d1f]">
                          {Object.entries(row.originalData)
                            .filter(([, v]) => v)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' | ') || '(empty)'}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={row.classification}
                          onChange={(e) => updateRowClassification(row.rowIndex, e.target.value as ClassifiedRow['classification'])}
                          className={`h-8 px-2 rounded-lg text-[12px] focus:outline-none ${
                            row.classification === 'product' ? 'bg-[#34c759]/10 text-[#34c759]' :
                            row.classification === 'header' ? 'bg-[#0071e3]/10 text-[#0071e3]' :
                            row.classification === 'subcategory' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                            row.classification === 'info' ? 'bg-[#af52de]/10 text-[#af52de]' :
                            'bg-[#f5f5f7] text-[#86868b]'
                          }`}
                        >
                          <option value="product">Product</option>
                          <option value="header">Category</option>
                          <option value="subcategory">Subcategory</option>
                          <option value="info">Info (notes)</option>
                          <option value="skip">Skip</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Stats */}
            <div className="mt-4 flex flex-wrap gap-4 text-[13px]">
              <span className="text-[#34c759]">
                {classifiedRows.filter(r => r.classification === 'product').length} products
              </span>
              <span className="text-[#0071e3]">
                {classifiedRows.filter(r => r.classification === 'header').length} categories
              </span>
              <span className="text-[#ff9500]">
                {classifiedRows.filter(r => r.classification === 'subcategory').length} subcategories
              </span>
              <span className="text-[#af52de]">
                {classifiedRows.filter(r => r.classification === 'info').length} info rows
              </span>
              <span className="text-[#86868b]">
                {classifiedRows.filter(r => r.classification === 'skip').length} skipped
              </span>
            </div>
          </div>
        )}

        {/* Step 5: Variants */}
        {currentStep === 'variants' && (
          <div className="p-8">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">Variant Detection</h2>
            
            {variantGroups.length === 0 ? (
              <div className="p-6 bg-[#f5f5f7] rounded-xl text-center">
                <Package className="w-10 h-10 text-[#86868b] mx-auto mb-3" />
                <p className="text-[14px] text-[#86868b]">No variant groups detected</p>
                <p className="text-[13px] text-[#86868b] mt-1">
                  Products with similar names (like "T-bolt 30mm" and "T-bolt 50mm") would be grouped here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[14px] text-[#86868b]">
                  These products appear to be variants of each other. Choose how to import them.
                </p>
                
                {variantGroups.map((group) => (
                  <div key={group.baseName} className="border border-[#d2d2d7]/30 rounded-xl p-4">
                    <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-2">{group.baseName}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {group.variants.map(v => (
                        <span key={v.rowIndex} className="text-[12px] px-2 py-1 bg-[#f5f5f7] rounded-lg">
                          {v.value}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <label className={`flex-1 p-3 rounded-lg border-2 cursor-pointer ${
                        variantDecisions[group.baseName] === 'separate'
                          ? 'border-[#0071e3] bg-[#0071e3]/5'
                          : 'border-[#d2d2d7]/30'
                      }`}>
                        <input
                          type="radio"
                          name={`variant-${group.baseName}`}
                          value="separate"
                          checked={variantDecisions[group.baseName] === 'separate'}
                          onChange={() => setVariantDecisions(prev => ({ ...prev, [group.baseName]: 'separate' }))}
                          className="hidden"
                        />
                        <p className="text-[14px] font-medium text-[#1d1d1f]">Separate Products</p>
                        <p className="text-[12px] text-[#86868b]">Create {group.variants.length} individual products</p>
                      </label>
                      <label className={`flex-1 p-3 rounded-lg border-2 cursor-pointer ${
                        variantDecisions[group.baseName] === 'combined'
                          ? 'border-[#0071e3] bg-[#0071e3]/5'
                          : 'border-[#d2d2d7]/30'
                      }`}>
                        <input
                          type="radio"
                          name={`variant-${group.baseName}`}
                          value="combined"
                          checked={variantDecisions[group.baseName] === 'combined'}
                          onChange={() => setVariantDecisions(prev => ({ ...prev, [group.baseName]: 'combined' }))}
                          className="hidden"
                        />
                        <p className="text-[14px] font-medium text-[#1d1d1f]">Single Product</p>
                        <p className="text-[12px] text-[#86868b]">Create 1 product with "{group.variants[0].attribute}" options</p>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 6: Validation */}
        {currentStep === 'validate' && validation && (
          <div className="p-8">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">Validation Results</h2>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-[#f5f5f7] rounded-xl p-4 text-center">
                <p className="text-[24px] font-semibold text-[#1d1d1f]">{validation.stats.total}</p>
                <p className="text-[12px] text-[#86868b]">Total</p>
              </div>
              <div className="bg-[#34c759]/10 rounded-xl p-4 text-center">
                <p className="text-[24px] font-semibold text-[#34c759]">{validation.stats.toCreate}</p>
                <p className="text-[12px] text-[#34c759]">To Create</p>
              </div>
              <div className="bg-[#0071e3]/10 rounded-xl p-4 text-center">
                <p className="text-[24px] font-semibold text-[#0071e3]">{validation.stats.toUpdate}</p>
                <p className="text-[12px] text-[#0071e3]">To Update</p>
              </div>
              <div className="bg-[#ff9500]/10 rounded-xl p-4 text-center">
                <p className="text-[24px] font-semibold text-[#ff9500]">{validation.stats.warnings}</p>
                <p className="text-[12px] text-[#ff9500]">Warnings</p>
              </div>
              <div className="bg-[#ff3b30]/10 rounded-xl p-4 text-center">
                <p className="text-[24px] font-semibold text-[#ff3b30]">{validation.stats.errors}</p>
                <p className="text-[12px] text-[#ff3b30]">Errors</p>
              </div>
            </div>

            {/* Duplicate handling */}
            <div className="mb-6 p-4 bg-[#f5f5f7] rounded-xl">
              <label className="text-[14px] font-medium text-[#1d1d1f]">When product already exists:</label>
              <div className="flex gap-3 mt-2">
                {(['update', 'skip', 'create_new'] as const).map(action => (
                  <label key={action} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="duplicateAction"
                      value={action}
                      checked={duplicateAction === action}
                      onChange={() => {
                        setDuplicateAction(action)
                        // Re-process products with new action
                        processProducts()
                      }}
                      className="w-4 h-4 text-[#0071e3]"
                    />
                    <span className="text-[13px] text-[#1d1d1f]">
                      {action === 'update' ? 'Update existing' : action === 'skip' ? 'Skip' : 'Create duplicate'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Configuration */}
            <div className="mb-6 p-4 bg-[#ff9500]/5 border border-[#ff9500]/20 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-[#ff9500]" />
                <label className="text-[14px] font-medium text-[#1d1d1f]">
                  Price Configuration
                </label>
              </div>
              
              <p className="text-[13px] text-[#86868b] mb-3">
                Choose which price field to use as the main display price. If a specific price type is not found, other price fields will be used as fallback.
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'auto', label: 'Auto (first available)' },
                  { value: 'price', label: 'Default Price' },
                  { value: 'priceDistributor', label: 'Distributor Price' },
                  { value: 'priceWholesale', label: 'Wholesale Price' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPrimaryPriceField(option.value as typeof primaryPriceField)}
                    className={`px-3 py-2 text-[12px] font-medium rounded-lg border transition-colors ${
                      primaryPriceField === option.value
                        ? 'bg-[#ff9500] text-white border-[#ff9500]'
                        : 'bg-white text-[#1d1d1f] border-[#d2d2d7] hover:border-[#ff9500]/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              
              {/* Show which price columns were mapped */}
              {(() => {
                const priceFields = ['price', 'priceDistributor', 'priceWholesale', 'priceRmb', 'rrp'] as const
                const mappedPrices = mappings.filter(m => priceFields.includes(m.mappedTo as typeof priceFields[number]))
                
                if (mappedPrices.length === 0) {
                  return (
                    <p className="mt-3 text-[12px] text-[#ff3b30] flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      No price columns mapped. Products will be created with price 0.
                    </p>
                  )
                }
                
                return (
                  <p className="mt-3 text-[12px] text-[#34c759] flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Mapped prices: {mappedPrices.map(m => m.columnHeader || m.mappedTo).join(', ')}
                  </p>
                )
              })()}
            </div>

            {/* Import Category - assign all products to a category */}
            <div className="mb-6 p-4 bg-[#0071e3]/5 border border-[#0071e3]/20 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Folder className="w-5 h-5 text-[#0071e3]" />
                <label className="text-[14px] font-medium text-[#1d1d1f]">
                  Assign all imported products to a category
                </label>
                <span className="text-[12px] text-[#86868b]">(optional)</span>
              </div>
              
              <p className="text-[13px] text-[#86868b] mb-3">
                Select a category for all imported products. Enable &quot;Override&quot; to ignore any category data from the file.
              </p>
              
              <div className="flex gap-3">
                <select
                  value={selectedImportCategory}
                  onChange={(e) => setSelectedImportCategory(e.target.value)}
                  className="flex-1 h-10 px-3 bg-white rounded-lg border border-[#d2d2d7] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                >
                  <option value="">No category (use file data if available)</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nameEn}</option>
                  ))}
                </select>
                
                {!showCreateCategory ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateCategory(true)}
                    className="flex items-center gap-2 h-10 px-4 bg-white border border-[#d2d2d7] text-[13px] font-medium text-[#1d1d1f] rounded-lg hover:bg-[#f5f5f7] transition-colors"
                  >
                    <FolderPlus className="w-4 h-4" />
                    New
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name..."
                      autoFocus
                      className="w-40 h-10 px-3 bg-white rounded-lg border border-[#d2d2d7] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createCategory()
                        if (e.key === 'Escape') {
                          setShowCreateCategory(false)
                          setNewCategoryName('')
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={createCategory}
                      disabled={!newCategoryName.trim() || isCreatingCategory}
                      className="h-10 px-4 bg-[#0071e3] text-white text-[13px] font-medium rounded-lg hover:bg-[#0077ed] disabled:opacity-50 transition-colors"
                    >
                      {isCreatingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateCategory(false)
                        setNewCategoryName('')
                      }}
                      className="h-10 px-3 text-[13px] text-[#86868b] hover:text-[#1d1d1f]"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              
              {selectedImportCategory && (
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideFileCategories}
                      onChange={(e) => setOverrideFileCategories(e.target.checked)}
                      className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                    />
                    <span className="text-[13px] text-[#1d1d1f]">
                      Override file categories
                    </span>
                    <span className="text-[12px] text-[#86868b]">
                      (ignore category/subcategory from file)
                    </span>
                  </label>
                  <p className="text-[12px] text-[#34c759] flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {overrideFileCategories 
                      ? `All ${validation.stats.toCreate} products will be assigned to "${categories.find(c => c.id === selectedImportCategory)?.nameEn}"`
                      : `${validation.stats.toCreate} products without a category will be assigned to "${categories.find(c => c.id === selectedImportCategory)?.nameEn}"`
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Errors */}
            {validation.stats.errors > 0 && (
              <div className="mb-4">
                <h3 className="text-[14px] font-semibold text-[#ff3b30] mb-2">Errors (must fix)</h3>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {products.filter(p => p.errors.length > 0).map(p => (
                    <div key={p.rowIndex} className="p-3 bg-[#ff3b30]/5 border border-[#ff3b30]/20 rounded-lg text-[13px]">
                      <span className="font-medium text-[#ff3b30]">Row {p.rowIndex + 1}:</span>{' '}
                      <span className="text-[#1d1d1f]">{p.ref || p.nameEn}</span>
                      <ul className="mt-1 ml-4 list-disc text-[#ff3b30]">
                        {p.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {validation.stats.warnings > 0 && (
              <div>
                <h3 className="text-[14px] font-semibold text-[#ff9500] mb-2">Warnings</h3>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {products.filter(p => p.warnings.length > 0).slice(0, 10).map(p => (
                    <div key={p.rowIndex} className="p-3 bg-[#ff9500]/5 border border-[#ff9500]/20 rounded-lg text-[13px]">
                      <span className="font-medium text-[#ff9500]">Row {p.rowIndex + 1}:</span>{' '}
                      <span className="text-[#1d1d1f]">{p.ref} - {p.nameEn}</span>
                      <ul className="mt-1 ml-4 list-disc text-[#ff9500]">
                        {p.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                      </ul>
                    </div>
                  ))}
                  {products.filter(p => p.warnings.length > 0).length > 10 && (
                    <p className="text-[13px] text-[#86868b] text-center">
                      And {products.filter(p => p.warnings.length > 0).length - 10} more...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 7: Confirm */}
        {currentStep === 'confirm' && (
          <div className="p-8">
            {importResult ? (
              // Import complete
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#34c759]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[#34c759]" />
                </div>
                <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-2">Import Complete!</h2>
                <p className="text-[15px] text-[#86868b] mb-6">
                  {importResult.created} created, {importResult.updated} updated
                </p>
                <button
                  onClick={() => router.push('/products')}
                  className="h-11 px-6 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors"
                >
                  View Products
                </button>
              </div>
            ) : (
              // Ready to import
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#0071e3]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-[#0071e3]" />
                </div>
                <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-2">Ready to Import</h2>
                <p className="text-[15px] text-[#86868b] mb-2">
                  {validation?.stats.toCreate || 0} products to create, {validation?.stats.toUpdate || 0} to update
                </p>
                <p className="text-[13px] text-[#86868b] mb-6">
                  This action cannot be undone.
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
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
