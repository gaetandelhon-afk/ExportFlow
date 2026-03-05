'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, Loader2, Trash2, Package, Save, Plus, X,
  Image as ImageIcon, ChevronDown, ChevronUp, Folder, GripVertical, Settings2
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import ProductOptionsEditor from '@/components/ProductOptionsEditor'
import { ProductOptions, DEFAULT_PRODUCT_OPTIONS, parseProductOptions, mergeOptionsIntoCustomFields } from '@/types/product-options'
import { useLocalization } from '@/hooks/useLocalization'

interface ProductImage {
  id: string
  url?: string
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
  price: string
  currency: string
}

interface PricingRuleBreak {
  minQuantity: number
  maxQuantity: number | null
  value: number
}

interface PricingRule {
  id: string
  name: string
  code: string
  type: 'PERCENTAGE' | 'FIXED_PRICE'
  breaks: PricingRuleBreak[]
}

export default function ProductDetailPage() {
  const router = useRouter()
  const { currencySymbol, getCurrencySymbol } = useLocalization()
  const params = useParams()
  const productId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [form, setForm] = useState({
    ref: '',
    nameEn: '',
    nameCn: '',
    description: '',
    material: '',
    hsCode: '',
    weight: '',
    dimensions: '',
    categoryId: '',
    requiresSerial: false,
    serialPrefix: '',
  })

  // Dynamic pricing by tier
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([])
  const [localLanguage, setLocalLanguage] = useState('zh')
  
  // Pricing rules (quantity breaks)
  const [availablePricingRules, setAvailablePricingRules] = useState<PricingRule[]>([])
  const [selectedPricingRuleIds, setSelectedPricingRuleIds] = useState<string[]>([])
  // For FIXED_PRICE rules: store unit prices per break { ruleId: { breakIndex: price } }
  const [quantityBreakPrices, setQuantityBreakPrices] = useState<Record<string, Record<number, number>>>({})
  
  // Images
  const [images, setImages] = useState<ProductImage[]>([])
  
  // Custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  
  // Product options
  const [productOptions, setProductOptions] = useState<ProductOptions>(DEFAULT_PRODUCT_OPTIONS)
  
  // Categories
  const [categories, setCategories] = useState<Category[]>([])
  
  // UI state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    images: true,
    basic: true,
    pricing: true,
    pricingRules: false,
    details: false,
    options: false,
    custom: false,
  })

  useEffect(() => {
    fetchData()
  }, [productId])

  const fetchData = async () => {
    try {
      const [productRes, categoriesRes, tiersRes, rulesRes, productRulesRes] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch('/api/categories/list').catch(() => ({ ok: false, json: () => Promise.resolve({ categories: [] }) })),
        fetch('/api/settings/price-tiers').catch(() => ({ ok: false, json: () => Promise.resolve({ tiers: [] }) })),
        fetch('/api/settings/pricing-rules').catch(() => ({ ok: false, json: () => Promise.resolve({ rules: [] }) })),
        fetch(`/api/products/${productId}/pricing-rules`).catch(() => ({ ok: false, json: () => Promise.resolve({ rules: [] }) })),
      ])

      if (!productRes.ok) {
        const data = await productRes.json()
        setError(data.error || 'Product not found')
        setLoading(false)
        return
      }

      const productData = await productRes.json()
      const product = productData.product

      setForm({
        ref: product.ref || '',
        nameEn: product.nameEn || '',
        nameCn: product.nameCn || '',
        description: product.description || '',
        material: product.material || '',
        hsCode: product.hsCode || '',
        weight: product.weightKg?.toString() || '',
        dimensions: '',
        categoryId: product.categoryId || '',
        requiresSerial: product.requiresSerial || false,
        serialPrefix: product.serialPrefix || '',
      })

      // Load price tiers from settings
      if (tiersRes.ok) {
        const tiersData = await tiersRes.json()
        const tiers = tiersData.tiers || []
        const savedPrices = product.prices as Record<string, number> | null
        setPriceTiers(tiers.map((t: { code: string; name: string; currency?: string }) => ({
          code: t.code,
          name: t.name,
          price: savedPrices?.[t.code]?.toString() || '',
          currency: t.currency || 'CNY',
        })))
      } else {
        setPriceTiers([])
      }

      // Load images — prefer photos[] gallery, fall back to single photoUrl
      const photosArray: string[] = Array.isArray(product.photos) && product.photos.length > 0
        ? product.photos
        : product.photoUrl
          ? [product.photoUrl]
          : (product.images || []).map((img: { url: string }) => img.url).filter(Boolean)

      if (photosArray.length > 0) {
        setImages(photosArray.map((url: string, index: number) => ({
          id: `photo-${index}-${url.split('/').pop() || index}`,
          url,
          preview: url,
          isMain: url === product.photoUrl || index === 0,
        })))
      }

      // Load custom fields and product options
      if (product.customFields) {
        // Parse product options from customFields
        const options = parseProductOptions(product.customFields)
        setProductOptions(options)
        
        // Load quantity break prices for FIXED_PRICE rules
        const cf = product.customFields as Record<string, unknown>
        if (cf._quantityBreakPrices && typeof cf._quantityBreakPrices === 'object') {
          setQuantityBreakPrices(cf._quantityBreakPrices as Record<string, Record<number, number>>)
        }
        
        // Load other custom fields (excluding optionGroups and internal fields)
        if (Array.isArray(product.customFields)) {
          setCustomFields(product.customFields)
        } else if (typeof product.customFields === 'object') {
          // Convert object to array format, excluding optionGroups and internal fields
          const fields: CustomField[] = []
          Object.entries(product.customFields).forEach(([key, value]) => {
            if (key !== 'optionGroups' && key !== '_quantityBreakPrices' && typeof value === 'string') {
              fields.push({
                id: `field_${key}`,
                label: key,
                value: value,
                type: 'text'
              })
            }
          })
          setCustomFields(fields)
        }
      }

      // Load categories
      if (categoriesRes.ok) {
        const catData = await categoriesRes.json()
        setCategories(catData.categories || [])
      }

      // Load available pricing rules
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json()
        setAvailablePricingRules((rulesData.rules || []).map((r: PricingRule) => ({
          ...r,
          breaks: r.breaks.map(b => ({ ...b, value: Number(b.value) }))
        })))
      }

      // Load product's assigned pricing rules
      if (productRulesRes.ok) {
        const productRulesData = await productRulesRes.json()
        setSelectedPricingRuleIds((productRulesData.rules || []).map((r: PricingRule) => r.id))
      }
    } catch {
      setError('Failed to load product')
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handlePriceChange = (code: string, value: string) => {
    setPriceTiers(prev => prev.map(t => t.code === code ? { ...t, price: value } : t))
  }

  // Image handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages: ProductImage[] = []
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file)
        newImages.push({
          id: `new-${Date.now()}-${Math.random()}`,
          file,
          preview,
          isMain: images.length === 0 && newImages.length === 0,
        })
      }
    })

    setImages(prev => [...prev, ...newImages])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id)
      // If we removed the main image, set the first one as main
      if (filtered.length > 0 && !filtered.some(img => img.isMain)) {
        filtered[0].isMain = true
      }
      return filtered
    })
  }

  const setMainImage = (id: string) => {
    setImages(prev => prev.map(img => ({ ...img, isMain: img.id === id })))
  }

  // Custom fields
  const addCustomField = () => {
    setCustomFields(prev => [...prev, {
      id: `field-${Date.now()}`,
      label: '',
      value: '',
      type: 'text',
    }])
  }

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const removeCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id))
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

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // Upload any new images first
      const uploadedImages: { url: string; isMain: boolean }[] = []
      
      for (const img of images) {
        if (img.file) {
          // New image - needs upload
          const url = await uploadImage(img.file)
          if (url) {
            uploadedImages.push({ url, isMain: img.isMain })
          }
        } else if (img.url) {
          // Existing image - keep the URL
          uploadedImages.push({ url: img.url, isMain: img.isMain })
        }
      }

      // Build prices object
      const prices: Record<string, number> = {}
      priceTiers.forEach(t => {
        if (t.price) prices[t.code] = parseFloat(t.price)
      })

      // Get main image URL
      const mainImage = uploadedImages.find(img => img.isMain)
      const photoUrl = mainImage?.url || uploadedImages[0]?.url || null

      // Build custom fields including product options
      const customFieldsObj = customFields.reduce((acc, f) => ({ ...acc, [f.label]: f.value }), {} as Record<string, unknown>)
      const finalCustomFields = mergeOptionsIntoCustomFields(customFieldsObj, productOptions)
      
      // Add quantity break prices for FIXED_PRICE rules
      if (Object.keys(quantityBreakPrices).length > 0) {
        finalCustomFields._quantityBreakPrices = quantityBreakPrices
      }

      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          prices,
          customFields: finalCustomFields,
          photoUrl,
          photos: uploadedImages.map(img => img.url),
          images: uploadedImages,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to update')
        return
      }

      // Save pricing rules
      await fetch(`/api/products/${productId}/pricing-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleIds: selectedPricingRuleIds }),
      })

      router.push('/products')
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this product? This action cannot be undone.')) return

    try {
      await fetch(`/api/products/${productId}`, { method: 'DELETE' })
      router.push('/products')
    } catch {
      setError('Failed to delete')
    }
  }

  // Build category tree
  const buildCategoryTree = (cats: Category[], parentId: string | null = null): Category[] => {
    return cats
      .filter(c => c.parentId === parentId)
      .map(c => ({ ...c, children: buildCategoryTree(cats, c.id) }))
  }

  const categoryTree = buildCategoryTree(categories)

  const renderCategoryOptions = (cats: Category[], level = 0): React.ReactElement[] => {
    return cats.flatMap(cat => [
      <option key={cat.id} value={cat.id}>
        {'—'.repeat(level)} {cat.nameEn}
      </option>,
      ...(cat.children ? renderCategoryOptions(cat.children, level + 1) : [])
    ])
  }

  // Section Header Component
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
      {expandedSections[id] ? (
        <ChevronUp className="w-5 h-5 text-[#86868b]" />
      ) : (
        <ChevronDown className="w-5 h-5 text-[#86868b]" />
      )}
    </button>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
      </div>
    )
  }

  if (error && !form.ref) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Package className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
          <p className="text-[15px] text-[#86868b]">{error}</p>
          <Link href="/products" className="text-[#0071e3] text-[14px] mt-4 inline-block">
            Back to Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/products" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-2">
            <ChevronLeft className="w-4 h-4" />
            Products
          </Link>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f]">{form.nameEn || 'Product'}</h1>
          <p className="text-[15px] text-[#86868b] font-mono">{form.ref}</p>
        </div>
        <button
          onClick={handleDelete}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#ff3b30]/10 text-[#ff3b30] transition-colors"
          title="Delete product"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Images Section */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <SectionHeader id="images" title="Product Images" subtitle={`${images.length} image${images.length !== 1 ? 's' : ''}`} />
          {expandedSections.images && (
            <div className="px-5 pb-5 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map(img => (
                  <div
                    key={img.id}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      img.isMain ? 'border-[#0071e3]' : 'border-transparent hover:border-[#d2d2d7]'
                    }`}
                  >
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors group">
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!img.isMain && (
                          <button
                            type="button"
                            onClick={() => setMainImage(img.id)}
                            className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-[10px] font-medium"
                            title="Set as main"
                          >
                            Main
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="w-7 h-7 bg-[#ff3b30] rounded-lg flex items-center justify-center"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                    {img.isMain && (
                      <span className="absolute bottom-2 left-2 text-[10px] font-medium bg-[#0071e3] text-white px-2 py-0.5 rounded">
                        Main
                      </span>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-[#d2d2d7] hover:border-[#0071e3] flex flex-col items-center justify-center gap-2 transition-colors"
                >
                  <ImageIcon className="w-6 h-6 text-[#86868b]" />
                  <span className="text-[12px] text-[#86868b]">Add Image</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <SectionHeader id="basic" title="Basic Information" />
          {expandedSections.basic && (
            <div className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Reference *</label>
                  <input
                    type="text"
                    name="ref"
                    value={form.ref}
                    onChange={handleChange}
                    required
                    className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Category</label>
                  <select
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleChange}
                    className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    <option value="">No category</option>
                    {renderCategoryOptions(categoryTree)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Name (English) *</label>
                <input
                  type="text"
                  name="nameEn"
                  value={form.nameEn}
                  onChange={handleChange}
                  required
                  className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
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
                  className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <SectionHeader id="pricing" title="Pricing" subtitle={`${priceTiers.length} price tier${priceTiers.length !== 1 ? 's' : ''}`} />
          {expandedSections.pricing && (
            <div className="px-5 pb-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {priceTiers.map(tier => {
                  const tierSymbol = getCurrencySymbol(tier.currency)
                  return (
                    <div key={tier.code}>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                        {tier.name}
                        <span className="ml-1.5 text-[11px] font-normal text-[#86868b] bg-[#f0f0f2] px-1.5 py-0.5 rounded-md">{tier.currency}</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={tier.price}
                          onChange={(e) => handlePriceChange(tier.code, e.target.value)}
                          step="0.01"
                          min="0"
                          className="w-full h-11 px-4 pr-10 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#86868b] font-medium pointer-events-none">{tierSymbol}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-[12px] text-[#86868b] mt-3">
                Configure price tiers in <Link href="/settings/pricing" className="text-[#0071e3]">Settings → Pricing</Link>
              </p>
            </div>
          )}
        </div>

        {/* Pricing Rules (Quantity Breaks) */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <SectionHeader 
            id="pricingRules" 
            title="Quantity Pricing" 
            subtitle={selectedPricingRuleIds.length > 0 ? `${selectedPricingRuleIds.length} rule${selectedPricingRuleIds.length !== 1 ? 's' : ''} applied` : 'No rules'} 
          />
          {expandedSections.pricingRules && (
            <div className="px-5 pb-5">
              {availablePricingRules.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-[14px] text-[#86868b] mb-2">No pricing rules configured</p>
                  <Link href="/settings/pricing" className="text-[13px] text-[#0071e3]">
                    Create rules in Settings → Pricing
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {availablePricingRules.map(rule => {
                    const isSelected = selectedPricingRuleIds.includes(rule.id)
                    return (
                      <div
                        key={rule.id}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-[#0071e3] bg-[#0071e3]/5'
                            : 'border-[#d2d2d7]/30 hover:border-[#0071e3]/30'
                        }`}
                      >
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPricingRuleIds([...selectedPricingRuleIds, rule.id])
                              } else {
                                setSelectedPricingRuleIds(selectedPricingRuleIds.filter(id => id !== rule.id))
                              }
                            }}
                            className="mt-1 w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-medium text-[#1d1d1f]">{rule.name}</span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                rule.type === 'PERCENTAGE' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#0071e3]/10 text-[#0071e3]'
                              }`}>
                                {rule.type === 'PERCENTAGE' ? '% Discount' : 'Fixed Price'}
                              </span>
                            </div>
                            {rule.type === 'PERCENTAGE' && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {rule.breaks.map((brk, i) => (
                                  <span key={i} className="text-[11px] px-2 py-1 bg-[#f5f5f7] rounded text-[#86868b]">
                                    {brk.minQuantity}{brk.maxQuantity ? `-${brk.maxQuantity}` : '+'}: {brk.value}%
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </label>
                        {rule.type === 'FIXED_PRICE' && isSelected && (
                          <div className="mt-3 ml-7 p-3 bg-white rounded-lg border border-[#d2d2d7]/30">
                            <p className="text-[11px] text-[#86868b] mb-2">Set unit price for each quantity break:</p>
                            <div className="flex flex-wrap gap-3">
                              {rule.breaks.map((brk, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-[11px] text-[#86868b]">
                                    {brk.minQuantity}{brk.maxQuantity ? `-${brk.maxQuantity}` : '+'}:
                                  </span>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={quantityBreakPrices[rule.id]?.[i] ?? ''}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0
                                        setQuantityBreakPrices(prev => ({
                                          ...prev,
                                          [rule.id]: {
                                            ...prev[rule.id],
                                            [i]: value
                                          }
                                        }))
                                      }}
                                      placeholder="0.00"
                                      className="w-20 h-7 px-2 pr-6 bg-[#f5f5f7] rounded text-[12px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#86868b]">{currencySymbol}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <SectionHeader id="details" title="Product Details" />
          {expandedSections.details && (
            <div className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Material</label>
                  <input
                    type="text"
                    name="material"
                    value={form.material}
                    onChange={handleChange}
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
                    className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Weight (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={form.weight}
                    onChange={handleChange}
                    step="0.01"
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
                    placeholder="L x W x H"
                    className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Product Options */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <SectionHeader 
            id="options" 
            title="Product Options" 
            subtitle={productOptions.optionGroups.length > 0 
              ? `${productOptions.optionGroups.length} option group${productOptions.optionGroups.length !== 1 ? 's' : ''}`
              : 'Add selectable options (material, color, etc.)'
            } 
          />
          {expandedSections.options && (
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

        {/* Custom Fields */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <SectionHeader id="custom" title="Custom Fields" subtitle={customFields.length > 0 ? `${customFields.length} field${customFields.length !== 1 ? 's' : ''}` : 'Add your own fields'} />
          {expandedSections.custom && (
            <div className="px-5 pb-5 space-y-3">
              {customFields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-3 p-3 bg-[#f5f5f7] rounded-xl">
                  <GripVertical className="w-4 h-4 text-[#86868b] mt-3 flex-shrink-0 cursor-move" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                        placeholder="Field label"
                        className="flex-1 h-9 px-3 bg-white rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => updateCustomField(field.id, { type: e.target.value as CustomField['type'] })}
                        className="h-9 px-3 bg-white rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      >
                        <option value="text">Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="number">Number</option>
                      </select>
                    </div>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={field.value}
                        onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                        placeholder="Value"
                        rows={2}
                        className="w-full px-3 py-2 bg-white rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={field.value}
                        onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                        placeholder="Value"
                        className="w-full h-9 px-3 bg-white rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomField(field.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#ff3b30]/10 text-[#ff3b30] transition-colors mt-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addCustomField}
                className="w-full h-10 flex items-center justify-center gap-2 border-2 border-dashed border-[#d2d2d7] hover:border-[#0071e3] rounded-xl text-[13px] text-[#86868b] hover:text-[#0071e3] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Custom Field
              </button>
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
            disabled={saving}
            className="flex-1 h-11 flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] font-medium rounded-xl disabled:bg-[#86868b] transition-colors"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
