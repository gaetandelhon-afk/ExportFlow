'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, Package, Save, Loader2, CheckCircle, 
  Grid3X3, Ruler, Tag, Eye, Plus, Trash2, GripVertical,
  Image, Video, Settings2
} from 'lucide-react'

interface Unit {
  id: string
  name: string
  abbreviation: string
}

type ViewMode = 'list' | 'grid-small' | 'grid-medium' | 'grid-large'

interface ProductSettings {
  // Display
  defaultView: ViewMode
  productsPerPage: number
  showOutOfStock: boolean
  showPrices: boolean
  
  // Units
  units: Unit[]
  defaultUnit: string
  
  // SKU
  skuPrefix: string
  autoGenerateSku: boolean
  
  // Images
  maxImagesPerProduct: number
  thumbnailSize: number
  imageCompressionEnabled: boolean
  imageCompressionQuality: number  // 1-100
  imageMaxWidth: number  // Max width in pixels
  imageMaxFileSize: number  // Max file size in KB
  
  // Videos
  enableProductVideos: boolean
  maxVideosPerProduct: number
  videoCompressionEnabled: boolean
  videoMaxDuration: number  // seconds
  videoMaxFileSize: number  // MB
  allowedVideoFormats: string[]
  
  // Catalog
  enableCategories: boolean
  enableTags: boolean
  enableVariants: boolean
  enableCustomFields: boolean
}

const STORAGE_KEY = 'orderbridge_product_settings'

const DEFAULT_UNITS: Unit[] = [
  { id: '1', name: 'Piece', abbreviation: 'pc' },
  { id: '2', name: 'Box', abbreviation: 'box' },
  { id: '3', name: 'Carton', abbreviation: 'ctn' },
  { id: '4', name: 'Pallet', abbreviation: 'plt' },
  { id: '5', name: 'Kilogram', abbreviation: 'kg' },
  { id: '6', name: 'Meter', abbreviation: 'm' },
  { id: '7', name: 'Liter', abbreviation: 'L' },
]

const DEFAULT_SETTINGS: ProductSettings = {
  defaultView: 'grid-medium',
  productsPerPage: 24,
  showOutOfStock: true,
  showPrices: true,
  units: DEFAULT_UNITS,
  defaultUnit: 'pc',
  skuPrefix: 'SKU-',
  autoGenerateSku: true,
  maxImagesPerProduct: 10,
  thumbnailSize: 200,
  imageCompressionEnabled: true,
  imageCompressionQuality: 85,
  imageMaxWidth: 1920,
  imageMaxFileSize: 500,
  enableProductVideos: true,
  maxVideosPerProduct: 3,
  videoCompressionEnabled: true,
  videoMaxDuration: 60,
  videoMaxFileSize: 50,
  allowedVideoFormats: ['mp4', 'webm', 'mov'],
  enableCategories: true,
  enableTags: true,
  enableVariants: false,
  enableCustomFields: true
}

