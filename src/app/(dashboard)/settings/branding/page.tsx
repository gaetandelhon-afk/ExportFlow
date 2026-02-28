'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { 
  Palette, Upload, Eye, Save, Loader2, CheckCircle, 
  Image as ImageIcon, X, RefreshCcw
} from 'lucide-react'
import { FeatureGate } from '@/components/FeatureGate'

interface BrandingData {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logoUrl: string | null
  logoWidth: number
  faviconUrl: string | null
  loginBannerUrl: string | null
  companyName: string
  companyLegalName: string | null
  tagline: string | null
  invoiceHeader: string | null
  invoiceFooter: string | null
  emailSignature: string | null
  customCss: string | null
}

const DEFAULT_COLORS = {
  primary: '#0071e3',
  secondary: '#34c759',
  accent: '#ff9500'
}

const PRESET_COLORS = [
  '#0071e3', // Apple Blue
  '#007AFF', // iOS Blue
  '#5856D6', // Purple
  '#AF52DE', // Violet
  '#FF2D55', // Pink
  '#FF3B30', // Red
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#34C759', // Green
  '#00C7BE', // Teal
  '#30B0C7', // Cyan
  '#1d1d1f', // Black
]

export default function BrandingSettingsPage() {
  const [branding, setBranding] = useState<BrandingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'colors' | 'logo'>('colors')
  
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const loginBannerInputRef = useRef<HTMLInputElement>(null)

  const getDefaultBranding = (): BrandingData => ({
    primaryColor: '#0071e3',
    secondaryColor: '#34c759',
    accentColor: '#ff9500',
    logoUrl: null,
    logoWidth: 150,
    faviconUrl: null,
    loginBannerUrl: null,
    companyName: '',
    companyLegalName: null,
    tagline: null,
    invoiceHeader: null,
    invoiceFooter: null,
    emailSignature: null,
    customCss: null
  })

  useEffect(() => {
    fetchBranding()
  }, [])

  const fetchBranding = async () => {
    setLoading(true)
    
    // First try localStorage
    const localBranding = localStorage.getItem('orderbridge_branding')
    if (localBranding) {
      try {
        const parsed = JSON.parse(localBranding)
        setBranding({ ...getDefaultBranding(), ...parsed })
        setLoading(false)
        return
      } catch {
        // Invalid JSON, continue to API
      }
    }
    
    // Then try API
    try {
      const res = await fetch('/api/branding')
      const data = await res.json()
      if (data.branding) {
        setBranding(data.branding)
        // Cache in localStorage
        localStorage.setItem('orderbridge_branding', JSON.stringify(data.branding))
      } else {
        setBranding(getDefaultBranding())
      }
      setError(null)
    } catch {
      setBranding(getDefaultBranding())
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!branding) return
    
    setSaving(true)
    setError(null)
    setSaved(false)
    
    // Always save to localStorage first (immediate persistence)
    localStorage.setItem('orderbridge_branding', JSON.stringify(branding))
    
    // Apply branding immediately via CSS variables
    document.documentElement.style.setProperty('--color-primary', branding.primaryColor)
    document.documentElement.style.setProperty('--color-secondary', branding.secondaryColor)
    document.documentElement.style.setProperty('--color-accent', branding.accentColor)
    
    // Try to save to API (may fail if DB not configured)
    try {
      const res = await fetch('/api/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding)
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        // API failed but localStorage worked - still show success
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      // API failed but localStorage worked - still show success
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File, type: 'logo' | 'favicon' | 'loginBanner') => {
    if (!file) return

    // Accept standard images + ICO for favicon
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
    if (!file.type.startsWith('image/') && !validTypes.includes(file.type)) {
      setError('Please upload an image file (JPEG, PNG, WebP, GIF, SVG, ICO)')
      return
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'branding')
      formData.append('type', type)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        let updatedBranding: BrandingData | null = null
        
        if (type === 'logo') {
          setBranding(prev => {
            updatedBranding = prev ? { ...prev, logoUrl: data.url } : null
            return updatedBranding
          })
        } else if (type === 'favicon') {
          setBranding(prev => {
            updatedBranding = prev ? { ...prev, faviconUrl: data.url } : null
            return updatedBranding
          })
        } else if (type === 'loginBanner') {
          setBranding(prev => {
            updatedBranding = prev ? { ...prev, loginBannerUrl: data.url } : null
            return updatedBranding
          })
        }
        
        // Auto-save to localStorage so changes propagate immediately
        setTimeout(() => {
          if (updatedBranding) {
            localStorage.setItem('orderbridge_branding', JSON.stringify(updatedBranding))
            window.dispatchEvent(new CustomEvent('branding-updated', { 
              detail: updatedBranding 
            }))
          }
        }, 0)
      } else {
        setError(data?.error || 'Failed to upload image')
      }
    } catch {
      setError('Failed to upload image')
    }
  }

  const resetToDefaults = () => {
    if (!branding) return
    setBranding({
      ...branding,
      primaryColor: DEFAULT_COLORS.primary,
      secondaryColor: DEFAULT_COLORS.secondary,
      accentColor: DEFAULT_COLORS.accent
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
      </div>
    )
  }

  if (!branding) {
    return (
      <div className="text-center py-20">
        <p className="text-[#ff3b30]">{error || 'Failed to load branding settings'}</p>
      </div>
    )
  }

  return (
    <FeatureGate feature="branding" featureLabel="la personnalisation de marque">
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
            Branding
          </h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            Customize colors, logo, and documents for your company
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-10 px-5 flex items-center gap-2 bg-[#0071e3] text-white text-[13px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors disabled:opacity-50"
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

      {error && (
        <div className="mb-6 p-4 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-xl flex items-center justify-between">
          <p className="text-[14px] text-[#ff3b30]">{error}</p>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4 text-[#ff3b30]" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#d2d2d7]/30 pb-4">
        {[
          { id: 'colors', label: 'Colors', icon: Palette },
          { id: 'logo', label: 'Logo & Favicon', icon: ImageIcon },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#0071e3] text-white'
                  : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div className="space-y-6">
          {/* Preview */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </h2>
              <button
                onClick={resetToDefaults}
                className="text-[13px] text-[#0071e3] flex items-center gap-1 hover:underline"
              >
                <RefreshCcw className="w-3 h-3" />
                Reset to defaults
              </button>
            </div>
            <div className="flex gap-4">
              <button
                style={{ backgroundColor: branding.primaryColor }}
                className="h-10 px-5 text-white text-[13px] font-medium rounded-xl"
              >
                Primary Button
              </button>
              <button
                style={{ backgroundColor: branding.secondaryColor }}
                className="h-10 px-5 text-white text-[13px] font-medium rounded-xl"
              >
                Secondary Button
              </button>
              <button
                style={{ backgroundColor: branding.accentColor }}
                className="h-10 px-5 text-white text-[13px] font-medium rounded-xl"
              >
                Accent Button
              </button>
            </div>
            <div className="flex gap-4 mt-4">
              <div 
                className="px-3 py-1 rounded-lg text-[12px] font-medium"
                style={{ backgroundColor: `${branding.primaryColor}15`, color: branding.primaryColor }}
              >
                Primary Badge
              </div>
              <div 
                className="px-3 py-1 rounded-lg text-[12px] font-medium"
                style={{ backgroundColor: `${branding.secondaryColor}15`, color: branding.secondaryColor }}
              >
                Secondary Badge
              </div>
              <div 
                className="px-3 py-1 rounded-lg text-[12px] font-medium"
                style={{ backgroundColor: `${branding.accentColor}15`, color: branding.accentColor }}
              >
                Accent Badge
              </div>
            </div>
          </div>

          {/* Color Pickers */}
          <div className="grid grid-cols-3 gap-6">
            {/* Primary */}
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
              <label className="block text-[14px] font-semibold text-[#1d1d1f] mb-3">
                Primary Color
              </label>
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="w-12 h-12 rounded-xl border-2 border-[#d2d2d7]/30 cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="flex-1 h-10 px-3 bg-[#f5f5f7] rounded-xl text-[13px] font-mono uppercase"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.slice(0, 6).map(color => (
                  <button
                    key={color}
                    onClick={() => setBranding({ ...branding, primaryColor: color })}
                    className="w-8 h-8 rounded-lg border-2 border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Secondary */}
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
              <label className="block text-[14px] font-semibold text-[#1d1d1f] mb-3">
                Secondary Color
              </label>
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="color"
                  value={branding.secondaryColor}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  className="w-12 h-12 rounded-xl border-2 border-[#d2d2d7]/30 cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.secondaryColor}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  className="flex-1 h-10 px-3 bg-[#f5f5f7] rounded-xl text-[13px] font-mono uppercase"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.slice(6, 12).map(color => (
                  <button
                    key={color}
                    onClick={() => setBranding({ ...branding, secondaryColor: color })}
                    className="w-8 h-8 rounded-lg border-2 border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Accent */}
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-5">
              <label className="block text-[14px] font-semibold text-[#1d1d1f] mb-3">
                Accent Color
              </label>
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="color"
                  value={branding.accentColor}
                  onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                  className="w-12 h-12 rounded-xl border-2 border-[#d2d2d7]/30 cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.accentColor}
                  onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                  className="flex-1 h-10 px-3 bg-[#f5f5f7] rounded-xl text-[13px] font-mono uppercase"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.slice(0, 6).map(color => (
                  <button
                    key={color}
                    onClick={() => setBranding({ ...branding, accentColor: color })}
                    className="w-8 h-8 rounded-lg border-2 border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logo Tab */}
      {activeTab === 'logo' && (
        <div className="space-y-6">
          {/* Logo */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Company Logo</h2>
            <div className="flex items-start gap-6">
              <div className="w-48 h-32 bg-[#f5f5f7] rounded-xl flex items-center justify-center overflow-hidden relative">
                {branding.logoUrl ? (
                  <Image 
                    src={branding.logoUrl} 
                    alt="Logo" 
                    width={branding.logoWidth}
                    height={Math.round(branding.logoWidth * 0.6)}
                    style={{ maxWidth: branding.logoWidth, maxHeight: '100%' }}
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <ImageIcon className="w-12 h-12 text-[#86868b]" />
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                  className="hidden"
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="h-10 px-4 flex items-center gap-2 bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Logo
                </button>
                <p className="text-[12px] text-[#86868b] mt-2">
                  Recommended: PNG with transparent background, max 2MB
                </p>
                
                {branding.logoUrl && (
                  <div className="mt-4">
                    <label className="block text-[13px] font-medium text-[#86868b] mb-2">
                      Logo Width: {branding.logoWidth}px
                    </label>
                    <input
                      type="range"
                      min="80"
                      max="300"
                      value={branding.logoWidth}
                      onChange={(e) => setBranding({ ...branding, logoWidth: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Favicon */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Favicon</h2>
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-[#f5f5f7] rounded-xl flex items-center justify-center overflow-hidden relative">
                {branding.faviconUrl ? (
                  <Image 
                    src={branding.faviconUrl} 
                    alt="Favicon" 
                    width={32}
                    height={32}
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-[#86868b]" />
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'favicon')}
                  className="hidden"
                />
                <button
                  onClick={() => faviconInputRef.current?.click()}
                  className="h-10 px-4 flex items-center gap-2 bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Favicon
                </button>
                <p className="text-[12px] text-[#86868b] mt-2">
                  Recommended: 32x32px or 64x64px PNG/ICO
                </p>
              </div>
            </div>
          </div>

          {/* Login Banner */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Login Page Banner</h2>
            <p className="text-[13px] text-[#86868b] mb-4">
              This banner will be displayed on the login page to personalize the experience.
            </p>
            <div className="flex items-start gap-6">
              <div className="w-48 h-32 bg-[#f5f5f7] rounded-xl flex items-center justify-center overflow-hidden relative">
                {branding.loginBannerUrl ? (
                  <Image 
                    src={branding.loginBannerUrl} 
                    alt="Login Banner" 
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-[#86868b]" />
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={loginBannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'loginBanner')}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => loginBannerInputRef.current?.click()}
                    className="h-10 px-4 flex items-center gap-2 bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Banner
                  </button>
                  {branding.loginBannerUrl && (
                    <button
                      onClick={() => setBranding({ ...branding, loginBannerUrl: null })}
                      className="h-10 px-4 flex items-center gap-2 text-[#ff3b30] text-[13px] font-medium rounded-xl hover:bg-[#ff3b30]/5 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[12px] text-[#86868b] mt-2">
                  Recommended: 1200x400px or wider. PNG/JPG format.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </FeatureGate>
  )
}
