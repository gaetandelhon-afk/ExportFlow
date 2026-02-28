'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, Loader2, Plus, Trash2, Upload, Image as ImageIcon,
  X, GripVertical, ChevronDown, ChevronUp, Settings2
} from 'lucide-react'
import ProductOptionsEditor from '@/components/ProductOptionsEditor'
import { ProductOptions, DEFAULT_PRODUCT_OPTIONS, mergeOptionsIntoCustomFields } from '@/types/product-options'
import { useLocalization } from '@/hooks/useLocalization'

interface ProductImage {
  id: string
  file?: File
  preview: string
  isMain: boolean
}

interface CustomField {
  id: string
  label: string
  value: string
  type: 'text' | 'textarea' | 'number'
}

interface Category {
  id: string
  nameEn: string
  parentId: string | null
  children?: Category[]
}

interface PriceTier {
  code: string
  name: string
  description?: string
  currency?: string
}

const DEFAULT_PRICE_TIERS: PriceTier[] = []

export default function NewProductPage() {
  const router = useRouter()
  const { currencySymbol, getCurrencySymbol } = useLocalization()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>('basic')

  // Categories from API
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  // Price tiers from API
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>(DEFAULT_PRICE_TIERS)

  // Form state
  const [form, setForm] = useState({
    ref: '',
    nameEn: '',
    nameCn: '',
    description: '',
    categoryId: '',  // Changed from category to categoryId
    material: '',
    hsCode: '',
    weight: '',
    dimensions: '',
    minOrderQty: '1',
    stock: '',
    isActive: true,
    requiresSerial: false,
    serialPrefix: '',
  })

  // Prices for each tier
  const [prices, setPrices] = useState<Record<string, string>>({})

  // Images
  const [images, setImages] = useState<ProductImage[]>([])

  // Custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [showAddField, setShowAddField] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')

  // Product options (variants like material, color, etc.)
  const [productOptions, setProductOptions] = useState<ProductOptions>(DEFAULT_PRODUCT_OPTIONS)
  const [localLanguage, setLocalLanguage] = useState('zh')

  // Load categories and price tiers on mount
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoadingCategories(true)
    try {
      const [categoriesRes, tiersRes] = await Promise.all([
        fetch('/api/categories/list').catch(() => null),
        fetch('/api/settings/price-tiers').catch(() => null),
      ])

      // Load categories
      if (categoriesRes?.ok) {
        const catData = await categoriesRes.json()
        setCategories(catData.categories || [])
      }

      // Load price tiers from settings
      if (tiersRes?.ok) {
        const tiersData = await tiersRes.json()
        const tiers = tiersData.tiers || []
        setPriceTiers(tiers)
        setPrices(tiers.reduce((acc: Record<string, string>, tier: PriceTier) => ({ ...acc, [tier.code]: '' }), {}))
      }
    } catch (err) {
      console.error('Failed to load initial data:', err)
    } finally {
      setLoadingCategories(false)
    }
  }

  // Build category tree for hierarchical display
  const buildCategoryTree = (cats: Category[], parentId: string | null = null): Category[] => {
    return cats
      .filter(c => c.parentId === parentId)
      .map(c => ({ ...c, children: buildCategoryTree(cats, c.id) }))
  }

  const categoryTree = buildCategoryTree(categories)

  // Render category options with indentation for subcategories
  const renderCategoryOptions = (cats: Category[], level = 0): React.ReactElement[] => {
    return cats.flatMap(cat => [
      <option key={cat.id} value={cat.id}>
        {'—'.repeat(level)} {cat.nameEn}
      </option>,
      ...(cat.children ? renderCategoryOptions(cat.children, level + 1) : [])
    ])
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const handlePriceChange = (tierCode: string, value: string) => {
    setPrices({ ...prices, [tierCode]: value })
  }

  // Image handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages: ProductImage[] = Array.from(files).map((file, idx) => ({
      id: `img-${Date.now()}-${idx}`,
      file,
      preview: URL.createObjectURL(file),
      isMain: images.length === 0 && idx === 0,
    }))

    setImages([...images, ...newImages])
  }

  const handleRemoveImage = (id: string) => {
    const removed = images.find(img => img.id === id)
    if (removed?.preview) {
      URL.revokeObjectURL(removed.preview)
    }
    
    const remaining = images.filter(img => img.id !== id)
    
    // If we removed the main image, make the first remaining one main
    if (removed?.isMain && remaining.length > 0) {
      remaining[0].isMain = true
    }
    
    setImages(remaining)
  }

  const handleSetMainImage = (id: string) => {
    setImages(images.map(img => ({ ...img, isMain: img.id === id })))
  }

  // Custom fields
  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) return
    
    const field: CustomField = {
      id: `field-${Date.now()}`,
      label: newFieldLabel,
      value: '',
      type: 'text',
    }
    
    setCustomFields([...customFields, field])
    setNewFieldLabel('')
    setShowAddField(false)
  }

  const handleUpdateCustomField = (id: string, value: string) => {
    setCustomFields(customFields.map(f => f.id === id ? { ...f, value } : f))
  }

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id))
  }

  // Upload a single image
  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'products')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        console.error('Upload failed:', data.error)
        return null
      }

      const data = await res.json()
      return data.url
    } catch (err) {
      console.error('Upload error:', err)
      return null
    }
  }

  // Upload image for product options (throws on error)
  const uploadOptionImage = async (file: File): Promise<string> => {
    const url = await uploadImage(file)
    if (!url) {
      throw new Error('Failed to upload image')
    }
    return url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Upload images first
      const uploadedImages: { url: string; isMain: boolean }[] = []
      
      for (const img of images) {
        if (img.file) {
          const url = await uploadImage(img.file)
          if (url) {
            uploadedImages.push({ url, isMain: img.isMain })
          }
        }
      }

      // Get main image URL for photoUrl field
      const mainImage = uploadedImages.find(img => img.isMain)
      const photoUrl = mainImage?.url || uploadedImages[0]?.url || null

      // Build custom fields object including product options
      const customFieldsObj = customFields.reduce((acc, f) => ({ ...acc, [f.label]: f.value }), {})
      const finalCustomFields = mergeOptionsIntoCustomFields(customFieldsObj, productOptions)

      const productData = {
        ...form,
        prices,
        customFields: finalCustomFields,
        photoUrl,
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create product')
        return
      }

      router.push('/products')
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section)
  }

  const SectionHeader = ({ id, title, subtitle }: { id: string; title: string; subtitle?: string }) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-5 text-left"
    >
      <div>
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{title}</h2>
        {subtitle && <p className="text-[12px] text-[#86868b] mt-0.5">{subtitle}</p>}
      </div>
      {activeSection === id ? (
        <ChevronUp className="w-5 h-5 text-[#86868b]" />
      ) : (
        <ChevronDown className="w-5 h-5 text-[#86868b]" />
      )}
    </button>
  )

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/products" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to Products
        </Link>
        <h1 className="text-[28px] font-semibold text-[#1d1d1f]">Add Product</h1>
        <p className="text-[15px] text-[#86868b] mt-1">Create a new product in your catalog</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Images Section */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <SectionHeader id="images" title="Product Images" subtitle={`${images.length} image${images.length !== 1 ? 's' : ''}`} />
          
          {activeSection === 'images' && (
            <div className="px-5 pb-5 pt-0">
              {/* Image Grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {images.map((img) => (
                    <div 
                      key={img.id}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 ${
                        img.isMain ? 'border-[#0071e3]' : 'border-[#d2d2d7]/30'
                      }`}
                    >
                      <img src={img.preview} alt="" className="w-full h-full object-cover" />
                      
                      {/* Main badge */}
                      {img.isMain && (
                        <div className="absolute top-1 left-1 bg-[#0071e3] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          MAIN
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {!img.isMain && (
                          <button
                            type="button"
                            onClick={() => handleSetMainImage(img.id)}
                            className="px-2 py-1 bg-white text-[11px] font-medium rounded"
                          >
                            Set Main
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.id)}
                          className="p-1.5 bg-[#ff3b30] rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload Area */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#d2d2d7]/50 rounded-xl hover:border-[#0071e3] hover:bg-[#0071e3]/5 transition-all"
              >
                <Upload className="w-6 h-6 text-[#86868b]" />
                <span className="text-[13px] text-[#86868b]">Click to upload or drag and drop</span>
                <span className="text-[11px] text-[#86868b]">PNG, JPG up to 5MB each</span>
              </button>
            </div>
          )}
        </div>

        {/* Basic Info Section */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <SectionHeader id="basic" title="Basic Information" subtitle="Name, reference, description" />
          
          {activeSection === 'basic' && (
            <div className="px-5 pb-5 pt-0 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Reference *</label>
                  <input
                    type="text"
                    name="ref"
                    value={form.ref}
                    onChange={handleChange}
                    placeholder="SW-001"
                    required
                    className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Name (English) *</label>
                  <input
                    type="text"
                    name="nameEn"
                    value={form.nameEn}
                    onChange={handleChange}
                    placeholder="e.g., Widget Pro 2000"
                    required
                    className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Local Name</label>
                <div className="flex gap-2">
                  <select
                    value={localLanguage}
                    onChange={(e) => setLocalLanguage(e.target.value)}
                    className="w-36 h-11 px-3 bg-[#f5f5f7] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    <option value="zh">Chinese</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="es">Spanish</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="nl">Dutch</option>
                    <option value="pl">Polish</option>
                    <option value="ru">Russian</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="ar">Arabic</option>
                    <option value="hi">Hindi</option>
                    <option value="tr">Turkish</option>
                    <option value="th">Thai</option>
                    <option value="vi">Vietnamese</option>
                    <option value="id">Indonesian</option>
                    <option value="ms">Malay</option>
                    <option value="he">Hebrew</option>
                  </select>
                  <input
                    type="text"
                    name="nameCn"
                    value={form.nameCn}
                    onChange={handleChange}
                    placeholder="Optional"
                    className="flex-1 h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>

              {/* Serial Numbers */}
              <div className="bg-[#f5f5f7] rounded-2xl p-5">
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Serial Numbers</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-medium text-[#1d1d1f]">Requires serial numbers</p>
                      <p className="text-[13px] text-[#86868b] mt-0.5">Each unit of this product needs a unique serial number when ordered</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, requiresSerial: !prev.requiresSerial }))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${form.requiresSerial ? 'bg-[#0071e3]' : 'bg-[#d2d2d7]'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.requiresSerial ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  {form.requiresSerial && (
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                        Serial prefix <span className="text-[#86868b] font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        name="serialPrefix"
                        value={form.serialPrefix}
                        onChange={handleChange}
                        placeholder="e.g. EF-2024-"
                        className="w-full h-11 px-4 bg-white rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] border border-[#d2d2d7]/40"
                      />
                      <p className="text-[12px] text-[#86868b] mt-1">Auto-generated serials will be: {form.serialPrefix || ''}1703123456-A3X2</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Product description..."
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Category</label>
                <div className="flex gap-2">
                  <select
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleChange}
                    disabled={loadingCategories}
                    className="flex-1 h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-50"
                  >
                    <option value="">
                      {loadingCategories ? 'Loading categories...' : 'Select category'}
                    </option>
                    {renderCategoryOptions(categoryTree)}
                  </select>
                  <Link
                    href="/settings/categories"
                    className="h-11 px-4 flex items-center justify-center bg-[#f5f5f7] rounded-xl text-[13px] text-[#0071e3] hover:bg-[#e8e8ed] transition-colors"
                  >
                    Manage
                  </Link>
                </div>
                <p className="text-[11px] text-[#86868b] mt-1">
                  Categories include subcategories. Create and manage them in{' '}
                  <Link href="/settings/categories" className="text-[#0071e3] hover:underline">
                    Settings → Categories
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Section */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <SectionHeader id="pricing" title="Pricing" subtitle="Set prices for each tier" />
          
          {activeSection === 'pricing' && (
            <div className="px-5 pb-5 pt-0">
              <p className="text-[12px] text-[#86868b] mb-4">
                Set the price for each tier. Tiers can be configured in <Link href="/settings/pricing" className="text-[#0071e3]">Settings → Pricing</Link>
              </p>
              
              {priceTiers.length > 0 ? (
                <div className="space-y-3">
                  {priceTiers.map((tier) => {
                    const tierCurrency = tier.currency || 'CNY'
                    const tierSymbol = getCurrencySymbol(tierCurrency)
                    return (
                      <div key={tier.code} className="flex items-center gap-4">
                        <div className="w-36">
                          <p className="text-[14px] font-medium text-[#1d1d1f]">{tier.name}</p>
                          <span className="text-[11px] font-medium text-[#86868b] bg-[#f5f5f7] px-1.5 py-0.5 rounded-md">{tierCurrency}</span>
                        </div>
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            value={prices[tier.code] || ''}
                            onChange={(e) => handlePriceChange(tier.code, e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            className="w-full h-11 px-4 pr-10 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#86868b] font-medium pointer-events-none">{tierSymbol}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4 bg-[#ff9500]/5 border border-[#ff9500]/20 rounded-xl">
                  <p className="text-[13px] text-[#ff9500]">
                    No price tiers configured. <Link href="/settings/pricing" className="underline font-medium">Create price tiers in Settings → Pricing</Link> first.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <SectionHeader id="details" title="Product Details" subtitle="Material, dimensions, HS code" />
          
          {activeSection === 'details' && (
            <div className="px-5 pb-5 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Material</label>
                  <input
                    type="text"
                    name="material"
                    value={form.material}
                    onChange={handleChange}
                    placeholder="Stainless Steel 316"
                    className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">HS Code</label>
                  <input
                    type="text"
                    name="hsCode"
                    value={form.hsCode}
                    onChange={handleChange}
                    placeholder="7326.90"
                    className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Weight (kg)</label>
                  <input
                    type="text"
                    name="weight"
                    value={form.weight}
                    onChange={handleChange}
                    placeholder="0.5"
                    className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Dimensions</label>
                  <input
                    type="text"
                    name="dimensions"
                    value={form.dimensions}
                    onChange={handleChange}
                    placeholder="100x50x25mm"
                    className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Min Order Qty</label>
                  <input
                    type="number"
                    name="minOrderQty"
                    value={form.minOrderQty}
                    onChange={handleChange}
                    min="1"
                    className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Stock</label>
                  <input
                    type="number"
                    name="stock"
                    value={form.stock}
                    onChange={handleChange}
                    placeholder="Leave empty if not tracked"
                    className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Product Options Section */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <SectionHeader 
            id="options" 
            title="Product Options" 
            subtitle={productOptions.optionGroups.length > 0 
              ? `${productOptions.optionGroups.length} option group${productOptions.optionGroups.length !== 1 ? 's' : ''}`
              : 'Add selectable options (material, color, etc.)'
            } 
          />
          
          {activeSection === 'options' && (
            <div className="px-5 pb-5 pt-0">
              <p className="text-[12px] text-[#86868b] mb-4">
                Define options that customers can choose when ordering. Each option can have photos that customers click to select.
              </p>
              
              <ProductOptionsEditor
                options={productOptions}
                onChange={setProductOptions}
                onUploadImage={uploadOptionImage}
              />
            </div>
          )}
        </div>

        {/* Custom Fields Section */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <SectionHeader id="custom" title="Custom Fields" subtitle={`${customFields.length} field${customFields.length !== 1 ? 's' : ''}`} />
          
          {activeSection === 'custom' && (
            <div className="px-5 pb-5 pt-0">
              <p className="text-[12px] text-[#86868b] mb-4">
                Add any additional information specific to this product
              </p>
              
              {customFields.length > 0 && (
                <div className="space-y-3 mb-4">
                  {customFields.map((field) => (
                    <div key={field.id} className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-[#d2d2d7] cursor-grab flex-shrink-0" />
                      <div className="w-32">
                        <p className="text-[13px] font-medium text-[#1d1d1f]">{field.label}</p>
                      </div>
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => handleUpdateCustomField(field.id, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="flex-1 h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(field.id)}
                        className="p-2 hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-[#ff3b30]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showAddField ? (
                <div className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl">
                  <input
                    type="text"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="Field name (e.g. Warranty, Color)"
                    className="flex-1 h-9 px-3 bg-white rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddField(false)}
                    className="px-3 h-9 text-[13px] text-[#86868b] hover:text-[#1d1d1f]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    disabled={!newFieldLabel.trim()}
                    className="px-4 h-9 bg-[#0071e3] text-white text-[13px] font-medium rounded-lg hover:bg-[#0077ed] disabled:bg-[#d2d2d7]"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddField(true)}
                  className="w-full h-10 flex items-center justify-center gap-2 border-2 border-dashed border-[#d2d2d7]/50 rounded-xl text-[13px] font-medium text-[#0071e3] hover:border-[#0071e3] hover:bg-[#0071e3]/5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Field
                </button>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="text-[13px] text-[#ff3b30] bg-[#ff3b30]/10 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/products"
            className="flex-1 h-11 flex items-center justify-center bg-white border border-[#d2d2d7]/50 text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !form.ref || !form.nameEn}
            className="flex-1 h-11 flex items-center justify-center bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors disabled:bg-[#d2d2d7]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}