export default function ProductsSettingsPage() {
  const [settings, setSettings] = useState<ProductSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with defaults, ensuring all properties have valid values
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          // Ensure arrays are always arrays
          units: parsed.units || DEFAULT_SETTINGS.units,
          allowedVideoFormats: parsed.allowedVideoFormats || DEFAULT_SETTINGS.allowedVideoFormats,
          // Ensure numbers are valid
          imageCompressionQuality: parsed.imageCompressionQuality ?? DEFAULT_SETTINGS.imageCompressionQuality,
          imageMaxWidth: parsed.imageMaxWidth ?? DEFAULT_SETTINGS.imageMaxWidth,
          imageMaxFileSize: parsed.imageMaxFileSize ?? DEFAULT_SETTINGS.imageMaxFileSize,
          videoMaxDuration: parsed.videoMaxDuration ?? DEFAULT_SETTINGS.videoMaxDuration,
          videoMaxFileSize: parsed.videoMaxFileSize ?? DEFAULT_SETTINGS.videoMaxFileSize,
          maxVideosPerProduct: parsed.maxVideosPerProduct ?? DEFAULT_SETTINGS.maxVideosPerProduct,
          // Ensure booleans are valid
          imageCompressionEnabled: parsed.imageCompressionEnabled ?? DEFAULT_SETTINGS.imageCompressionEnabled,
          enableProductVideos: parsed.enableProductVideos ?? DEFAULT_SETTINGS.enableProductVideos,
          videoCompressionEnabled: parsed.videoCompressionEnabled ?? DEFAULT_SETTINGS.videoCompressionEnabled,
        })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
    setLoading(false)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const addUnit = () => {
    const newUnit: Unit = {
      id: `unit_${Date.now()}`,
      name: 'New Unit',
      abbreviation: 'nu'
    }
    setSettings(prev => ({ ...prev, units: [...prev.units, newUnit] }))
  }

  const updateUnit = (id: string, field: keyof Unit, value: string) => {
    setSettings(prev => ({
      ...prev,
      units: prev.units.map(u => u.id === id ? { ...u, [field]: value } : u)
    }))
  }

  const removeUnit = (id: string) => {
    setSettings(prev => ({
      ...prev,
      units: prev.units.filter(u => u.id !== id)
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0071e3]"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/settings" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
        <ChevronLeft className="w-4 h-4" />
        Back to Settings
      </Link>
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#00c7be]/10 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-[#00c7be]" />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Product Settings</h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              Categories, units, and catalog configuration
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Display Settings */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="w-5 h-5 text-[#0071e3]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Display Settings</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Default View</label>
              <select
                value={settings.defaultView}
                onChange={(e) => setSettings(prev => ({ ...prev, defaultView: e.target.value as ViewMode }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="list">List View</option>
                <option value="grid-small">Grid - Small</option>
                <option value="grid-medium">Grid - Medium</option>
                <option value="grid-large">Grid - Large</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Products Per Page</label>
              <select
                value={settings.productsPerPage}
                onChange={(e) => setSettings(prev => ({ ...prev, productsPerPage: parseInt(e.target.value) }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value={12}>12 products</option>
                <option value={24}>24 products</option>
                <option value={48}>48 products</option>
                <option value={96}>96 products</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showOutOfStock}
                onChange={(e) => setSettings(prev => ({ ...prev, showOutOfStock: e.target.checked }))}
                className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
              />
              <div>
                <p className="text-[14px] font-medium text-[#1d1d1f]">Show Out of Stock Products</p>
                <p className="text-[12px] text-[#86868b]">Display products even when stock is 0</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showPrices}
                onChange={(e) => setSettings(prev => ({ ...prev, showPrices: e.target.checked }))}
                className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
              />
              <div>
                <p className="text-[14px] font-medium text-[#1d1d1f]">Show Prices in Catalog</p>
                <p className="text-[12px] text-[#86868b]">Display prices publicly in the catalog</p>
              </div>
            </label>
          </div>
        </div>

        {/* Units of Measure */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Ruler className="w-5 h-5 text-[#ff9500]" />
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Units of Measure</h2>
            </div>
            <button
              onClick={addUnit}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#0071e3] text-white rounded-lg text-[13px] font-medium hover:bg-[#0077ED] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Unit
            </button>
          </div>
          
          <div className="space-y-2 mb-4">
            {settings.units.map(unit => (
              <div key={unit.id} className="flex items-center gap-4 p-3 bg-[#f5f5f7] rounded-xl">
                <GripVertical className="w-4 h-4 text-[#86868b] cursor-move" />
                <input
                  type="text"
                  value={unit.name}
                  onChange={(e) => updateUnit(unit.id, 'name', e.target.value)}
                  placeholder="Unit name"
                  className="flex-1 h-9 px-3 bg-white border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                <input
                  type="text"
                  value={unit.abbreviation}
                  onChange={(e) => updateUnit(unit.id, 'abbreviation', e.target.value)}
                  placeholder="Abbr"
                  className="w-20 h-9 px-3 bg-white border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
                <button
                  onClick={() => removeUnit(unit.id)}
                  className="p-2 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          
          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Default Unit</label>
            <select
              value={settings.defaultUnit}
              onChange={(e) => setSettings(prev => ({ ...prev, defaultUnit: e.target.value }))}
              className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            >
              {settings.units.map(u => (
                <option key={u.id} value={u.abbreviation}>{u.name} ({u.abbreviation})</option>
              ))}
            </select>
          </div>
        </div>

        {/* SKU Settings */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Tag className="w-5 h-5 text-[#5856d6]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">SKU Settings</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">SKU Prefix</label>
              <input
                type="text"
                value={settings.skuPrefix}
                onChange={(e) => setSettings(prev => ({ ...prev, skuPrefix: e.target.value }))}
                placeholder="SKU-"
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer h-10">
                <input
                  type="checkbox"
                  checked={settings.autoGenerateSku}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoGenerateSku: e.target.checked }))}
                  className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                />
                <span className="text-[14px] text-[#1d1d1f]">Auto-generate SKU for new products</span>
              </label>
            </div>
          </div>
        </div>

        {/* Catalog Features */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Grid3X3 className="w-5 h-5 text-[#34c759]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Catalog Features</h2>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableCategories}
                onChange={(e) => setSettings(prev => ({ ...prev, enableCategories: e.target.checked }))}
                className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
              />
              <div>
                <p className="text-[14px] font-medium text-[#1d1d1f]">Enable Categories</p>
                <p className="text-[12px] text-[#86868b]">Organize products into hierarchical categories</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableTags}
                onChange={(e) => setSettings(prev => ({ ...prev, enableTags: e.target.checked }))}
                className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
              />
              <div>
                <p className="text-[14px] font-medium text-[#1d1d1f]">Enable Tags</p>
                <p className="text-[12px] text-[#86868b]">Add tags to products for better filtering</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableVariants}
                onChange={(e) => setSettings(prev => ({ ...prev, enableVariants: e.target.checked }))}
                className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
              />
              <div>
                <p className="text-[14px] font-medium text-[#1d1d1f]">Enable Variants</p>
                <p className="text-[12px] text-[#86868b]">Support product variants (size, color, etc.)</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableCustomFields}
                onChange={(e) => setSettings(prev => ({ ...prev, enableCustomFields: e.target.checked }))}
                className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
              />
              <div>
                <p className="text-[14px] font-medium text-[#1d1d1f]">Enable Custom Fields</p>
                <p className="text-[12px] text-[#86868b]">Add custom attributes to products</p>
              </div>
            </label>
          </div>
        </div>

        {/* Image Settings */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Image className="w-5 h-5 text-[#ff2d55]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Image Settings</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Max Images Per Product</label>
              <input
                type="number"
                value={settings.maxImagesPerProduct}
                onChange={(e) => setSettings(prev => ({ ...prev, maxImagesPerProduct: parseInt(e.target.value) || 5 }))}
                min={1}
                max={20}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Thumbnail Size (px)</label>
              <select
                value={settings.thumbnailSize}
                onChange={(e) => setSettings(prev => ({ ...prev, thumbnailSize: parseInt(e.target.value) }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value={100}>100px</option>
                <option value={150}>150px</option>
                <option value={200}>200px</option>
                <option value={300}>300px</option>
              </select>
            </div>
          </div>
          
          {/* Compression Settings */}
          <div className="border-t border-[#d2d2d7]/30 pt-4 mt-4">
            <div className="flex items-center gap-3 mb-4">
              <Settings2 className="w-4 h-4 text-[#86868b]" />
              <h3 className="text-[14px] font-medium text-[#1d1d1f]">Compression Settings</h3>
            </div>
            
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={settings.imageCompressionEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, imageCompressionEnabled: e.target.checked }))}
                className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
              />
              <div>
                <p className="text-[14px] font-medium text-[#1d1d1f]">Enable Auto-Compression</p>
                <p className="text-[12px] text-[#86868b]">Automatically compress images to save storage while maintaining quality</p>
              </div>
            </label>
            
            {settings.imageCompressionEnabled && (
              <div className="grid grid-cols-3 gap-4 pl-8">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                    Quality ({settings.imageCompressionQuality}%)
                  </label>
                  <input
                    type="range"
                    value={settings.imageCompressionQuality}
                    onChange={(e) => setSettings(prev => ({ ...prev, imageCompressionQuality: parseInt(e.target.value) }))}
                    min={50}
                    max={100}
                    className="w-full h-2 bg-[#f5f5f7] rounded-lg appearance-none cursor-pointer accent-[#0071e3]"
                  />
                  <div className="flex justify-between text-[10px] text-[#86868b] mt-1">
                    <span>Smaller file</span>
                    <span>Better quality</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Max Width (px)</label>
                  <select
                    value={settings.imageMaxWidth}
                    onChange={(e) => setSettings(prev => ({ ...prev, imageMaxWidth: parseInt(e.target.value) }))}
                    className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    <option value={800}>800px</option>
                    <option value={1200}>1200px</option>
                    <option value={1600}>1600px</option>
                    <option value={1920}>1920px (Full HD)</option>
                    <option value={2560}>2560px (2K)</option>
                    <option value={3840}>3840px (4K)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Max File Size</label>
                  <select
                    value={settings.imageMaxFileSize}
                    onChange={(e) => setSettings(prev => ({ ...prev, imageMaxFileSize: parseInt(e.target.value) }))}
                    className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    <option value={200}>200 KB</option>
                    <option value={500}>500 KB</option>
                    <option value={1000}>1 MB</option>
                    <option value={2000}>2 MB</option>
                    <option value={5000}>5 MB</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video Settings */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Video className="w-5 h-5 text-[#af52de]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Video Settings</h2>
          </div>
          
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={settings.enableProductVideos}
              onChange={(e) => setSettings(prev => ({ ...prev, enableProductVideos: e.target.checked }))}
              className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
            />
            <div>
              <p className="text-[14px] font-medium text-[#1d1d1f]">Enable Product Videos</p>
              <p className="text-[12px] text-[#86868b]">Allow uploading videos for products</p>
            </div>
          </label>
          
          {settings.enableProductVideos && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Max Videos Per Product</label>
                  <input
                    type="number"
                    value={settings.maxVideosPerProduct}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxVideosPerProduct: parseInt(e.target.value) || 1 }))}
                    min={1}
                    max={10}
                    className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Allowed Formats</label>
                  <div className="flex gap-2 flex-wrap">
                    {['mp4', 'webm', 'mov', 'avi'].map(format => (
                      <label key={format} className="flex items-center gap-1.5 px-2 py-1 bg-[#f5f5f7] rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.allowedVideoFormats.includes(format)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSettings(prev => ({ ...prev, allowedVideoFormats: [...prev.allowedVideoFormats, format] }))
                            } else {
                              setSettings(prev => ({ ...prev, allowedVideoFormats: prev.allowedVideoFormats.filter(f => f !== format) }))
                            }
                          }}
                          className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                        />
                        <span className="text-[12px] text-[#1d1d1f] uppercase">{format}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Video Compression */}
              <div className="border-t border-[#d2d2d7]/30 pt-4 mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <Settings2 className="w-4 h-4 text-[#86868b]" />
                  <h3 className="text-[14px] font-medium text-[#1d1d1f]">Video Compression</h3>
                </div>
                
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={settings.videoCompressionEnabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, videoCompressionEnabled: e.target.checked }))}
                    className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                  />
                  <div>
                    <p className="text-[14px] font-medium text-[#1d1d1f]">Enable Auto-Compression</p>
                    <p className="text-[12px] text-[#86868b]">Automatically compress videos to reduce file size (requires server processing)</p>
                  </div>
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Max Duration</label>
                    <select
                      value={settings.videoMaxDuration}
                      onChange={(e) => setSettings(prev => ({ ...prev, videoMaxDuration: parseInt(e.target.value) }))}
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    >
                      <option value={30}>30 seconds</option>
                      <option value={60}>1 minute</option>
                      <option value={120}>2 minutes</option>
                      <option value={300}>5 minutes</option>
                      <option value={600}>10 minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Max File Size</label>
                    <select
                      value={settings.videoMaxFileSize}
                      onChange={(e) => setSettings(prev => ({ ...prev, videoMaxFileSize: parseInt(e.target.value) }))}
                      className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    >
                      <option value={25}>25 MB</option>
                      <option value={50}>50 MB</option>
                      <option value={100}>100 MB</option>
                      <option value={200}>200 MB</option>
                      <option value={500}>500 MB</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
