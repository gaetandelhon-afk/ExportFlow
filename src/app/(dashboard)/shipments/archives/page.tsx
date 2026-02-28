'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { 
  Ship, ArrowLeft, Search, Filter, Package, 
  Loader2, MoreHorizontal, Eye, Plane, Train, Truck, Factory,
  FolderOpen, Globe, Users, Building2, RotateCcw, ChevronDown, ChevronRight
} from 'lucide-react'
import { useLocalization } from '@/hooks/useLocalization'

interface Customer {
  id: string
  name: string
  country: string | null
  city: string | null
}

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerId: string
  customerCountry: string | null
  totalAmount: number
  status: string
}

type TransportMethod = 'SEA_FREIGHT' | 'AIR_FREIGHT' | 'RAIL_FREIGHT' | 'ROAD_FREIGHT' | 'EXPRESS_COURIER' | 'FACTORY_PICKUP' | 'OTHER'

interface Shipment {
  id: string
  shipmentNumber: string
  name: string | null
  status: string
  transportMethod: TransportMethod
  carrierName: string | null
  originLocation: string | null
  destinationLocation: string | null
  archivedAt: string | null
  orders: Order[]
  customers: Customer[]
  createdAt: string
}

type GroupBy = 'none' | 'client' | 'country' | 'continent'

const transportMethodConfig: Record<TransportMethod, { 
  label: string
  shortLabel: string
  icon: typeof Ship
  color: string
}> = {
  SEA_FREIGHT: { label: 'Sea Freight', shortLabel: 'Sea', icon: Ship, color: '#0071e3' },
  AIR_FREIGHT: { label: 'Air Freight', shortLabel: 'Air', icon: Plane, color: '#5856d6' },
  RAIL_FREIGHT: { label: 'Rail Freight', shortLabel: 'Rail', icon: Train, color: '#ff9500' },
  ROAD_FREIGHT: { label: 'Road Freight', shortLabel: 'Road', icon: Truck, color: '#34c759' },
  EXPRESS_COURIER: { label: 'Express Courier', shortLabel: 'Express', icon: Package, color: '#ff3b30' },
  FACTORY_PICKUP: { label: 'Factory Pickup', shortLabel: 'Pickup', icon: Factory, color: '#86868b' },
  OTHER: { label: 'Other', shortLabel: 'Other', icon: MoreHorizontal, color: '#1d1d1f' },
}

const countryToContinent: Record<string, string> = {
  'China': 'Asia', 'Japan': 'Asia', 'South Korea': 'Asia', 'India': 'Asia', 'Vietnam': 'Asia',
  'Thailand': 'Asia', 'Indonesia': 'Asia', 'Malaysia': 'Asia', 'Singapore': 'Asia', 'Taiwan': 'Asia',
  'Philippines': 'Asia', 'Bangladesh': 'Asia', 'Pakistan': 'Asia', 'Hong Kong': 'Asia',
  'United States': 'North America', 'USA': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
  'Brazil': 'South America', 'Argentina': 'South America', 'Chile': 'South America', 'Colombia': 'South America',
  'France': 'Europe', 'Germany': 'Europe', 'UK': 'Europe', 'United Kingdom': 'Europe', 'Italy': 'Europe',
  'Spain': 'Europe', 'Netherlands': 'Europe', 'Belgium': 'Europe', 'Poland': 'Europe', 'Switzerland': 'Europe',
  'Sweden': 'Europe', 'Norway': 'Europe', 'Denmark': 'Europe', 'Finland': 'Europe', 'Austria': 'Europe',
  'Portugal': 'Europe', 'Greece': 'Europe', 'Czech Republic': 'Europe', 'Romania': 'Europe', 'Hungary': 'Europe',
  'Australia': 'Oceania', 'New Zealand': 'Oceania',
  'South Africa': 'Africa', 'Nigeria': 'Africa', 'Egypt': 'Africa', 'Kenya': 'Africa', 'Morocco': 'Africa',
  'UAE': 'Middle East', 'Saudi Arabia': 'Middle East', 'Israel': 'Middle East', 'Turkey': 'Middle East', 'Qatar': 'Middle East',
}

