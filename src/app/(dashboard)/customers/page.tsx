'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Users, Plus, Search, Mail, Phone, Building2, ChevronRight,
  MapPin, Globe, FileText, Tag, Filter, Grid3X3, List, Upload,
  Trash2, CheckSquare, Square, X, Loader2, AlertTriangle, Folder, FolderPlus
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import Portal from '@/components/Portal'

interface CustomerCategory {
  id: string
  nameEn: string
  parentId: string | null
  parent?: { id: string; nameEn: string } | null
  children?: { id: string; nameEn: string }[]
  isParent: boolean
  hasChildren: boolean
  _count: { customers: number }
}

interface Customer {
  id: string
  companyName: string
  legalName: string | null
  contactName: string | null
  email: string | null
  phone: string | null
  country: string | null
  vatNumber: string | null
  priceType: string | null
  currency: string | null
  categoryId: string | null
  category: { id: string; nameEn: string; parentId: string | null; parent?: { id: string; nameEn: string } | null } | null
  _count: { orders: number }
  totalSpent?: number
}

type ViewMode = 'grid' | 'list'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categories, setCategories] = useState<CustomerCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  
  // Selection state
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ deleted: number; deactivated: number; message?: string } | null>(null)
  
  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryParent, setNewCategoryParent] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  
  // Move to category state
  const [showMoveToCategoryModal, setShowMoveToCategoryModal] = useState(false)
  const [selectedMoveCategory, setSelectedMoveCategory] = useState<string>('')
  const [isMovingCustomers, setIsMovingCustomers] = useState(false)

  useEffect(() => {
    fetchData()
    
    // Load view mode
    const saved = localStorage.getItem('admin_customers_view')
    if (saved === 'list' || saved === 'grid') {
      setViewMode(saved)
    }
  }, [])

  const fetchData = async () => {
    try {
      const [customersRes, categoriesRes] = await Promise.all([
        fetch('/api/customers/list'),
        fetch('/api/customer-categories')
      ])
      
      if (customersRes.ok) {
        const data = await customersRes.json()
        setCustomers(data.customers || [])
      }
      
      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.categories || [])
      }
    } catch {
      console.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('admin_customers_view', mode)
  }

  // Selection handlers
  const toggleCustomerSelection = (customerId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setSelectedCustomers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(customerId)) {
        newSet.delete(customerId)
      } else {
        newSet.add(customerId)
      }
      return newSet
    })
  }

  const selectAll = () => {
    const allIds = new Set(filteredCustomers.map(c => c.id))
    setSelectedCustomers(allIds)
  }

  const deselectAll = () => {
    setSelectedCustomers(new Set())
  }

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    if (isSelectionMode) {
      setSelectedCustomers(new Set())
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedCustomers.size === 0) return
    setIsDeleting(true)
    setDeleteResult(null)
    
    try {
      const customerIds = Array.from(selectedCustomers)
      
      const res = await fetch('/api/customers/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds }),
      })

      const data = await res.json()

      if (res.ok) {
        setDeleteResult({
          deleted: data.deleted || 0,
          deactivated: data.deactivated || 0,
          message: data.message,
        })
        
        setSelectedCustomers(new Set())
        setIsSelectionMode(false)
        await fetchData()
        
        if (!data.message) {
          setTimeout(() => {
            setShowDeleteConfirm(false)
            setDeleteResult(null)
          }, 1500)
        }
      } else {
        setDeleteResult({
          deleted: 0,
          deactivated: 0,
          message: data.error || 'Failed to delete customers',
        })
      }
    } catch (error) {
      console.error('Failed to delete customers:', error)
      setDeleteResult({
        deleted: 0,
        deactivated: 0,
        message: 'An error occurred while deleting customers',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Category handlers
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    setCreatingCategory(true)
    
    try {
      const res = await fetch('/api/customer-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nameEn: newCategoryName,
          parentId: newCategoryParent || null
        }),
      })

      if (res.ok) {
        setNewCategoryName('')
        setNewCategoryParent('')
        setShowCategoryModal(false)
        fetchData()
      }
    } catch {
      console.error('Failed to create category')
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleMoveToCategory = async () => {
    if (selectedCustomers.size === 0) return
    setIsMovingCustomers(true)
    
    try {
      const customerIds = Array.from(selectedCustomers)
      
      // Update each customer's category
      for (const customerId of customerIds) {
        await fetch(`/api/customers/${customerId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryId: selectedMoveCategory || null }),
        })
      }
      
      setSelectedCustomers(new Set())
      setShowMoveToCategoryModal(false)
      setSelectedMoveCategory('')
      setIsSelectionMode(false)
      await fetchData()
    } catch {
      console.error('Failed to move customers')
    } finally {
      setIsMovingCustomers(false)
    }
  }

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchQuery || 
      customer.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.country?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = !filterType || customer.priceType === filterType
    
    const matchesCategory = !filterCategory || 
      (filterCategory === 'uncategorized' && !customer.categoryId) ||
      customer.categoryId === filterCategory ||
      customer.category?.parentId === filterCategory
    
    return matchesSearch && matchesType && matchesCategory
  })

  // Get unique price types
  const priceTypes = [...new Set(customers.map(c => c.priceType).filter(Boolean))]

  // Get selected customers' order count
  const getSelectedOrdersCount = () => {
    return customers
      .filter(c => selectedCustomers.has(c.id))
      .reduce((sum, c) => sum + c._count.orders, 0)
  }

  // Get parent categories for dropdown
  const parentCategories = categories.filter(c => c.isParent || !c.parentId)

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#e8e8ed] rounded w-48" />
          <div className="h-10 bg-[#e8e8ed] rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-48 bg-[#e8e8ed] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Customers</h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            {customers.length} customer{customers.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectionMode}
            className={`inline-flex items-center gap-2 text-[13px] font-medium px-4 h-10 rounded-xl transition-colors ${
              isSelectionMode 
                ? 'bg-[#1d1d1f] text-white' 
                : 'bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f]'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Select
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="inline-flex items-center gap-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[13px] font-medium px-4 h-10 rounded-xl transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            New Category
          </button>
          <Link
            href="/import/customers"
            className="inline-flex items-center gap-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[13px] font-medium px-4 h-10 rounded-xl transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </Link>
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-4 h-10 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </Link>
        </div>
      </div>

      {/* Selection Bar */}
      {isSelectionMode && (
        <div className="bg-[#1d1d1f] text-white rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={selectedCustomers.size === filteredCustomers.length ? deselectAll : selectAll}
              className="text-[13px] font-medium hover:text-[#0071e3] transition-colors"
            >
              {selectedCustomers.size === filteredCustomers.length ? 'Deselect All' : `Select All (${filteredCustomers.length})`}
            </button>
            <span className="text-[13px]">
              <span className="font-semibold">{selectedCustomers.size}</span> customer{selectedCustomers.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMoveToCategoryModal(true)}
              disabled={selectedCustomers.size === 0}
              className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Folder className="w-4 h-4" />
              Move to Category
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedCustomers.size === 0}
              className="inline-flex items-center gap-2 bg-[#ff3b30] hover:bg-[#ff453a] text-white text-[13px] font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
            <button
              onClick={toggleSelectionMode}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, country..."
              className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
          
          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="relative">
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-10 pl-4 pr-10 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] appearance-none cursor-pointer min-w-[150px]"
              >
                <option value="">All Categories</option>
                <option value="uncategorized">Uncategorized</option>
                {parentCategories.map(cat => (
                  <optgroup key={cat.id} label={cat.nameEn}>
                    <option value={cat.id}>{cat.nameEn}</option>
                    {categories.filter(c => c.parentId === cat.id).map(subcat => (
                      <option key={subcat.id} value={subcat.id}>└ {subcat.nameEn}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <Folder className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] pointer-events-none" />
            </div>
          )}
          
          {/* Type Filter */}
          {priceTypes.length > 0 && (
            <div className="relative">
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-10 pl-4 pr-10 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] appearance-none cursor-pointer min-w-[150px]"
              >
                <option value="">All Types</option>
                {priceTypes.map(type => (
                  <option key={type} value={type!}>{type}</option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] pointer-events-none" />
            </div>
          )}

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-[#f5f5f7] rounded-xl p-1">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
              }`}
            >
              <Grid3X3 className={`w-4 h-4 ${viewMode === 'grid' ? 'text-[#1d1d1f]' : 'text-[#86868b]'}`} />
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
              }`}
            >
              <List className={`w-4 h-4 ${viewMode === 'list' ? 'text-[#1d1d1f]' : 'text-[#86868b]'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Categories Bar */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilterCategory('')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              filterCategory === '' 
                ? 'bg-[#1d1d1f] text-white' 
                : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
            }`}
          >
            All ({customers.length})
          </button>
          {parentCategories.map(cat => {
            const count = customers.filter(c => 
              c.categoryId === cat.id || c.category?.parentId === cat.id
            ).length
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                  filterCategory === cat.id 
                    ? 'bg-[#0071e3] text-white' 
                    : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                }`}
              >
                {cat.nameEn} ({count})
              </button>
            )
          })}
          <button
            onClick={() => setFilterCategory('uncategorized')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              filterCategory === 'uncategorized' 
                ? 'bg-[#86868b] text-white' 
                : 'bg-[#f5f5f7] text-[#86868b] hover:bg-[#e8e8ed]'
            }`}
          >
            Uncategorized ({customers.filter(c => !c.categoryId).length})
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#d2d2d7]/30 p-4">
          <p className="text-[12px] text-[#86868b] uppercase tracking-wide">Total Customers</p>
          <p className="text-[24px] font-semibold text-[#1d1d1f] mt-1">{customers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#d2d2d7]/30 p-4">
          <p className="text-[12px] text-[#86868b] uppercase tracking-wide">With Orders</p>
          <p className="text-[24px] font-semibold text-[#0071e3] mt-1">
            {customers.filter(c => c._count.orders > 0).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#d2d2d7]/30 p-4">
          <p className="text-[12px] text-[#86868b] uppercase tracking-wide">Categories</p>
          <p className="text-[24px] font-semibold text-[#34c759] mt-1">
            {categories.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#d2d2d7]/30 p-4">
          <p className="text-[12px] text-[#86868b] uppercase tracking-wide">Total Orders</p>
          <p className="text-[24px] font-semibold text-[#ff9500] mt-1">
            {customers.reduce((sum, c) => sum + c._count.orders, 0)}
          </p>
        </div>
      </div>

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-12 text-center">
          <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[#86868b]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
            {searchQuery || filterType || filterCategory ? 'No customers found' : 'No customers yet'}
          </h3>
          <p className="text-[14px] text-[#86868b] mb-6">
            {searchQuery || filterType || filterCategory 
              ? 'Try adjusting your search or filters' 
              : 'Add your first customer to get started.'}
          </p>
          {!searchQuery && !filterType && !filterCategory && (
            <Link
              href="/customers/new"
              className="inline-flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium px-5 h-10 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </Link>
          )}
        </div>
      ) : viewMode === 'list' ? (
        // List View
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#d2d2d7]/30 bg-[#f5f5f7]/50">
                {isSelectionMode && (
                  <th className="w-12 px-4 py-3">
                    <button
                      onClick={() => {
                        if (selectedCustomers.size === filteredCustomers.length) {
                          deselectAll()
                        } else {
                          selectAll()
                        }
                      }}
                      className="w-5 h-5 flex items-center justify-center"
                    >
                      {selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0 ? (
                        <CheckSquare className="w-5 h-5 text-[#0071e3]" />
                      ) : (
                        <Square className="w-5 h-5 text-[#86868b]" />
                      )}
                    </button>
                  </th>
                )}
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-6 py-3">Company</th>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-6 py-3">Category</th>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-6 py-3">Contact</th>
                <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-6 py-3">Country</th>
                <th className="text-right text-[12px] font-medium text-[#86868b] uppercase tracking-wide px-6 py-3">Orders</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr 
                  key={customer.id} 
                  className={`border-b border-[#d2d2d7]/30 last:border-0 hover:bg-[#f5f5f7]/50 transition-colors ${
                    selectedCustomers.has(customer.id) ? 'bg-[#0071e3]/5' : ''
                  }`}
                  onClick={isSelectionMode ? (e) => toggleCustomerSelection(customer.id, e) : undefined}
                >
                  {isSelectionMode && (
                    <td className="px-4 py-4">
                      <button
                        onClick={(e) => toggleCustomerSelection(customer.id, e)}
                        className="w-5 h-5 flex items-center justify-center"
                      >
                        {selectedCustomers.has(customer.id) ? (
                          <CheckSquare className="w-5 h-5 text-[#0071e3]" />
                        ) : (
                          <Square className="w-5 h-5 text-[#86868b]" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <Link href={`/customers/${customer.id}`} className="block" onClick={(e) => isSelectionMode && e.preventDefault()}>
                      <p className="text-[14px] font-medium text-[#0071e3] hover:text-[#0077ed]">
                        {customer.companyName}
                      </p>
                      {customer.legalName && customer.legalName !== customer.companyName && (
                        <p className="text-[12px] text-[#86868b]">{customer.legalName}</p>
                      )}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    {customer.category ? (
                      <span className="text-[12px] font-medium px-2 py-1 bg-[#0071e3]/10 text-[#0071e3] rounded-md">
                        {customer.category.parent ? `${customer.category.parent.nameEn} → ` : ''}{customer.category.nameEn}
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#86868b]">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[14px] text-[#1d1d1f]">{customer.contactName || '—'}</p>
                    <p className="text-[12px] text-[#86868b]">{customer.email || ''}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-[14px] text-[#1d1d1f]">
                      {customer.country && <Globe className="w-3.5 h-3.5 text-[#86868b]" />}
                      {customer.country || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-[14px] font-medium text-[#1d1d1f]">{customer._count.orders}</p>
                  </td>
                  <td className="px-3 py-4">
                    {!isSelectionMode && (
                      <Link href={`/customers/${customer.id}`}>
                        <ChevronRight className="w-5 h-5 text-[#d2d2d7]" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className={`bg-white rounded-2xl border p-5 transition-all duration-300 group relative ${
                selectedCustomers.has(customer.id) 
                  ? 'border-[#0071e3] bg-[#0071e3]/5' 
                  : 'border-[#d2d2d7]/30 hover:border-[#0071e3]/40 hover:shadow-lg'
              }`}
              onClick={isSelectionMode ? (e) => toggleCustomerSelection(customer.id, e) : undefined}
            >
              {isSelectionMode && (
                <button
                  onClick={(e) => toggleCustomerSelection(customer.id, e)}
                  className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center"
                >
                  {selectedCustomers.has(customer.id) ? (
                    <CheckSquare className="w-5 h-5 text-[#0071e3]" />
                  ) : (
                    <Square className="w-5 h-5 text-[#86868b]" />
                  )}
                </button>
              )}
              
              <Link
                href={`/customers/${customer.id}`}
                className={isSelectionMode ? 'pointer-events-none' : ''}
                onClick={(e) => isSelectionMode && e.preventDefault()}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#0071e3] to-[#00c7be] rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-[16px] font-semibold text-white">
                      {customer.companyName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-6">
                    <h3 className="text-[15px] font-medium text-[#1d1d1f] truncate group-hover:text-[#0071e3] transition-colors">
                      {customer.companyName}
                    </h3>
                    {customer.category && (
                      <p className="text-[12px] text-[#0071e3] truncate">
                        {customer.category.parent ? `${customer.category.parent.nameEn} → ` : ''}{customer.category.nameEn}
                      </p>
                    )}
                    {customer.contactName && !customer.category && (
                      <p className="text-[13px] text-[#86868b] truncate">{customer.contactName}</p>
                    )}
                  </div>

                  {!isSelectionMode && (
                    <ChevronRight className="w-5 h-5 text-[#d2d2d7] group-hover:text-[#0071e3] transition-colors flex-shrink-0" />
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-[#d2d2d7]/30 space-y-2">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-[13px] text-[#86868b]">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-[13px] text-[#86868b]">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.country && (
                    <div className="flex items-center gap-2 text-[13px] text-[#86868b]">
                      <Globe className="w-3.5 h-3.5" />
                      <span>{customer.country}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[12px] text-[#86868b]">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{customer._count.orders} order{customer._count.orders !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {customer.currency && (
                      <span className="text-[11px] font-medium px-2 py-1 bg-[#f5f5f7] text-[#86868b] rounded-md">
                        {customer.currency}
                      </span>
                    )}
                    {customer.priceType && (
                      <span className={`text-[11px] font-medium px-2 py-1 rounded-md ${
                        customer.priceType === 'DISTRIBUTOR' 
                          ? 'bg-[#0071e3]/10 text-[#0071e3]' 
                          : 'bg-[#34c759]/10 text-[#34c759]'
                      }`}>
                        {customer.priceType}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              {deleteResult ? (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-[#34c759]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckSquare className="w-8 h-8 text-[#34c759]" />
                    </div>
                    <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                      {deleteResult.deleted > 0 ? `${deleteResult.deleted} customer(s) deleted` : 'Action completed'}
                    </h3>
                    {deleteResult.deactivated > 0 && (
                      <p className="text-[14px] text-[#ff9500] mt-2">
                        {deleteResult.deactivated} customer(s) with orders were deactivated instead.
                      </p>
                    )}
                    {deleteResult.message && (
                      <p className="text-[13px] text-[#86868b] mt-2">{deleteResult.message}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteResult(null)
                    }}
                    className="w-full h-11 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-[#ff3b30]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-[#ff3b30]" />
                    </div>
                    <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                      Delete {selectedCustomers.size} customer{selectedCustomers.size !== 1 ? 's' : ''}?
                    </h3>
                    <p className="text-[14px] text-[#86868b] mt-2">
                      This action cannot be undone.
                    </p>
                    {getSelectedOrdersCount() > 0 && (
                      <p className="text-[13px] text-[#ff9500] mt-2">
                        Note: Customers with orders ({getSelectedOrdersCount()} total) will be deactivated instead of deleted.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 h-11 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors"
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      disabled={isDeleting}
                      className="flex-1 h-11 bg-[#ff3b30] text-white text-[14px] font-medium rounded-xl hover:bg-[#ff453a] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Portal>
      )}

      {/* Create Category Modal */}
      {showCategoryModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">New Customer Category</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#86868b] mb-1">Category Name *</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., VIP Clients, Europe, Retail..."
                    className="w-full h-11 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-medium text-[#86868b] mb-1">Parent Category (optional)</label>
                  <select
                    value={newCategoryParent}
                    onChange={(e) => setNewCategoryParent(e.target.value)}
                    className="w-full h-11 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  >
                    <option value="">None (top-level category)</option>
                    {parentCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nameEn}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCategoryModal(false)
                    setNewCategoryName('')
                    setNewCategoryParent('')
                  }}
                  className="flex-1 h-11 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors"
                  disabled={creatingCategory}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCategory}
                  disabled={creatingCategory || !newCategoryName.trim()}
                  className="flex-1 h-11 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {creatingCategory ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-4 h-4" />
                      Create Category
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Move to Category Modal */}
      {showMoveToCategoryModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#0071e3]/10 rounded-full flex items-center justify-center">
                  <Folder className="w-6 h-6 text-[#0071e3]" />
                </div>
                <div>
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Move to Category</h2>
                  <p className="text-[14px] text-[#86868b]">{selectedCustomers.size} customer{selectedCustomers.size !== 1 ? 's' : ''} selected</p>
                </div>
              </div>
              
              <p className="text-[14px] text-[#1d1d1f] mb-4">
                Select the category where you want to move these customers:
              </p>
              
              <select
                value={selectedMoveCategory}
                onChange={(e) => setSelectedMoveCategory(e.target.value)}
                className="w-full h-12 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] mb-6"
              >
                <option value="">Uncategorized (no category)</option>
                {parentCategories.map(cat => (
                  <optgroup key={cat.id} label={cat.nameEn}>
                    <option value={cat.id}>{cat.nameEn}</option>
                    {categories.filter(subcat => subcat.parentId === cat.id).map(subcat => (
                      <option key={subcat.id} value={subcat.id}>└ {subcat.nameEn}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMoveToCategoryModal(false)
                    setSelectedMoveCategory('')
                  }}
                  disabled={isMovingCustomers}
                  className="flex-1 h-10 bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMoveToCategory}
                  disabled={isMovingCustomers}
                  className="flex-1 h-10 bg-[#0071e3] text-white text-[14px] font-medium rounded-xl hover:bg-[#0077ed] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isMovingCustomers ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Moving...
                    </>
                  ) : (
                    <>
                      <Folder className="w-4 h-4" />
                      Move {selectedCustomers.size} Customer{selectedCustomers.size !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
