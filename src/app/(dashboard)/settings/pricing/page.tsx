'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, Trash2, GripVertical, Save, Loader2, AlertCircle, Percent, DollarSign } from 'lucide-react'
import { useAuthFetch } from '@/hooks/useAuthFetch'

type PriceTierType = 'PERCENTAGE' | 'FIXED_PRICE'
type ModifierSign = '+' | '-'

const CURRENCIES = [
  { code: 'CNY', label: 'CNY ¥' },
  { code: 'USD', label: 'USD $' },
  { code: 'EUR', label: 'EUR €' },
  { code: 'GBP', label: 'GBP £' },
  { code: 'JPY', label: 'JPY ¥' },
  { code: 'HKD', label: 'HKD $' },
  { code: 'AUD', label: 'AUD $' },
  { code: 'CAD', label: 'CAD $' },
  { code: 'CHF', label: 'CHF' },
  { code: 'SGD', label: 'SGD $' },
]

interface PriceTier {
  id: string
  name: string
  code: string
  description: string
  type: PriceTierType
  modifier: number
  modifierSign?: ModifierSign
  modifierValue?: number
  baseTierCode: string
  currency: string
  isDefault: boolean
}

interface PricingRuleBreak {
  id?: string
  minQuantity: number
  maxQuantity: number | null
  value: number
}

interface PricingRule {
  id: string
  name: string
  code: string
  description: string
  type: 'PERCENTAGE' | 'FIXED_PRICE'
  isActive: boolean
  breaks: PricingRuleBreak[]
}

type TabType = 'tiers' | 'rules'