function getContinent(country: string | null): string {
  if (!country) return 'Unknown'
  return countryToContinent[country] || 'Other'
}

export default function ShipmentArchivesPage() {
  const { currencySymbol, isLoaded } = useLocalization()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('client')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [unarchiving, setUnarchiving] = useState<string | null>(null)

  useEffect(() => {
    fetchArchivedShipments()
  }, [])

  const fetchArchivedShipments = async () => {
    try {
      const res = await fetch('/api/shipments?archived=true')
      if (res.ok) {
        const data = await res.json()
        setShipments(data.shipments || [])
        const groups = new Set<string>((data.shipments || []).map((s: Shipment) => getGroupKey(s, groupBy)))
        setExpandedGroups(groups)
      }
    } catch (error) {
      console.error('Failed to fetch archived shipments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGroupKey = (shipment: Shipment, by: GroupBy): string => {
    if (by === 'none') return 'all'
    if (by === 'client') {
      return shipment.customers.map(c => c.name).sort().join(', ') || 'No Customer'
    }
    if (by === 'country') {
      const countries = new Set(shipment.customers.map(c => c.country || 'Unknown'))
      return Array.from(countries).sort().join(', ')
    }
    if (by === 'continent') {
      const continents = new Set(shipment.customers.map(c => getContinent(c.country)))
      return Array.from(continents).sort().join(', ')
    }
    return 'all'
  }

  const handleUnarchive = async (shipmentId: string) => {
    setUnarchiving(shipmentId)
    try {
      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivedAt: null })
      })
      if (res.ok) {
        setShipments(prev => prev.filter(s => s.id !== shipmentId))
      }
    } catch (error) {
      console.error('Failed to unarchive shipment:', error)
    } finally {
      setUnarchiving(null)
    }
  }

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  const filteredShipments = useMemo(() => {
    if (!searchQuery) return shipments
    const q = searchQuery.toLowerCase()
    return shipments.filter(s => 
      s.shipmentNumber.toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q) ||
      s.customers.some(c => c.name.toLowerCase().includes(q)) ||
      s.orders.some(o => o.orderNumber.toLowerCase().includes(q))
    )
  }, [shipments, searchQuery])

  const groupedShipments = useMemo(() => {
    const groups: Record<string, Shipment[]> = {}
    filteredShipments.forEach(shipment => {
      const key = getGroupKey(shipment, groupBy)
      if (!groups[key]) groups[key] = []
      groups[key].push(shipment)
    })
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredShipments, groupBy])

  const getTotalAmount = (orders: Order[]) => {
    return orders.reduce((sum, order) => sum + order.totalAmount, 0)
  }

  const groupByOptions: { value: GroupBy; label: string; icon: typeof FolderOpen }[] = [
    { value: 'none', label: 'No grouping', icon: FolderOpen },
    { value: 'client', label: 'By Client', icon: Users },
    { value: 'country', label: 'By Country', icon: Building2 },
    { value: 'continent', label: 'By Continent', icon: Globe },
  ]

  if (!isLoaded || loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/shipments"
            className="p-2 hover:bg-[#f5f5f7] rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#86868b]" />
          </Link>
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Shipment Archives</h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              {shipments.length} archived shipment{shipments.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              placeholder="Search archives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#f5f5f7] border-0 rounded-xl text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#86868b]">Group by:</span>
            <div className="flex bg-[#f5f5f7] rounded-xl p-1">
              {groupByOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setGroupBy(option.value)}
                  className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-medium transition-colors ${
                    groupBy === option.value 
                      ? 'bg-white text-[#1d1d1f] shadow-sm' 
                      : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                >
                  <option.icon className="w-3.5 h-3.5" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Archives List */}
      {filteredShipments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-12 text-center">
          <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-[#86868b]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">No archived shipments</h3>
          <p className="text-[14px] text-[#86868b] mb-6">
            Delivered shipments will appear here when archived.
          </p>
          <Link
            href="/shipments"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-[#0071e3] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shipments
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedShipments.map(([groupKey, groupShipments]) => {
            const isExpanded = expandedGroups.has(groupKey)
            const totalValue = groupShipments.reduce((sum, s) => sum + getTotalAmount(s.orders), 0)
            
            return (
              <div key={groupKey} className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
                {/* Group Header */}
                {groupBy !== 'none' && (
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#f5f5f7]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-[#86868b]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-[#86868b]" />
                      )}
                      <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
                        {groupBy === 'client' && <Users className="w-5 h-5 text-[#0071e3]" />}
                        {groupBy === 'country' && <Building2 className="w-5 h-5 text-[#0071e3]" />}
                        {groupBy === 'continent' && <Globe className="w-5 h-5 text-[#0071e3]" />}
                      </div>
                      <div className="text-left">
                        <p className="text-[15px] font-semibold text-[#1d1d1f]">{groupKey}</p>
                        <p className="text-[13px] text-[#86868b]">
                          {groupShipments.length} shipment{groupShipments.length !== 1 ? 's' : ''} • {currencySymbol}{totalValue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                )}

                {/* Shipments in group */}
                {(groupBy === 'none' || isExpanded) && (
                  <div className={groupBy !== 'none' ? 'border-t border-[#d2d2d7]/30' : ''}>
                    {groupShipments.map((shipment, idx) => {
                      const methodConfig = transportMethodConfig[shipment.transportMethod] || transportMethodConfig.SEA_FREIGHT
                      const MethodIcon = methodConfig.icon
                      const totalAmount = getTotalAmount(shipment.orders)
                      
                      return (
                        <div 
                          key={shipment.id}
                          className={`p-6 ${idx > 0 ? 'border-t border-[#d2d2d7]/30' : ''}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div 
                                className="w-12 h-12 rounded-xl flex items-center justify-center" 
                                style={{ backgroundColor: `${methodConfig.color}15` }}
                              >
                                <MethodIcon className="w-6 h-6" style={{ color: methodConfig.color }} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <Link 
                                    href={`/shipments/${shipment.id}`}
                                    className="text-[17px] font-semibold text-[#1d1d1f] hover:text-[#0071e3]"
                                  >
                                    {shipment.shipmentNumber}
                                  </Link>
                                  <span 
                                    className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: `${methodConfig.color}15`, color: methodConfig.color }}
                                  >
                                    {methodConfig.shortLabel}
                                  </span>
                                </div>
                                {shipment.name && (
                                  <p className="text-[14px] text-[#86868b]">{shipment.name}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-[13px] text-[#86868b]">
                                  <span>{shipment.orders.length} order{shipment.orders.length !== 1 ? 's' : ''}</span>
                                  <span>•</span>
                                  <span>{currencySymbol}{totalAmount.toLocaleString()}</span>
                                  {shipment.archivedAt && (
                                    <>
                                      <span>•</span>
                                      <span>Archived {new Date(shipment.archivedAt).toLocaleDateString()}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/shipments/${shipment.id}`}
                                className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                                title="View details"
                              >
                                <Eye className="w-4 h-4 text-[#86868b]" />
                              </Link>
                              <button
                                onClick={() => handleUnarchive(shipment.id)}
                                disabled={unarchiving === shipment.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#0071e3] hover:bg-[#0071e3]/5 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <RotateCcw className="w-4 h-4" />
                                {unarchiving === shipment.id ? 'Restoring...' : 'Restore'}
                              </button>
                            </div>
                          </div>

                          {/* Route info */}
                          {(shipment.originLocation || shipment.destinationLocation) && (
                            <div className="mt-3 ml-16 text-[13px] text-[#86868b]">
                              {shipment.originLocation} → {shipment.destinationLocation}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
