'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, Plus, Folder, FolderOpen, ChevronRight, ChevronDown,
  Trash2, Edit2, X, Check, Loader2, CheckSquare, Square, AlertTriangle, Move
} from 'lucide-react'
import Portal from '@/components/Portal'

interface Category {
  id: string
  nameEn: string
  nameCn: string | null
  parentId: string | null
  sortOrder: number
  _count: { products: number }
  children?: Category[]
}

export default function CategoriesSettingsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  
  // Add state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addParentId, setAddParentId] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryNameCn, setNewCategoryNameCn] = useState('')
  const [localLanguage, setLocalLanguage] = useState('zh')
  const [creating, setCreating] = useState(false)
  
  // Selection state
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteAction, setDeleteAction] = useState<'keep' | 'delete'>('keep')
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Move category state
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [categoryToMove, setCategoryToMove] = useState<Category | null>(null)
  const [targetParentId, setTargetParentId] = useState<string | ''>('')
  const [isMoving, setIsMoving] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories/list')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch {
      console.error('Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  // Build tree structure
  const buildTree = (cats: Category[], parentId: string | null = null): Category[] => {
    return cats
      .filter(c => c.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(c => ({
        ...c,
        children: buildTree(cats, c.id)
      }))
  }

  const categoryTree = buildTree(categories)

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startEdit = (category: Category) => {
    setEditingId(category.id)
    setEditName(category.nameEn)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return
    
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameEn: editName }),
      })
      
      if (res.ok) {
        fetchCategories()
        cancelEdit()
      }
    } catch {
      console.error('Failed to update category')
    }
  }

  const deleteCategory = async (id: string, deleteProducts: boolean = false) => {
    try {
      await fetch(`/api/categories/${id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteProducts })
      })
      fetchCategories()
    } catch {
      console.error('Failed to delete category')
    }
  }

  // Selection functions
  const toggleSelection = (id: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    const allIds = categories.map(c => c.id)
    setSelectedCategories(new Set(allIds))
  }

  const deselectAll = () => {
    setSelectedCategories(new Set())
  }

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    if (isSelectionMode) {
      setSelectedCategories(new Set())
    }
  }

  const getSelectedProductsCount = () => {
    return categories
      .filter(c => selectedCategories.has(c.id))
      .reduce((sum, c) => sum + c._count.products, 0)
  }

  // Move category functions
  const openMoveModal = (category: Category) => {
    setCategoryToMove(category)
    setTargetParentId('')
    setShowMoveModal(true)
  }
  
  const handleMoveCategory = async () => {
    if (!categoryToMove) return
    setIsMoving(true)
    
    try {
      const res = await fetch(`/api/categories/${categoryToMove.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nameEn: categoryToMove.nameEn, // Keep existing name
          parentId: targetParentId === '' ? null : targetParentId 
        }),
      })
      
      if (res.ok) {
        setShowMoveModal(false)
        setCategoryToMove(null)
        fetchCategories()
      } else {
        alert('Failed to move category')
      }
    } catch {
      alert('Failed to move category')
    } finally {
      setIsMoving(false)
    }
  }
  
  // Get all possible target categories (excluding the category being moved and its children)
  const getValidMoveTargets = (categoryId: string): Category[] => {
    const getChildIds = (id: string): string[] => {
      const children = categories.filter(c => c.parentId === id)
      return [id, ...children.flatMap(c => getChildIds(c.id))]
    }
    const excludeIds = new Set(getChildIds(categoryId))
    return categories.filter(c => !excludeIds.has(c.id))
  }
  
  // Get full path name for a category (for display in dropdown)
  const getCategoryPath = (cat: Category): string => {
    const path: string[] = [cat.nameEn]
    let current = cat
    while (current.parentId) {
      const parent = categories.find(c => c.id === current.parentId)
      if (parent) {
        path.unshift(parent.nameEn)
        current = parent
      } else {
        break
      }
    }
    return path.join(' → ')
  }

  const handleBulkDelete = async () => {
    if (selectedCategories.size === 0) return
    setIsDeleting(true)
    
    try {
      // Delete categories one by one
      for (const id of selectedCategories) {
        await fetch(`/api/categories/${id}`, { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleteProducts: deleteAction === 'delete' })
        })
      }
      
      setSelectedCategories(new Set())
      setShowDeleteModal(false)
      setIsSelectionMode(false)
      fetchCategories()
    } catch {
      console.error('Failed to delete categories')
    } finally {
      setIsDeleting(false)
    }
  }

  const openAddModal = (parentId: string | null = null) => {
    setAddParentId(parentId)
    setNewCategoryName('')
    setNewCategoryNameCn('')
    setShowAddModal(true)
  }

  const createCategory = async () => {
    if (!newCategoryName.trim()) return
    setCreating(true)
    
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameEn: newCategoryName,
          nameCn: newCategoryNameCn || null,
          parentId: addParentId,
        }),
      })
      
      if (res.ok) {
        fetchCategories()
        setShowAddModal(false)
        // Expand parent to show new category
        if (addParentId) {
          setExpandedIds(prev => new Set(prev).add(addParentId))
        }
      }
    } catch {
      console.error('Failed to create category')
    } finally {
      setCreating(false)
    }
  }

  const getParentName = (parentId: string | null) => {
    if (!parentId) return null
    const parent = categories.find(c => c.id === parentId)
    return parent?.nameEn
  }

  // Render category row
  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedIds.has(category.id)
    const isEditing = editingId === category.id
    const isSelected = selectedCategories.has(category.id)

    return (
      <div key={category.id}>
        <div 
          className={`group flex items-center gap-2 px-4 py-3 hover:bg-[#f5f5f7]/50 transition-colors border-b border-[#d2d2d7]/20 ${
            isSelected ? 'bg-[#0071e3]/5' : ''
          }`}
          style={{ paddingLeft: `${16 + level * 24}px` }}
        >
          {/* Selection Checkbox */}
          {isSelectionMode && (
            <button
              onClick={() => toggleSelection(category.id)}
              className="flex-shrink-0"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-[#0071e3]" />
              ) : (
                <Square className="w-5 h-5 text-[#86868b] hover:text-[#0071e3]" />
              )}
            </button>
          )}
          
          {/* Expand Toggle */}
          <button
            onClick={() => toggleExpand(category.id)}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
              hasChildren ? 'hover:bg-[#e8e8ed]' : 'invisible'
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[#86868b]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#86868b]" />
            )}
          </button>
          
          {/* Icon */}
          {isExpanded && hasChildren ? (
            <FolderOpen className="w-5 h-5 text-[#0071e3]" />
          ) : (
            <Folder className={`w-5 h-5 ${hasChildren ? 'text-[#0071e3]' : 'text-[#86868b]'}`} />
          )}
          
          {/* Name */}
          {isEditing ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                className="flex-1 h-8 px-3 bg-white border border-[#0071e3] rounded-lg text-[14px] focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit(category.id)
                  if (e.key === 'Escape') cancelEdit()
                }}
              />
              <button
                onClick={() => saveEdit(category.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0071e3] text-white"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={cancelEdit}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f7]"
              >
                <X className="w-4 h-4 text-[#86868b]" />
              </button>
            </div>
          ) : (
            <>
              <span 
                className="flex-1 text-[14px] text-[#1d1d1f] font-medium cursor-pointer"
                onClick={() => isSelectionMode && toggleSelection(category.id)}
              >
                {category.nameEn}
                {category.nameCn && (
                  <span className="text-[#86868b] font-normal ml-2">{category.nameCn}</span>
                )}
              </span>
              
              {/* Product Count */}
              <span className="text-[12px] text-[#86868b] px-2 py-1 bg-[#f5f5f7] rounded-md">
                {category._count.products} product{category._count.products !== 1 ? 's' : ''}
              </span>
              
              {/* Actions */}
              {!isSelectionMode && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openAddModal(category.id)}
                    title="Add subcategory"
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f7] transition-colors"
                  >
                    <Plus className="w-4 h-4 text-[#86868b]" />
                  </button>
                  <button
                    onClick={() => startEdit(category)}
                    title="Rename"
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f7] transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-[#86868b]" />
                  </button>
                  <button
                    onClick={() => openMoveModal(category)}
                    title="Move to..."
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#0071e3]/10 transition-colors"
                  >
                    <Move className="w-4 h-4 text-[#0071e3]" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategories(new Set([category.id]))
                      setShowDeleteModal(true)
                    }}
                    title="Delete"
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#ff3b30]/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-[#ff3b30]" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <Link href="/settings" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-2">
            <ChevronLeft className="w-4 h-4" />
            Settings
          </Link>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f]">Product Categories</h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            Organize your products into categories and subcategories
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {categories.length > 0 && (
            <button
              onClick={toggleSelectionMode}
              className={`inline-flex items-center gap-2 text-[13px] font-medium px-4 h-10 rounded-xl transition-colors ${
                isSelectionMode
                  ? 'bg-[#ff3b30]/10 border border-[#ff3b30]/30 text-[#ff3b30] hover:bg-[#ff3b30]/20'
                  : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
              }`}
            >
              {isSelectionMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
              {isSelectionMode ? 'Cancel' : 'Select'}
            </button>
          )}
          <button
            onClick={() => openAddModal(null)}
            className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-4 h-10 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Selection Action Bar - Visible when categories are selected */}
      {isSelectionMode && (
        <div className="bg-[#1d1d1f] text-white rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={selectedCategories.size === categories.length ? deselectAll : selectAll}
              className="text-[13px] font-medium hover:text-[#0071e3] transition-colors"
            >
              {selectedCategories.size === categories.length ? 'Deselect All' : `Select All (${categories.length})`}
            </button>
            <span className="text-[13px]">
              <span className="font-semibold">{selectedCategories.size}</span> categor{selectedCategories.size !== 1 ? 'ies' : 'y'} selected
            </span>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={selectedCategories.size === 0}
            className="inline-flex items-center gap-2 bg-[#ff3b30] hover:bg-[#ff453a] text-white text-[13px] font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected ({selectedCategories.size})
          </button>
        </div>
      )}

      {/* Categories Tree */}
      {categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-12 text-center">
          <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Folder className="w-8 h-8 text-[#86868b]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">No categories yet</h3>
          <p className="text-[14px] text-[#86868b] mb-6">
            Create categories to organize your products.
          </p>
          <button
            onClick={() => openAddModal(null)}
            className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-5 h-10 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#d2d2d7]/30 bg-[#f5f5f7]/50">
            <p className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide">
              {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
          
          {/* Tree */}
          <div className="divide-y divide-[#d2d2d7]/20">
            {categoryTree.map(category => renderCategory(category))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-6 bg-[#f5f5f7] rounded-2xl p-5">
        <h3 className="text-[14px] font-semibold text-[#1d1d1f] mb-2">Tips</h3>
        <ul className="text-[13px] text-[#86868b] space-y-1">
          <li>• Click the + button on a category to add a subcategory</li>
          <li>• Hover over a category to see edit and delete options</li>
          <li>• Products can be assigned to any category or subcategory</li>
          <li>• Deleting a category will not delete products (they become uncategorized)</li>
        </ul>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <Portal>
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            style={{ zIndex: 100000 }}
            onClick={() => setShowAddModal(false)}
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
            style={{ zIndex: 100001 }}
          >
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">
              {addParentId ? 'New Subcategory' : 'New Category'}
            </h2>
            {addParentId && (
              <p className="text-[13px] text-[#86868b] mb-4">
                Under: {getParentName(addParentId)}
              </p>
            )}
            
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Name *
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Electronics, Accessories"
                  autoFocus
                  className="w-full h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Local Name
                </label>
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
                    value={newCategoryNameCn}
                    onChange={(e) => setNewCategoryNameCn(e.target.value)}
                    placeholder="Optional"
                    className="flex-1 h-11 px-4 bg-[#f5f5f7] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 h-10 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createCategory}
                disabled={!newCategoryName.trim() || creating}
                className="flex-1 h-10 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors disabled:bg-[#86868b]"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Portal>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex: 100000 }}
            onClick={() => setShowDeleteModal(false)}
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
            style={{ zIndex: 100001 }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-[#ff3b30]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-[#ff3b30]" />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                  Delete {selectedCategories.size} categor{selectedCategories.size !== 1 ? 'ies' : 'y'}?
                </h2>
                <p className="text-[13px] text-[#86868b] mt-1">
                  {getSelectedProductsCount()} product{getSelectedProductsCount() !== 1 ? 's' : ''} total in these categories.
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-[#d2d2d7]/50 cursor-pointer hover:bg-[#f5f5f7] transition-colors">
                <input
                  type="radio"
                  name="deleteAction"
                  checked={deleteAction === 'keep'}
                  onChange={() => setDeleteAction('keep')}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-[14px] font-medium text-[#1d1d1f]">Keep products (recommended)</p>
                  <p className="text-[12px] text-[#86868b]">Products will be moved to &quot;Uncategorized&quot;</p>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 rounded-xl border border-[#ff3b30]/30 cursor-pointer hover:bg-[#ff3b30]/5 transition-colors">
                <input
                  type="radio"
                  name="deleteAction"
                  checked={deleteAction === 'delete'}
                  onChange={() => setDeleteAction('delete')}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-[14px] font-medium text-[#ff3b30]">Delete all products</p>
                  <p className="text-[12px] text-[#86868b]">This action cannot be undone</p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteAction('keep')
                }}
                className="flex-1 h-10 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className={`flex-1 h-10 text-white text-[14px] font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
                  deleteAction === 'delete' 
                    ? 'bg-[#ff3b30] hover:bg-[#ff453a]' 
                    : 'bg-[#0071e3] hover:bg-[#0077ed]'
                } disabled:opacity-50`}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : deleteAction === 'delete' ? (
                  'Delete all'
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* Move Category Modal */}
      {showMoveModal && categoryToMove && (
        <Portal>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex: 100000 }}
            onClick={() => setShowMoveModal(false)}
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
            style={{ zIndex: 100001 }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-[#0071e3]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Move className="w-6 h-6 text-[#0071e3]" />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                  Move &quot;{categoryToMove.nameEn}&quot;
                </h2>
                <p className="text-[13px] text-[#86868b] mt-1">
                  Select a parent category or choose &quot;Root&quot; to make it a top-level category.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-[13px] font-medium text-[#86868b] mb-2">
                Move to
              </label>
              <select
                value={targetParentId}
                onChange={(e) => setTargetParentId(e.target.value)}
                className="w-full h-10 px-3 bg-[#f5f5f7] rounded-xl border-none text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="">Root (top-level category)</option>
                {getValidMoveTargets(categoryToMove.id)
                  .sort((a, b) => getCategoryPath(a).localeCompare(getCategoryPath(b)))
                  .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {getCategoryPath(cat)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMoveModal(false)}
                className="flex-1 h-10 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveCategory}
                disabled={isMoving}
                className="flex-1 h-10 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isMoving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Moving...
                  </>
                ) : (
                  'Move'
                )}
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