export default function PricingSettingsPage() {
  const authFetch = useAuthFetch()
  const [activeTab, setActiveTab] = useState<TabType>('tiers')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Price Tiers state
  const [tiers, setTiers] = useState<PriceTier[]>([])
  const [showAddTier, setShowAddTier] = useState(false)
  const [newTier, setNewTier] = useState({ 
    name: '', 
    code: '', 
    description: '', 
    type: 'FIXED_PRICE' as PriceTierType, 
    modifier: 0, 
    modifierSign: '-' as ModifierSign, 
    modifierValue: 0, 
    baseTierCode: '',
    currency: 'CNY',
  })

  // Pricing Rules state
  const [rules, setRules] = useState<PricingRule[]>([])
  const [showAddRule, setShowAddRule] = useState(false)
  const [newRule, setNewRule] = useState<Partial<PricingRule>>({
    name: '',
    code: '',
    description: '',
    type: 'PERCENTAGE',
    breaks: [{ minQuantity: 1, maxQuantity: null, value: 0 }]
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [tiersRes, rulesRes] = await Promise.all([
        authFetch('/api/settings/price-tiers'),
        authFetch('/api/settings/pricing-rules')
      ])

      if (tiersRes.ok) {
        const data = await tiersRes.json()
        if (data.tiers && data.tiers.length > 0) {
          setTiers(data.tiers.map((t: PriceTier) => {
            const mod = Number(t.modifier) || 0
            return {
              ...t,
              type: t.type || 'FIXED_PRICE',
              modifier: mod,
              modifierSign: (mod >= 0 ? '+' : '-') as ModifierSign,
              modifierValue: Math.abs(mod),
              baseTierCode: t.baseTierCode || '',
              currency: t.currency || 'CNY',
            }
          }))
        } else {
          setTiers([])
        }
      }

      if (rulesRes.ok) {
        const data = await rulesRes.json()
        setRules((data.rules || []).map((r: PricingRule) => ({
          ...r,
          breaks: r.breaks.map(b => ({
            ...b,
            value: Number(b.value)
          }))
        })))
      }
    } catch (err) {
      console.error('Failed to load pricing data:', err)
      setError('Failed to load pricing data')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Price Tier handlers
  const handleAddTier = () => {
    if (!newTier.name || !newTier.code) return
    if (newTier.type === 'PERCENTAGE' && !newTier.baseTierCode) return
    const calculatedModifier = newTier.modifierSign === '-' ? -Math.abs(newTier.modifierValue) : Math.abs(newTier.modifierValue)
    setTiers([...tiers, { 
      id: `new-${Date.now()}`, 
      ...newTier, 
      modifier: calculatedModifier,
      isDefault: false 
    }])
    setNewTier({ name: '', code: '', description: '', type: 'FIXED_PRICE', modifier: 0, modifierSign: '-', modifierValue: 0, baseTierCode: '', currency: 'CNY' })
    setShowAddTier(false)
    setHasChanges(true)
  }
  
  const fixedPriceTiers = tiers.filter(t => t.type === 'FIXED_PRICE')

  const handleRemoveTier = (id: string) => {
    const tier = tiers.find(t => t.id === id)
    if (!tier) return
    const remaining = tiers.filter(t => t.id !== id)
    if (tier.isDefault && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isDefault: true }
    }
    setTiers(remaining)
    setHasChanges(true)
  }

  const handleSetDefault = (id: string) => {
    setTiers(tiers.map(t => ({ ...t, isDefault: t.id === id })))
    setHasChanges(true)
  }

  const handleUpdateTier = (id: string, field: keyof PriceTier, value: string | number) => {
    setTiers(tiers.map(t => {
      if (t.id !== id) return t
      const updated = { ...t, [field]: value }
      if (field === 'modifierSign' || field === 'modifierValue') {
        const sign = field === 'modifierSign' ? (value as ModifierSign) : (t.modifierSign || '-')
        const absValue = field === 'modifierValue' ? Math.abs(Number(value)) : (t.modifierValue || 0)
        updated.modifier = sign === '-' ? -absValue : absValue
      }
      return updated
    }))
    setHasChanges(true)
  }

  // Pricing Rule handlers
  const handleAddRule = () => {
    if (!newRule.name || !newRule.code) return
    const rule: PricingRule = {
      id: `new-${Date.now()}`,
      name: newRule.name!,
      code: newRule.code!,
      description: newRule.description || '',
      type: newRule.type || 'PERCENTAGE',
      isActive: true,
      breaks: newRule.breaks || []
    }
    setRules([...rules, rule])
    setNewRule({ name: '', code: '', description: '', type: 'PERCENTAGE', breaks: [{ minQuantity: 1, maxQuantity: null, value: 0 }] })
    setShowAddRule(false)
    setHasChanges(true)
  }

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id))
    setHasChanges(true)
  }

  const handleUpdateRule = (id: string, updates: Partial<PricingRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r))
    setHasChanges(true)
  }

  const handleAddBreak = (ruleId: string) => {
    setRules(rules.map(r => {
      if (r.id !== ruleId) return r
      const lastBreak = r.breaks[r.breaks.length - 1]
      const newMin = lastBreak ? (lastBreak.maxQuantity || lastBreak.minQuantity) + 1 : 1
      return { ...r, breaks: [...r.breaks, { minQuantity: newMin, maxQuantity: null, value: 0 }] }
    }))
    setHasChanges(true)
  }

  const handleUpdateBreak = (ruleId: string, breakIndex: number, field: keyof PricingRuleBreak, value: number | null) => {
    setRules(rules.map(r => {
      if (r.id !== ruleId) return r
      const newBreaks = [...r.breaks]
      newBreaks[breakIndex] = { ...newBreaks[breakIndex], [field]: value }
      return { ...r, breaks: newBreaks }
    }))
    setHasChanges(true)
  }

  const handleRemoveBreak = (ruleId: string, breakIndex: number) => {
    setRules(rules.map(r => {
      if (r.id !== ruleId) return r
      return { ...r, breaks: r.breaks.filter((_, i) => i !== breakIndex) }
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const [tiersRes, rulesRes] = await Promise.all([
        authFetch('/api/settings/price-tiers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tiers: tiers.map(t => ({
              id: t.id.startsWith('new-') ? undefined : t.id,
              name: t.name,
              code: t.code,
              description: t.description,
              type: t.type,
              modifier: t.modifier,
              baseTierCode: t.baseTierCode || null,
              currency: t.currency || 'CNY',
              isDefault: t.isDefault,
            }))
          }),
        }),
        authFetch('/api/settings/pricing-rules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rules }),
        })
      ])

      if (!tiersRes.ok || !rulesRes.ok) {
        const errData = !tiersRes.ok ? await tiersRes.json().catch(() => ({})) : await rulesRes.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to save pricing settings')
      }

      await loadData()
      setHasChanges(false)
    } catch (err) {
      console.error('Failed to save:', err)
      setError(err instanceof Error ? err.message : 'Failed to save pricing settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/settings" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Settings
          </Link>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f]">Pricing</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/settings" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f]">Pricing</h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              Configure price tiers and quantity-based pricing rules
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-4 h-10 rounded-xl transition-colors disabled:bg-[#86868b]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {hasChanges ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#ff3b30]" />
          <p className="text-[14px] text-[#ff3b30]">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('tiers')}
          className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
            activeTab === 'tiers'
              ? 'bg-[#1d1d1f] text-white'
              : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
          }`}
        >
          Customer Tiers
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
            activeTab === 'rules'
              ? 'bg-[#1d1d1f] text-white'
              : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
          }`}
        >
          Quantity Pricing Rules
        </button>
      </div>

      {/* Customer Tiers Tab */}
      {activeTab === 'tiers' && (
        <div className="space-y-6">
          <div className="bg-[#0071e3]/5 border border-[#0071e3]/20 rounded-2xl p-5">
            <h3 className="text-[14px] font-semibold text-[#1d1d1f] mb-2">Customer Tiers (Price Levels)</h3>
            <p className="text-[13px] text-[#86868b]">
              Define price levels for different customer types. Choose a type and currency for each tier:
              <br />• <strong>Fixed Price:</strong> You define a specific price for this tier on each product
              <br />• <strong>% from Base:</strong> Automatically calculate from another tier&apos;s price
              <br />&nbsp;&nbsp;&nbsp;→ Use <strong>+20%</strong> for a markup or <strong>-20%</strong> for a discount
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#d2d2d7]/30 bg-[#f5f5f7]/50">
              <div className="grid grid-cols-13 gap-3 text-[12px] font-medium text-[#86868b] uppercase tracking-wide" style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1.5fr 0.8fr 0.8fr 2fr' }}>
                <div>Name</div>
                <div>Code</div>
                <div>Currency</div>
                <div>Type</div>
                <div>Base Tier</div>
                <div>+/−</div>
                <div>%</div>
                <div>Actions</div>
              </div>
            </div>

            <div className="divide-y divide-[#d2d2d7]/30">
              {tiers.map((tier) => (
                <div key={tier.id} className="px-6 py-4">
                  <div className="grid gap-3 items-center" style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1.5fr 0.8fr 0.8fr 2fr' }}>
                    {/* Name */}
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-[#d2d2d7] cursor-grab flex-shrink-0" />
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => handleUpdateTier(tier.id, 'name', e.target.value)}
                        placeholder="e.g. Price A"
                        className="w-full h-9 px-2 bg-[#f5f5f7] rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      />
                    </div>
                    {/* Code */}
                    <div>
                      <input
                        type="text"
                        value={tier.code}
                        onChange={(e) => handleUpdateTier(tier.id, 'code', e.target.value.toLowerCase().replace(/\s/g, '_'))}
                        className="w-full h-9 px-2 bg-[#f5f5f7] rounded-lg text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      />
                    </div>
                    {/* Currency */}
                    <div>
                      <select
                        value={tier.currency || 'CNY'}
                        onChange={(e) => handleUpdateTier(tier.id, 'currency', e.target.value)}
                        className="w-full h-9 px-2 bg-[#f5f5f7] rounded-lg text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      >
                        {CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* Type */}
                    <div>
                      <select
                        value={tier.type}
                        onChange={(e) => {
                          handleUpdateTier(tier.id, 'type', e.target.value)
                          if (e.target.value === 'FIXED_PRICE') {
                            handleUpdateTier(tier.id, 'baseTierCode', '')
                          }
                        }}
                        className={`w-full h-9 px-2 rounded-lg text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
                          tier.type === 'PERCENTAGE' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#0071e3]/10 text-[#0071e3]'
                        }`}
                      >
                        <option value="FIXED_PRICE">Fixed Price</option>
                        <option value="PERCENTAGE">% from Base</option>
                      </select>
                    </div>
                    {/* Base Tier */}
                    <div>
                      {tier.type === 'PERCENTAGE' ? (
                        <select
                          value={tier.baseTierCode}
                          onChange={(e) => handleUpdateTier(tier.id, 'baseTierCode', e.target.value)}
                          className="w-full h-9 px-2 bg-[#f5f5f7] rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        >
                          <option value="">Select base...</option>
                          {fixedPriceTiers.filter(t => t.id !== tier.id).map(t => (
                            <option key={t.code} value={t.code}>{t.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[12px] text-[#86868b] px-2">—</span>
                      )}
                    </div>
                    {/* +/- */}
                    <div>
                      {tier.type === 'PERCENTAGE' ? (
                        <select
                          value={tier.modifierSign || '-'}
                          onChange={(e) => handleUpdateTier(tier.id, 'modifierSign', e.target.value)}
                          className={`w-full h-9 px-2 bg-[#f5f5f7] rounded-lg text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
                            tier.modifierSign === '-' ? 'text-[#34c759]' : 'text-[#ff9500]'
                          }`}
                        >
                          <option value="-">−</option>
                          <option value="+">+</option>
                        </select>
                      ) : (
                        <span className="text-[12px] text-[#86868b] px-2">—</span>
                      )}
                    </div>
                    {/* % value */}
                    <div>
                      {tier.type === 'PERCENTAGE' ? (
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={tier.modifierValue || 0}
                            onChange={(e) => handleUpdateTier(tier.id, 'modifierValue', parseFloat(e.target.value) || 0)}
                            className={`w-full h-9 px-2 pr-7 bg-[#f5f5f7] rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
                              tier.modifierSign === '-' ? 'text-[#34c759]' : 'text-[#ff9500]'
                            }`}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[#86868b]">%</span>
                        </div>
                      ) : (
                        <span className="text-[12px] text-[#86868b] px-2">—</span>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {tier.isDefault ? (
                        <span className="text-[10px] font-medium px-2 py-1 bg-[#1d1d1f] text-white rounded">Default</span>
                      ) : (
                        <button onClick={() => handleSetDefault(tier.id)} className="text-[11px] text-[#0071e3] hover:text-[#0077ed] font-medium px-2 py-1 border border-[#0071e3]/30 rounded hover:bg-[#0071e3]/5 transition-colors">
                          Set default
                        </button>
                      )}
                      <button onClick={() => handleRemoveTier(tier.id)} className="p-1 hover:bg-[#ff3b30]/10 rounded-lg" title="Delete tier">
                        <Trash2 className="w-4 h-4 text-[#ff3b30]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {showAddTier ? (
              <div className="px-6 py-4 border-t border-[#d2d2d7]/30 bg-[#f5f5f7]/50">
                <div className="grid gap-3 items-end" style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1.5fr 0.8fr 0.8fr 2fr' }}>
                  <div>
                    <label className="block text-[11px] font-medium text-[#86868b] mb-1">Name *</label>
                    <input
                      type="text"
                      value={newTier.name}
                      onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                      placeholder="e.g. Price A"
                      className="w-full h-9 px-2 bg-white border border-[#d2d2d7]/30 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#86868b] mb-1">Code *</label>
                    <input
                      type="text"
                      value={newTier.code}
                      onChange={(e) => setNewTier({ ...newTier, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                      placeholder="price_a"
                      className="w-full h-9 px-2 bg-white border border-[#d2d2d7]/30 rounded-lg text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#86868b] mb-1">Currency</label>
                    <select
                      value={newTier.currency}
                      onChange={(e) => setNewTier({ ...newTier, currency: e.target.value })}
                      className="w-full h-9 px-2 bg-white border border-[#d2d2d7]/30 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#86868b] mb-1">Type</label>
                    <select
                      value={newTier.type}
                      onChange={(e) => setNewTier({ ...newTier, type: e.target.value as PriceTierType, baseTierCode: '' })}
                      className="w-full h-9 px-2 bg-white border border-[#d2d2d7]/30 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    >
                      <option value="FIXED_PRICE">Fixed Price</option>
                      <option value="PERCENTAGE">% from Base</option>
                    </select>
                  </div>
                  <div>
                    {newTier.type === 'PERCENTAGE' ? (
                      <>
                        <label className="block text-[11px] font-medium text-[#86868b] mb-1">Base Tier *</label>
                        <select
                          value={newTier.baseTierCode}
                          onChange={(e) => setNewTier({ ...newTier, baseTierCode: e.target.value })}
                          className="w-full h-9 px-2 bg-white border border-[#d2d2d7]/30 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        >
                          <option value="">Select...</option>
                          {fixedPriceTiers.map(t => (
                            <option key={t.code} value={t.code}>{t.name}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <span className="block h-9 leading-9 text-[12px] text-[#86868b]">—</span>
                    )}
                  </div>
                  <div>
                    {newTier.type === 'PERCENTAGE' ? (
                      <>
                        <label className="block text-[11px] font-medium text-[#86868b] mb-1">+/−</label>
                        <select
                          value={newTier.modifierSign}
                          onChange={(e) => setNewTier({ ...newTier, modifierSign: e.target.value as ModifierSign })}
                          className={`w-full h-9 px-2 bg-white border border-[#d2d2d7]/30 rounded-lg text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
                            newTier.modifierSign === '-' ? 'text-[#34c759]' : 'text-[#ff9500]'
                          }`}
                        >
                          <option value="-">−</option>
                          <option value="+">+</option>
                        </select>
                      </>
                    ) : (
                      <span className="block h-9 leading-9 text-[12px] text-[#86868b]">—</span>
                    )}
                  </div>
                  <div>
                    {newTier.type === 'PERCENTAGE' ? (
                      <>
                        <label className="block text-[11px] font-medium text-[#86868b] mb-1">%</label>
                        <input
                          type="number"
                          min="0"
                          value={newTier.modifierValue}
                          onChange={(e) => setNewTier({ ...newTier, modifierValue: parseFloat(e.target.value) || 0 })}
                          placeholder="20"
                          className={`w-full h-9 px-2 bg-white border border-[#d2d2d7]/30 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
                            newTier.modifierSign === '-' ? 'text-[#34c759]' : 'text-[#ff9500]'
                          }`}
                        />
                      </>
                    ) : (
                      <span className="block h-9 leading-9 text-[12px] text-[#86868b]">—</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddTier(false)} className="px-2 h-9 text-[12px] text-[#86868b] hover:text-[#1d1d1f]">Cancel</button>
                    <button
                      onClick={handleAddTier}
                      disabled={!newTier.name || !newTier.code || (newTier.type === 'PERCENTAGE' && !newTier.baseTierCode)}
                      className="px-3 h-9 bg-[#0071e3] text-white text-[12px] font-medium rounded-lg hover:bg-[#0077ed] disabled:bg-[#d2d2d7]"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddTier(true)}
                className="w-full px-6 py-4 flex items-center justify-center gap-2 text-[14px] font-medium text-[#0071e3] hover:bg-[#f5f5f7] transition-colors border-t border-[#d2d2d7]/30"
              >
                <Plus className="w-4 h-4" />
                Add Customer Tier
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quantity Pricing Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="bg-[#ff9500]/5 border border-[#ff9500]/20 rounded-2xl p-5">
            <h3 className="text-[14px] font-semibold text-[#1d1d1f] mb-2">Quantity Pricing Rules</h3>
            <p className="text-[13px] text-[#86868b]">
              Create rules with quantity breaks. Assign rules to products to enable volume discounts or tiered pricing.
              <br />• <strong>Percentage:</strong> Discount % applied to base price (e.g., -10% for 10+ units)
              <br />• <strong>Fixed Price:</strong> Define quantity breaks here, set the unit price on each product
            </p>
          </div>

          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
                <div className="px-6 py-4 border-b border-[#d2d2d7]/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      rule.type === 'PERCENTAGE' ? 'bg-[#34c759]/10' : 'bg-[#0071e3]/10'
                    }`}>
                      {rule.type === 'PERCENTAGE' ? (
                        <Percent className="w-5 h-5 text-[#34c759]" />
                      ) : (
                        <DollarSign className="w-5 h-5 text-[#0071e3]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) => handleUpdateRule(rule.id, { name: e.target.value })}
                        className="text-[15px] font-semibold text-[#1d1d1f] bg-transparent focus:outline-none focus:ring-2 focus:ring-[#0071e3] rounded px-2 -ml-2"
                      />
                      <div className="flex items-center gap-3 mt-1">
                        <input
                          type="text"
                          value={rule.code}
                          onChange={(e) => handleUpdateRule(rule.id, { code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                          className="text-[12px] font-mono text-[#86868b] bg-transparent focus:outline-none focus:ring-2 focus:ring-[#0071e3] rounded px-1"
                        />
                        <select
                          value={rule.type}
                          onChange={(e) => handleUpdateRule(rule.id, { type: e.target.value as 'PERCENTAGE' | 'FIXED_PRICE' })}
                          className="text-[12px] text-[#86868b] bg-[#f5f5f7] rounded px-2 py-1 focus:outline-none"
                        >
                          <option value="PERCENTAGE">% Discount</option>
                          <option value="FIXED_PRICE">Fixed Price</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveRule(rule.id)} className="p-2 hover:bg-[#ff3b30]/10 rounded-lg">
                    <Trash2 className="w-4 h-4 text-[#ff3b30]" />
                  </button>
                </div>

                <div className="px-6 py-4">
                  {rule.type === 'FIXED_PRICE' && (
                    <div className="mb-3 p-3 bg-[#0071e3]/5 rounded-lg">
                      <p className="text-[12px] text-[#0071e3]">
                        💡 Define quantity breaks here. The unit price for each break will be set on each product individually.
                      </p>
                    </div>
                  )}
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-[#86868b] text-left">
                        <th className="pb-2 font-medium">Min Qty</th>
                        <th className="pb-2 font-medium">Max Qty</th>
                        {rule.type === 'PERCENTAGE' && (
                          <th className="pb-2 font-medium">Discount %</th>
                        )}
                        <th className="pb-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rule.breaks.map((brk, index) => (
                        <tr key={index}>
                          <td className="py-1.5">
                            <input
                              type="number"
                              min="1"
                              value={brk.minQuantity}
                              onChange={(e) => handleUpdateBreak(rule.id, index, 'minQuantity', parseInt(e.target.value) || 1)}
                              className="w-24 h-8 px-3 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                            />
                          </td>
                          <td className="py-1.5">
                            <input
                              type="number"
                              min={brk.minQuantity}
                              value={brk.maxQuantity ?? ''}
                              onChange={(e) => handleUpdateBreak(rule.id, index, 'maxQuantity', e.target.value ? parseInt(e.target.value) : null)}
                              placeholder="∞"
                              className="w-24 h-8 px-3 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                            />
                          </td>
                          {rule.type === 'PERCENTAGE' && (
                            <td className="py-1.5">
                              <div className="relative w-32">
                                <input
                                  type="number"
                                  step="1"
                                  value={brk.value}
                                  onChange={(e) => handleUpdateBreak(rule.id, index, 'value', parseFloat(e.target.value) || 0)}
                                  className={`w-full h-8 px-3 pr-8 rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
                                    brk.value < 0 ? 'bg-[#34c759]/10 text-[#34c759]' :
                                    brk.value > 0 ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                                    'bg-[#f5f5f7]'
                                  }`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#86868b]">%</span>
                              </div>
                            </td>
                          )}
                          <td className="py-1.5">
                            {rule.breaks.length > 1 && (
                              <button onClick={() => handleRemoveBreak(rule.id, index)} className="p-1 hover:bg-[#ff3b30]/10 rounded">
                                <Trash2 className="w-3.5 h-3.5 text-[#ff3b30]" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    onClick={() => handleAddBreak(rule.id)}
                    className="mt-2 text-[12px] text-[#0071e3] hover:text-[#0077ed] font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Break
                  </button>
                </div>
              </div>
            ))}

            {showAddRule ? (
              <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">New Pricing Rule</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#86868b] mb-1">Name *</label>
                    <input
                      type="text"
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      placeholder="e.g. Volume Discount"
                      className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#86868b] mb-1">Code *</label>
                    <input
                      type="text"
                      value={newRule.code}
                      onChange={(e) => setNewRule({ ...newRule, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                      placeholder="volume_discount"
                      className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#86868b] mb-1">Type</label>
                    <select
                      value={newRule.type}
                      onChange={(e) => setNewRule({ ...newRule, type: e.target.value as 'PERCENTAGE' | 'FIXED_PRICE' })}
                      className="w-full h-10 px-3 bg-[#f5f5f7] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    >
                      <option value="PERCENTAGE">Percentage Discount</option>
                      <option value="FIXED_PRICE">Fixed Price per Unit</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-[#86868b] mb-2">Quantity Breaks</label>
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-[#86868b] text-left">
                        <th className="pb-2 font-medium">Min Qty</th>
                        <th className="pb-2 font-medium">Max Qty</th>
                        <th className="pb-2 font-medium">{newRule.type === 'PERCENTAGE' ? 'Discount %' : 'Unit Price'}</th>
                        <th className="pb-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newRule.breaks?.map((brk, index) => (
                        <tr key={index}>
                          <td className="py-1.5">
                            <input
                              type="number"
                              min="1"
                              value={brk.minQuantity}
                              onChange={(e) => {
                                const breaks = [...(newRule.breaks || [])]
                                breaks[index] = { ...breaks[index], minQuantity: parseInt(e.target.value) || 1 }
                                setNewRule({ ...newRule, breaks })
                              }}
                              className="w-24 h-8 px-3 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                            />
                          </td>
                          <td className="py-1.5">
                            <input
                              type="number"
                              value={brk.maxQuantity ?? ''}
                              onChange={(e) => {
                                const breaks = [...(newRule.breaks || [])]
                                breaks[index] = { ...breaks[index], maxQuantity: e.target.value ? parseInt(e.target.value) : null }
                                setNewRule({ ...newRule, breaks })
                              }}
                              placeholder="∞"
                              className="w-24 h-8 px-3 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                            />
                          </td>
                          <td className="py-1.5">
                            <input
                              type="number"
                              step={newRule.type === 'PERCENTAGE' ? '1' : '0.01'}
                              value={brk.value}
                              onChange={(e) => {
                                const breaks = [...(newRule.breaks || [])]
                                breaks[index] = { ...breaks[index], value: parseFloat(e.target.value) || 0 }
                                setNewRule({ ...newRule, breaks })
                              }}
                              className="w-32 h-8 px-3 bg-[#f5f5f7] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                            />
                          </td>
                          <td>
                            {(newRule.breaks?.length || 0) > 1 && (
                              <button
                                onClick={() => setNewRule({ ...newRule, breaks: newRule.breaks?.filter((_, i) => i !== index) })}
                                className="p-1 hover:bg-[#ff3b30]/10 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[#ff3b30]" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    onClick={() => {
                      const breaks = [...(newRule.breaks || [])]
                      const last = breaks[breaks.length - 1]
                      breaks.push({ minQuantity: (last?.maxQuantity || last?.minQuantity || 0) + 1, maxQuantity: null, value: 0 })
                      setNewRule({ ...newRule, breaks })
                    }}
                    className="mt-2 text-[12px] text-[#0071e3] hover:text-[#0077ed] font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Break
                  </button>
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowAddRule(false)} className="px-4 h-10 text-[14px] text-[#86868b] hover:text-[#1d1d1f]">
                    Cancel
                  </button>
                  <button
                    onClick={handleAddRule}
                    disabled={!newRule.name || !newRule.code}
                    className="px-5 h-10 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] disabled:bg-[#d2d2d7]"
                  >
                    Create Rule
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddRule(true)}
                className="w-full p-6 rounded-2xl border-2 border-dashed border-[#d2d2d7]/50 hover:border-[#0071e3]/50 flex items-center justify-center gap-2 text-[14px] font-medium text-[#0071e3] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Pricing Rule
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
