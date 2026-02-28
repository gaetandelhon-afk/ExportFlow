'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
  rectIntersection,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff } from 'lucide-react'

// Types
interface DocumentElement {
  id: string
  type: 'logo' | 'companyInfo' | 'documentTitle' | 'documentInfo' | 'billTo' | 'bankDetails' | 'table' | 'totals' | 'termsNotes'
  zone: 'header-left' | 'header-center' | 'header-right' | 'body-left' | 'body-right' | 'footer'
  order: number
  visible: boolean
}

type Zone = DocumentElement['zone']

interface DocumentLayoutEditorProps {
  elements: DocumentElement[]
  onChange: (elements: DocumentElement[]) => void
}

// Element type labels
const ELEMENT_LABELS: Record<DocumentElement['type'], string> = {
  logo: 'Logo',
  companyInfo: 'Company Info',
  documentTitle: 'Document Title',
  documentInfo: 'Document Info (Number, Date)',
  billTo: 'Bill To / Customer',
  bankDetails: 'Bank Details',
  table: 'Products Table',
  totals: 'Totals',
  termsNotes: 'Terms & Notes',
}

// Zone labels
const ZONE_LABELS: Record<Zone, string> = {
  'header-left': 'Header Left',
  'header-center': 'Header Center',
  'header-right': 'Header Right',
  'body-left': 'Body Left',
  'body-right': 'Body Right',
  'footer': 'Footer',
}

// Sortable element component
function SortableElement({ 
  element, 
  onToggleVisibility 
}: { 
  element: DocumentElement
  onToggleVisibility: (id: string) => void 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg border touch-none ${
        element.visible 
          ? 'bg-white border-[#d2d2d7]/50' 
          : 'bg-[#f5f5f7] border-[#d2d2d7]/30 opacity-60'
      } ${isDragging ? 'shadow-lg ring-2 ring-[#0071e3]' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-[#f5f5f7] rounded touch-none"
      >
        <GripVertical className="w-4 h-4 text-[#86868b]" />
      </div>
      
      <span className={`flex-1 text-[13px] select-none ${element.visible ? 'text-[#1d1d1f]' : 'text-[#86868b]'}`}>
        {ELEMENT_LABELS[element.type]}
      </span>
      
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleVisibility(element.id)
        }}
        className="p-1 hover:bg-[#f5f5f7] rounded"
      >
        {element.visible ? (
          <Eye className="w-4 h-4 text-[#34c759]" />
        ) : (
          <EyeOff className="w-4 h-4 text-[#86868b]" />
        )}
      </button>
    </div>
  )
}

