'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { Ship, Plane, Train, Truck, Package, Factory, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

type TransportMethod = 'SEA_FREIGHT' | 'AIR_FREIGHT' | 'RAIL_FREIGHT' | 'ROAD_FREIGHT' | 'EXPRESS_COURIER' | 'FACTORY_PICKUP' | 'OTHER'

interface Shipment {
  id: string
  shipmentNumber: string
  name: string | null
  status: 'DRAFT' | 'PREPARING' | 'LOADING' | 'SHIPPED' | 'DELIVERED'
  transportMethod: TransportMethod
  carrierName: string | null
  originLocation: string | null
  destinationLocation: string | null
  estimatedLoadingDate: string | null
  estimatedArrivalDate: string | null
  actualLoadingDate?: string | null
  actualArrivalDate?: string | null
  orders: { id: string; orderNumber: string; customerName: string }[]
}

const transportMethodConfig: Record<TransportMethod, { 
  icon: typeof Ship
  color: string
}> = {
  SEA_FREIGHT: { icon: Ship, color: '#0071e3' },
  AIR_FREIGHT: { icon: Plane, color: '#5856d6' },
  RAIL_FREIGHT: { icon: Train, color: '#ff9500' },
  ROAD_FREIGHT: { icon: Truck, color: '#34c759' },
  EXPRESS_COURIER: { icon: Package, color: '#ff3b30' },
  FACTORY_PICKUP: { icon: Factory, color: '#86868b' },
  OTHER: { icon: MoreHorizontal, color: '#1d1d1f' },
}

const statusColors: Record<string, string> = {
  DRAFT: '#86868b',
  PREPARING: '#ff9500',
  LOADING: '#5856d6',
  SHIPPED: '#0071e3',
  DELIVERED: '#34c759',
}

interface ShipmentGanttProps {
  shipments: Shipment[]
}

