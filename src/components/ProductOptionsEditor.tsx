'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { 
  Plus, Trash2, GripVertical, Image as ImageIcon, X, Upload,
  ChevronDown, ChevronUp, Settings2, Package
} from 'lucide-react'
import {
  ProductOptionGroup,
  ProductOption,
  ProductOptionImage,
  ProductOptions,
  generateOptionId,
  generateGroupId,
  DEFAULT_PRODUCT_OPTIONS
} from '@/types/product-options'

interface ProductOptionsEditorProps {
  options: ProductOptions
  onChange: (options: ProductOptions) => void
  onUploadImage: (file: File) => Promise<string>  // Returns URL
}

export default function ProductOptionsEditor({ 
  options, 
  onChange,
  onUploadImage 
}: ProductOptionsEditorProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  // Add a new option group
  const addGroup = () => {
    const newGroup: ProductOptionGroup = {
      id: generateGroupId(),
      name: '',
      required: false,
      options: [],
      sortOrder: options.optionGroups.length
    }
    onChange({
      optionGroups: [...options.optionGroups, newGroup]
    })
    setExpandedGroups(prev => new Set(prev).add(newGroup.id))
  }

  // Update a group
  const updateGroup = (groupId: string, updates: Partial<ProductOptionGroup>) => {
    onChange({
      optionGroups: options.optionGroups.map(g => 
        g.id === groupId ? { ...g, ...updates } : g
      )
    })
  }

  // Remove a group
  const removeGroup = (groupId: string) => {
    if (!confirm('Delete this option group and all its options?')) return
    onChange({
      optionGroups: options.optionGroups.filter(g => g.id !== groupId)
    })
  }

  // Add an option choice to a group
  const addOption = (groupId: string) => {
    const group = options.optionGroups.find(g => g.id === groupId)
    const choiceNumber = (group?.options.length || 0) + 1
    const newOption: ProductOption = {
      id: generateOptionId(),
      name: `Choice ${choiceNumber}`,
      description: '',
      images: [],
      priceModifier: 0,
      sortOrder: group?.options.length || 0
    }
    updateGroup(groupId, {
      options: [...(group?.options || []), newOption]
    })
  }

  // Update an option
  const updateOption = (groupId: string, optionId: string, updates: Partial<ProductOption>) => {
    const group = options.optionGroups.find(g => g.id === groupId)
    if (!group) return
    
    updateGroup(groupId, {
      options: group.options.map(o => 
        o.id === optionId ? { ...o, ...updates } : o
      )
    })
  }

  // Remove an option
  const removeOption = (groupId: string, optionId: string) => {
    const group = options.optionGroups.find(g => g.id === groupId)
    if (!group) return
    
    updateGroup(groupId, {
      options: group.options.filter(o => o.id !== optionId)
    })
  }

  // Handle image upload for an option
  const handleImageUpload = async (groupId: string, optionId: string, files: FileList) => {
    setUploadingFor(optionId)
    
    try {
      const group = options.optionGroups.find(g => g.id === groupId)
      const option = group?.options.find(o => o.id === optionId)
      if (!group || !option) return
      
      const newImages: ProductOptionImage[] = []
      
      for (const file of Array.from(files)) {
        const url = await onUploadImage(file)
        newImages.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url,
          sortOrder: option.images.length + newImages.length
        })
      }
      
      updateOption(groupId, optionId, {
        images: [...option.images, ...newImages]
      })
    } catch (error) {
      console.error('Failed to upload image:', error)
    } finally {
      setUploadingFor(null)
    }
  }

  // Remove an image from an option
  const removeImage = (groupId: string, optionId: string, imageId: string) => {
    const group = options.optionGroups.find(g => g.id === groupId)
    const option = group?.options.find(o => o.id === optionId)
    if (!option) return
    
    updateOption(groupId, optionId, {
      images: option.images.filter(img => img.id !== imageId)
    })
  }

  if (options.optionGroups.length === 0) {
    return (
      <div className="bg-[#f5f5f7] rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-3">
          <Settings2 className="w-6 h-6 text-[#86868b]" />
        </div>
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-1">No Product Options Yet</h3>
        <p className="text-[13px] text-[#86868b] mb-4">
          Add options that customers can choose from. Each option can have multiple choices.
        </p>
        <div className="bg-white rounded-lg p-3 mb-4 text-left max-w-xs mx-auto border border-[#d2d2d7]/30">
          <p className="text-[12px] font-medium text-[#1d1d1f] mb-1">Example:</p>
          <p className="text-[11px] text-[#86868b]">
            <strong>Option:</strong> Material<br/>
            <strong>Choice 1:</strong> Standard (+$0)<br/>
            <strong>Choice 2:</strong> Premium (+$50)
          </p>
        </div>
        <button
          type="button"
          onClick={addGroup}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-[13px] font-medium rounded-lg hover:bg-[#0077ed] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product Option
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Groups */}
      {options.optionGroups.map((group, groupIndex) => {
        const isExpanded = expandedGroups.has(group.id)
        
        return (
          <div key={group.id} className="bg-white border border-[#d2d2d7]/30 rounded-xl overflow-hidden">
            {/* Group Header */}
            <div 
              className="flex items-center gap-3 px-4 py-3 bg-[#f5f5f7]/50 cursor-pointer"
              onClick={() => toggleGroup(group.id)}
            >
              <GripVertical className="w-4 h-4 text-[#86868b] cursor-move" />
              <Package className="w-5 h-5 text-[#0071e3]" />
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#86868b] font-medium uppercase tracking-wider">Option:</span>
                  <input
                    type="text"
                    value={group.name}
                    onChange={(e) => {
                      e.stopPropagation()
                      updateGroup(group.id, { name: e.target.value })
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="e.g., Material, Color, Size..."
                    className="flex-1 bg-transparent text-[14px] font-medium text-[#1d1d1f] focus:outline-none"
                  />
                </div>
              </div>
              
              <label className="flex items-center gap-2 text-[12px] text-[#86868b]" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={group.required}
                  onChange={(e) => updateGroup(group.id, { required: e.target.checked })}
                  className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3]"
                />
                Required
              </label>
              
              <span className="text-[12px] text-[#86868b] px-2 py-0.5 bg-[#f5f5f7] rounded">
                {group.options.length} choice{group.options.length !== 1 ? 's' : ''}
              </span>
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeGroup(group.id)
                }}
                className="p-1.5 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-[#86868b]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#86868b]" />
              )}
            </div>
            
            {/* Group Content */}
            {isExpanded && (
              <div className="p-4 space-y-4">
                {/* Option Description */}
                <div>
                  <label className="block text-[12px] font-medium text-[#86868b] mb-1">
                    Option Description (shown to customer)
                  </label>
                  <input
                    type="text"
                    value={group.description || ''}
                    onChange={(e) => updateGroup(group.id, { description: e.target.value })}
                    placeholder="e.g., Choose your preferred option"
                    className="w-full h-9 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                
                {/* Choices Header */}
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-semibold text-[#1d1d1f]">
                    Available Choices for "{group.name}"
                  </h4>
                </div>
                
                {/* Choices */}
                <div className="space-y-3">
                  {group.options.map((option, optionIndex) => (
                    <div key={option.id} className="bg-[#f5f5f7] rounded-xl p-4">
                      {/* Choice Header with number */}
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#d2d2d7]/30">
                        <span className="w-6 h-6 bg-[#0071e3] text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                          {optionIndex + 1}
                        </span>
                        <span className="text-[12px] font-medium text-[#1d1d1f]">
                          {group.name ? `${group.name} - Choice ${optionIndex + 1}` : `Choice ${optionIndex + 1}`}
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        {/* Images */}
                        <div className="w-32 flex-shrink-0">
                          <div className="grid grid-cols-2 gap-2">
                            {option.images.map(img => (
                              <div key={img.id} className="relative aspect-square">
                                <Image
                                  src={img.url}
                                  alt=""
                                  fill
                                  className="object-cover rounded-lg"
                                  unoptimized
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(group.id, option.id, img.id)}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff3b30] text-white rounded-full flex items-center justify-center z-10"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            
                            {/* Add Image Button */}
                            <label className="aspect-square bg-white border-2 border-dashed border-[#d2d2d7] rounded-lg flex items-center justify-center cursor-pointer hover:border-[#0071e3] transition-colors">
                              {uploadingFor === option.id ? (
                                <div className="w-5 h-5 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Plus className="w-5 h-5 text-[#86868b]" />
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.length) {
                                    handleImageUpload(group.id, option.id, e.target.files)
                                  }
                                }}
                              />
                            </label>
                          </div>
                          <p className="text-[10px] text-[#86868b] mt-1 text-center">
                            Click to add photos
                          </p>
                        </div>
                        
                        {/* Option Details */}
                        <div className="flex-1 space-y-3">
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block text-[11px] font-medium text-[#86868b] mb-1">
                                Choice Name
                              </label>
                              <input
                                type="text"
                                value={option.name}
                                onChange={(e) => updateOption(group.id, option.id, { name: e.target.value })}
                                placeholder={group.name ? `e.g., ${group.name} - Option A` : 'e.g., Standard, Premium'}
                                className="w-full h-9 px-3 bg-white border-0 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                              />
                            </div>
                            <div className="w-28">
                              <label className="block text-[11px] font-medium text-[#86868b] mb-1">
                                Price +/-
                              </label>
                              <input
                                type="number"
                                value={option.priceModifier}
                                onChange={(e) => updateOption(group.id, option.id, { priceModifier: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                                className="w-full h-9 px-3 bg-white border-0 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                              />
                            </div>
                            <div className="w-24">
                              <label className="block text-[11px] font-medium text-[#86868b] mb-1">
                                SKU Suffix
                              </label>
                              <input
                                type="text"
                                value={option.sku || ''}
                                onChange={(e) => updateOption(group.id, option.id, { sku: e.target.value })}
                                placeholder="-CB"
                                className="w-full h-9 px-3 bg-white border-0 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-[11px] font-medium text-[#86868b] mb-1">
                              Description (shown under photo)
                            </label>
                            <textarea
                              value={option.description}
                              onChange={(e) => updateOption(group.id, option.id, { description: e.target.value })}
                              placeholder="e.g., High-quality materials, enhanced durability"
                              rows={2}
                              className="w-full px-3 py-2 bg-white border-0 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-[12px] text-[#86868b]">
                              <input
                                type="checkbox"
                                checked={option.isDefault || false}
                                onChange={(e) => {
                                  // Set this as default, remove default from others
                                  const updatedOptions = group.options.map(o => ({
                                    ...o,
                                    isDefault: o.id === option.id ? e.target.checked : false
                                  }))
                                  updateGroup(group.id, { options: updatedOptions })
                                }}
                                className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3]"
                              />
                              Default selection
                            </label>
                            
                            <button
                              type="button"
                              onClick={() => removeOption(group.id, option.id)}
                              className="text-[12px] text-[#ff3b30] hover:underline"
                            >
                              Remove Choice
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Add Choice Button */}
                <button
                  type="button"
                  onClick={() => addOption(group.id)}
                  className="w-full h-10 flex items-center justify-center gap-2 border-2 border-dashed border-[#d2d2d7] rounded-xl text-[13px] text-[#86868b] hover:border-[#0071e3] hover:text-[#0071e3] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Choice for "{group.name}"
                </button>
              </div>
            )}
          </div>
        )
      })}
      
      {/* Add Option Button */}
      <button
        type="button"
        onClick={addGroup}
        className="w-full h-12 flex items-center justify-center gap-2 border-2 border-dashed border-[#d2d2d7] rounded-xl text-[14px] font-medium text-[#86868b] hover:border-[#0071e3] hover:text-[#0071e3] transition-colors"
      >
        <Plus className="w-5 h-5" />
        Add Another Option (e.g., Color, Size, Finish...)
      </button>
    </div>
  )
}