// Droppable Zone component
function DroppableZone({ 
  zone, 
  elements, 
  onToggleVisibility,
  isOver
}: { 
  zone: Zone
  elements: DocumentElement[]
  onToggleVisibility: (id: string) => void
  isOver: boolean
}) {
  const { setNodeRef } = useDroppable({
    id: `zone-${zone}`,
    data: { zone }
  })

  const zoneElements = elements
    .filter(el => el.zone === zone)
    .sort((a, b) => a.order - b.order)

  return (
    <div 
      ref={setNodeRef}
      className={`min-h-[80px] p-2 rounded-lg border-2 border-dashed transition-colors ${
        isOver 
          ? 'bg-[#0071e3]/10 border-[#0071e3]' 
          : 'bg-[#f5f5f7] border-[#d2d2d7]/50'
      }`}
    >
      <div className="text-[10px] font-medium text-[#86868b] uppercase mb-2">
        {ZONE_LABELS[zone]}
      </div>
      
      <SortableContext
        items={zoneElements.map(el => el.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1 min-h-[40px]">
          {zoneElements.map(element => (
            <SortableElement
              key={element.id}
              element={element}
              onToggleVisibility={onToggleVisibility}
            />
          ))}
          {zoneElements.length === 0 && (
            <div className={`text-[11px] italic py-2 text-center ${isOver ? 'text-[#0071e3]' : 'text-[#86868b]'}`}>
              {isOver ? 'Release to drop here' : 'Drop elements here'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// Dragged element overlay
function DragOverlayContent({ element }: { element: DocumentElement | null }) {
  if (!element) return null
  
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border bg-white border-[#0071e3] shadow-lg cursor-grabbing">
      <GripVertical className="w-4 h-4 text-[#86868b]" />
      <span className="text-[13px] text-[#1d1d1f]">
        {ELEMENT_LABELS[element.type]}
      </span>
    </div>
  )
}

export default function DocumentLayoutEditor({ elements, onChange }: DocumentLayoutEditorProps) {
  const [activeElement, setActiveElement] = useState<DocumentElement | null>(null)
  const [overZone, setOverZone] = useState<Zone | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveElement(elements.find(el => el.id === active.id) || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) {
      setOverZone(null)
      return
    }

    const activeEl = elements.find(el => el.id === active.id)
    if (!activeEl) return

    // Check if over a zone (droppable area)
    const overId = over.id as string
    if (overId.startsWith('zone-')) {
      const zone = overId.replace('zone-', '') as Zone
      setOverZone(zone)
    } else {
      // Over an element - find its zone
      const overEl = elements.find(el => el.id === over.id)
      if (overEl) {
        setOverZone(overEl.zone)
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveElement(null)
    setOverZone(null)
    
    if (!over) return

    const activeEl = elements.find(el => el.id === active.id)
    if (!activeEl) return

    const overId = over.id as string
    let targetZone: Zone | null = null
    let targetElementId: string | null = null

    // Determine target zone
    if (overId.startsWith('zone-')) {
      targetZone = overId.replace('zone-', '') as Zone
    } else {
      const overEl = elements.find(el => el.id === over.id)
      if (overEl) {
        targetZone = overEl.zone
        targetElementId = overEl.id
      }
    }

    if (!targetZone) return

    // If moving to different zone
    if (activeEl.zone !== targetZone) {
      const newElements = elements.map(el => {
        if (el.id === active.id) {
          return { ...el, zone: targetZone, order: 999 }
        }
        return el
      })
      onChange(reorderElements(newElements))
    } else if (targetElementId && activeEl.id !== targetElementId) {
      // Reorder within same zone
      const zoneElements = elements.filter(el => el.zone === activeEl.zone).sort((a, b) => a.order - b.order)
      const oldIndex = zoneElements.findIndex(el => el.id === active.id)
      const newIndex = zoneElements.findIndex(el => el.id === targetElementId)
      
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(zoneElements, oldIndex, newIndex)
        const newElements = elements.map(el => {
          const idx = reordered.findIndex(r => r.id === el.id)
          if (idx !== -1) {
            return { ...el, order: idx }
          }
          return el
        })
        onChange(newElements)
      }
    }
  }

  const toggleVisibility = (id: string) => {
    const newElements = elements.map(el => {
      if (el.id === id) {
        return { ...el, visible: !el.visible }
      }
      return el
    })
    onChange(newElements)
  }

  // Reorder elements by zone and assign proper order numbers
  const reorderElements = (els: DocumentElement[]): DocumentElement[] => {
    const zones = Object.keys(ZONE_LABELS) as Zone[]
    let result: DocumentElement[] = []
    
    zones.forEach(zone => {
      const zoneEls = els
        .filter(el => el.zone === zone)
        .sort((a, b) => a.order - b.order)
        .map((el, idx) => ({ ...el, order: idx }))
      result = [...result, ...zoneEls]
    })
    
    return result
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <p className="text-[13px] text-[#86868b]">
          Drag elements between zones to customize your document layout. Click the eye icon to show/hide elements.
        </p>
        
        {/* Header zones */}
        <div className="grid grid-cols-3 gap-2">
          <DroppableZone zone="header-left" elements={elements} onToggleVisibility={toggleVisibility} isOver={overZone === 'header-left'} />
          <DroppableZone zone="header-center" elements={elements} onToggleVisibility={toggleVisibility} isOver={overZone === 'header-center'} />
          <DroppableZone zone="header-right" elements={elements} onToggleVisibility={toggleVisibility} isOver={overZone === 'header-right'} />
        </div>
        
        {/* Body zones */}
        <div className="grid grid-cols-2 gap-2">
          <DroppableZone zone="body-left" elements={elements} onToggleVisibility={toggleVisibility} isOver={overZone === 'body-left'} />
          <DroppableZone zone="body-right" elements={elements} onToggleVisibility={toggleVisibility} isOver={overZone === 'body-right'} />
        </div>
        
        {/* Footer zone */}
        <DroppableZone zone="footer" elements={elements} onToggleVisibility={toggleVisibility} isOver={overZone === 'footer'} />
      </div>
      
      <DragOverlay dropAnimation={null}>
        <DragOverlayContent element={activeElement} />
      </DragOverlay>
    </DndContext>
  )
}