export default function ShipmentGantt({ shipments }: ShipmentGanttProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewOffset, setViewOffset] = useState(0)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { minDate, maxDate, dateRange, dayWidth } = useMemo(() => {
    let min = new Date()
    let max = new Date()
    min.setHours(0, 0, 0, 0)
    max.setHours(0, 0, 0, 0)
    
    shipments.forEach(s => {
      const loadDate = s.estimatedLoadingDate ? new Date(s.estimatedLoadingDate) : null
      const arrivalDate = s.estimatedArrivalDate ? new Date(s.estimatedArrivalDate) : null
      
      if (loadDate) {
        loadDate.setHours(0, 0, 0, 0)
        if (loadDate < min) min = new Date(loadDate)
        if (loadDate > max) max = new Date(loadDate)
      }
      if (arrivalDate) {
        arrivalDate.setHours(0, 0, 0, 0)
        if (arrivalDate < min) min = new Date(arrivalDate)
        if (arrivalDate > max) max = new Date(arrivalDate)
      }
    })
    
    min.setDate(min.getDate() - 7)
    max.setDate(max.getDate() + 14)
    
    const range = Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24))
    const width = Math.max(40, Math.min(60, 800 / range))
    
    return { minDate: min, maxDate: max, dateRange: range, dayWidth: width }
  }, [shipments])

  const dates = useMemo(() => {
    const result: Date[] = []
    const current = new Date(minDate)
    for (let i = 0; i < dateRange; i++) {
      result.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return result
  }, [minDate, dateRange])

  const getBarPosition = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return null
    
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    const startDays = Math.floor((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    
    return {
      left: startDays * dayWidth,
      width: duration * dayWidth,
    }
  }

  const todayPosition = useMemo(() => {
    const days = Math.floor((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    // Position at the center of today's column
    return days * dayWidth + dayWidth / 2
  }, [today, minDate, dayWidth])

  const scrollToToday = () => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = Math.max(0, todayPosition - 200)
    }
  }

  useEffect(() => {
    scrollToToday()
  }, [])

  const shipmentsWithDates = shipments.filter(s => s.estimatedLoadingDate || s.estimatedArrivalDate)

  if (shipmentsWithDates.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-12 text-center">
        <Ship className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
        <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">No shipments with dates</h3>
        <p className="text-[14px] text-[#86868b]">
          Add departure and arrival dates to your shipments to see them on the timeline.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#d2d2d7]/30 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Shipment Timeline</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => containerRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[#86868b]" />
          </button>
          <button
            onClick={scrollToToday}
            className="px-3 py-1.5 text-[12px] font-medium text-[#0071e3] hover:bg-[#0071e3]/5 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => containerRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-[#86868b]" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-b border-[#d2d2d7]/30 flex items-center gap-4 text-[11px]">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-[#86868b] capitalize">{status.toLowerCase()}</span>
          </div>
        ))}
      </div>

      {/* Container */}
      <div className="flex">
        {/* Left sidebar - Shipment names */}
        <div className="w-64 flex-shrink-0 border-r border-[#d2d2d7]/30 bg-[#fafafa] flex flex-col">
          <div className="h-12 border-b border-[#d2d2d7]/30 px-4 flex items-center flex-shrink-0">
            <span className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Shipment</span>
          </div>
          <div className="flex-1">
            {shipmentsWithDates.map((shipment) => {
              const methodConfig = transportMethodConfig[shipment.transportMethod] || transportMethodConfig.SEA_FREIGHT
              const Icon = methodConfig.icon
              return (
                <div
                  key={shipment.id}
                  className="h-16 px-4 flex items-center border-b border-[#d2d2d7]/30 hover:bg-[#f5f5f7] transition-colors"
                >
                  <Link href={`/shipments/${shipment.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${methodConfig.color}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: methodConfig.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#0071e3] truncate hover:underline">
                        {shipment.shipmentNumber}
                      </p>
                      <p className="text-[11px] text-[#86868b] truncate">
                        {shipment.originLocation || '—'} → {shipment.destinationLocation || '—'}
                      </p>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right - Timeline */}
        <div className="flex-1 overflow-x-auto relative flex flex-col" ref={containerRef}>
          <div style={{ width: dateRange * dayWidth, minWidth: '100%' }} className="relative flex flex-col flex-1">
            {/* Date header - fixed */}
            <div className="h-12 border-b border-[#d2d2d7]/30 flex relative flex-shrink-0">
              {dates.map((date, i) => {
                const isToday = date.toDateString() === today.toDateString()
                const isFirstOfMonth = date.getDate() === 1
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                return (
                  <div
                    key={i}
                    className={`flex-shrink-0 border-r border-[#d2d2d7]/20 flex flex-col items-center justify-center ${
                      isWeekend ? 'bg-[#f5f5f7]/50' : ''
                    } ${isToday ? 'bg-[#0071e3]/5' : ''}`}
                    style={{ width: dayWidth }}
                  >
                    {isFirstOfMonth && (
                      <span className="text-[10px] font-medium text-[#1d1d1f]">
                        {date.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    )}
                    <span className={`text-[11px] ${isToday ? 'font-bold text-[#0071e3]' : 'text-[#86868b]'}`}>
                      {date.getDate()}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Shipment bars area */}
            <div className="flex-1">
              {shipmentsWithDates.map((shipment) => {
                const barPos = getBarPosition(shipment.estimatedLoadingDate, shipment.estimatedArrivalDate)
                const methodConfig = transportMethodConfig[shipment.transportMethod] || transportMethodConfig.SEA_FREIGHT
                const statusColor = statusColors[shipment.status] || statusColors.DRAFT
                
                return (
                  <div
                    key={shipment.id}
                    className="h-16 border-b border-[#d2d2d7]/30 relative"
                  >
                    {/* Weekend backgrounds */}
                    {dates.map((date, i) => {
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6
                      const isToday = date.toDateString() === today.toDateString()
                      if (!isWeekend && !isToday) return null
                      return (
                        <div
                          key={i}
                          className={`absolute top-0 bottom-0 ${isToday ? 'bg-[#0071e3]/5' : 'bg-[#f5f5f7]/50'}`}
                          style={{ left: i * dayWidth, width: dayWidth }}
                        />
                      )
                    })}
                    
                    {/* Shipment bar */}
                    {barPos && (
                      <Link
                        href={`/shipments/${shipment.id}`}
                        className="absolute top-3 h-10 rounded-lg flex items-center px-3 gap-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                        style={{
                          left: barPos.left,
                          width: Math.max(barPos.width, 80),
                          backgroundColor: statusColor,
                        }}
                      >
                        <methodConfig.icon className="w-4 h-4 text-white flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-white truncate">
                            {shipment.name || shipment.shipmentNumber}
                          </p>
                          {barPos.width > 120 && (
                            <p className="text-[10px] text-white/80 truncate">
                              {shipment.orders.length} order{shipment.orders.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Today line - contained within the timeline area */}
            <div
              className="absolute top-0 w-0.5 bg-[#ff3b30] z-10 pointer-events-none"
              style={{ 
                left: todayPosition,
                height: '100%'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
