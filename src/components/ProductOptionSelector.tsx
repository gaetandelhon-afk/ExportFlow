'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Check, Package } from 'lucide-react'
import {
  ProductOptions,
  ProductOptionGroup,
  ProductOption,
  SelectedOption,
  parseProductOptions
} from '@/types/product-options'

interface ProductOptionSelectorProps {
  productName: string
  productImage?: string
  customFields: unknown  // Product's customFields containing optionGroups
  basePrice: number
  currency: string
  onConfirm: (selectedOptions: SelectedOption[], totalPriceModifier: number) => void
  onCancel: () => void
}

export default function ProductOptionSelector({
  productName,
  productImage,
  customFields,
  basePrice,
  currency,
  onConfirm,
  onCancel
}: ProductOptionSelectorProps) {
  const [options, setOptions] = useState<ProductOptions>({ optionGroups: [] })
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})  // groupId -> optionId

  useEffect(() => {
    const parsed = parseProductOptions(customFields)
    setOptions(parsed)
    
    // Pre-select default options
    const defaults: Record<string, string> = {}
    parsed.optionGroups.forEach(group => {
      const defaultOption = group.options.find(o => o.isDefault)
      if (defaultOption) {
        defaults[group.id] = defaultOption.id
      }
    })
    setSelectedOptions(defaults)
  }, [customFields])

  const handleSelectOption = (groupId: string, optionId: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [groupId]: optionId
    }))
  }

  const getTotalPriceModifier = () => {
    let total = 0
    options.optionGroups.forEach(group => {
      const selectedId = selectedOptions[group.id]
      if (selectedId) {
        const option = group.options.find(o => o.id === selectedId)
        if (option) {
          total += option.priceModifier
        }
      }
    })
    return total
  }

  const getSelectedOptionsArray = (): SelectedOption[] => {
    const result: SelectedOption[] = []
    options.optionGroups.forEach(group => {
      const selectedId = selectedOptions[group.id]
      if (selectedId) {
        const option = group.options.find(o => o.id === selectedId)
        if (option) {
          result.push({
            groupId: group.id,
            groupName: group.name,
            optionId: option.id,
            optionName: option.name,
            priceModifier: option.priceModifier
          })
        }
      }
    })
    return result
  }

  const isValid = () => {
    // Check if all required groups have a selection
    return options.optionGroups
      .filter(g => g.required)
      .every(g => selectedOptions[g.id])
  }

  const handleConfirm = () => {
    if (!isValid()) return
    onConfirm(getSelectedOptionsArray(), getTotalPriceModifier())
  }

  const formatPrice = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
    return `${currency} ${formatted}`
  }

  const priceModifier = getTotalPriceModifier()
  const finalPrice = basePrice + priceModifier

  if (options.optionGroups.length === 0) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 p-5 border-b border-[#d2d2d7]/30">
          {productImage ? (
            <div className="w-16 h-16 relative rounded-xl overflow-hidden">
              <Image 
                src={productImage} 
                alt={productName}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-16 h-16 bg-[#f5f5f7] rounded-xl flex items-center justify-center">
              <Package className="w-8 h-8 text-[#86868b]" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
              Choose Options
            </h2>
            <p className="text-[14px] text-[#86868b] line-clamp-1">
              {productName}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f7] transition-colors"
          >
            <X className="w-5 h-5 text-[#86868b]" />
          </button>
        </div>
        
        {/* Options */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {options.optionGroups.map(group => (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] text-[#86868b] font-medium uppercase tracking-wider">
                  Option:
                </span>
                <h3 className="text-[14px] font-semibold text-[#1d1d1f]">
                  {group.name}
                </h3>
                {group.required && (
                  <span className="text-[10px] text-[#ff3b30] font-medium px-1.5 py-0.5 bg-[#ff3b30]/10 rounded">
                    Required
                  </span>
                )}
              </div>
              {group.description && (
                <p className="text-[12px] text-[#86868b] mb-2">
                  {group.description}
                </p>
              )}
              <p className="text-[11px] text-[#86868b] mb-3">
                Select one of the {group.options.length} available choices:
              </p>
              
              {/* Option Items - Compact List Style */}
              <div className="space-y-2">
                {group.options.map(option => {
                  const isSelected = selectedOptions[group.id] === option.id
                  const mainImage = option.images[0]?.url
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelectOption(group.id, option.id)}
                      className={`relative w-full rounded-xl overflow-hidden border-2 transition-all text-left flex items-center gap-3 p-3 ${
                        isSelected 
                          ? 'border-[#0071e3] bg-[#0071e3]/5' 
                          : 'border-[#d2d2d7]/50 hover:border-[#0071e3]/50 hover:bg-[#f5f5f7]'
                      }`}
                    >
                      {/* Small Image/Icon */}
                      <div className="w-12 h-12 flex-shrink-0 bg-[#f5f5f7] rounded-lg overflow-hidden flex items-center justify-center relative">
                        {mainImage ? (
                          <Image
                            src={mainImage}
                            alt={option.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <Package className="w-5 h-5 text-[#86868b]" />
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#1d1d1f] truncate">
                          {option.name}
                        </p>
                        {option.description && (
                          <p className="text-[11px] text-[#86868b] truncate">
                            {option.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Price Modifier */}
                      {option.priceModifier !== 0 && (
                        <span className={`text-[12px] font-medium flex-shrink-0 ${
                          option.priceModifier > 0 ? 'text-[#ff9500]' : 'text-[#34c759]'
                        }`}>
                          {option.priceModifier > 0 ? '+' : ''}{formatPrice(option.priceModifier)}
                        </span>
                      )}
                      
                      {/* Selected Indicator */}
                      <div className={`w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'border-[#0071e3] bg-[#0071e3]' 
                          : 'border-[#d2d2d7]'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="p-5 border-t border-[#d2d2d7]/30 bg-[#f5f5f7]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[12px] text-[#86868b]">Total Price</p>
              <div className="flex items-baseline gap-2">
                <p className="text-[20px] font-semibold text-[#1d1d1f]">
                  {formatPrice(finalPrice)}
                </p>
                {priceModifier !== 0 && (
                  <span className={`text-[12px] ${
                    priceModifier > 0 ? 'text-[#ff9500]' : 'text-[#34c759]'
                  }`}>
                    ({priceModifier > 0 ? '+' : ''}{formatPrice(priceModifier)})
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-11 rounded-xl font-medium text-[14px] text-[#1d1d1f] bg-white border border-[#d2d2d7]/50 hover:bg-[#f5f5f7] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid()}
              className="flex-1 h-11 rounded-xl font-medium text-[14px] text-white bg-[#0071e3] hover:bg-[#0077ed] transition-colors disabled:bg-[#86868b] disabled:cursor-not-allowed"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
