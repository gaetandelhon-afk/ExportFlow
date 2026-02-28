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
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'

// Types
interface TableColumn {
  id: string
  label: string
  field: 'rowNumber' | 'hsCode' | 'reference' | 'description' | 'quantity' | 'unit' | 'unitPrice' | 'total' | 'weight' | 'netWeight' | 'packages' | 'cbm' | 'custom'
  width: number  // percentage
  visible: boolean
  order: number
  customFieldId?: string  // for custom columns
}

interface ColumnConfiguratorProps {
  columns: TableColumn[]
  onChange: (columns: TableColumn[]) => void
  documentType: 'invoice' | 'quote' | 'packingListExport' | 'packingListFactory'
}

// Predefined column options
const PREDEFINED_COLUMNS: { field: TableColumn['field'], label: string, defaultWidth: number }[] = [
  { field: 'rowNumber', label: '#', defaultWidth: 5 },
  { field: 'hsCode', label: 'HS Code', defaultWidth: 10 },
  { field: 'reference', label: 'Reference', defaultWidth: 12 },
  { field: 'description', label: 'Description', defaultWidth: 25 },
  { field: 'quantity', label: 'Quantity', defaultWidth: 7 },
  { field: 'unit', label: 'Unit', defaultWidth: 6 },
  { field: 'unitPrice', label: 'Unit Price', defaultWidth: 12 },
  { field: 'total', label: 'Total', defaultWidth: 12 },
  { field: 'packages', label: 'Packages', defaultWidth: 7 },
  { field: 'weight', label: 'G.W. (Kgs)', defaultWidth: 10 },
  { field: 'netWeight', label: 'N.W. (Kgs)', defaultWidth: 10 },
  { field: 'cbm', label: 'CBM', defaultWidth: 8 },
]

// Sortable column component
function SortableColumn({ 
  column, 
  onToggleVisibility,
  onWidthChange,
  onLabelChange,
  onDelete,
  canDelete
}: { 
  column: TableColumn
  onToggleVisibility: (id: string) => void
  onWidthChange: (id: string, width: number) => void
  onLabelChange: (id: string, label: string) => void
  onDelete: (id: string) => void
  canDelete: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-lg border ${
        column.visible 
          ? 'bg-white border-[#d2d2d7]/50' 
          : 'bg-[#f5f5f7] border-[#d2d2d7]/30 opacity-60'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-[#f5f5f7] rounded flex-shrink-0"
      >
        <GripVertical className="w-4 h-4 text-[#86868b]" />
      </button>
      
      {/* Column label - editable for all columns */}
      <input
        type="text"
        value={column.label}
        onChange={(e) => onLabelChange(column.id, e.target.value)}
        className={`flex-1 px-2 py-1 text-[13px] bg-[#f5f5f7] border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
          column.visible ? 'text-[#1d1d1f]' : 'text-[#86868b]'
        }`}
        placeholder="Column name"
      />
      
      {/* Width input */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <input
          type="number"
          value={column.width}
          onChange={(e) => onWidthChange(column.id, parseInt(e.target.value) || 0)}
          className="w-12 px-2 py-1 text-[12px] text-center bg-[#f5f5f7] border-0 rounded focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          min={5}
          max={50}
        />
        <span className="text-[11px] text-[#86868b]">%</span>
      </div>
      
      {/* Visibility toggle */}
      <button
        onClick={() => onToggleVisibility(column.id)}
        className="p-1 hover:bg-[#f5f5f7] rounded flex-shrink-0"
      >
        {column.visible ? (
          <Eye className="w-4 h-4 text-[#34c759]" />
        ) : (
          <EyeOff className="w-4 h-4 text-[#86868b]" />
        )}
      </button>
      
      {/* Delete button (only for custom columns) */}
      {canDelete && (
        <button
          onClick={() => onDelete(column.id)}
          className="p-1 hover:bg-[#ff3b30]/10 rounded flex-shrink-0"
        >
          <Trash2 className="w-4 h-4 text-[#ff3b30]" />
        </button>
      )}
    </div>
  )
}

// Dragged column overlay
function DragOverlayContent({ column }: { column: TableColumn | null }) {
  if (!column) return null
  
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-white border-[#0071e3] shadow-lg">
      <GripVertical className="w-4 h-4 text-[#86868b]" />
      <span className="text-[13px] text-[#1d1d1f]">{column.label}</span>
    </div>
  )
}

export default function ColumnConfigurator({ columns, onChange, documentType }: ColumnConfiguratorProps) {
  const [activeColumn, setActiveColumn] = useState<TableColumn | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Sort columns by order
  const sortedColumns = [...columns].sort((a, b) => a.order - b.order)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveColumn(columns.find(col => col.id === event.active.id) || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveColumn(null)

    if (!over || active.id === over.id) return

    const oldIndex = sortedColumns.findIndex(col => col.id === active.id)
    const newIndex = sortedColumns.findIndex(col => col.id === over.id)

    if (oldIndex !== newIndex) {
      const reordered = arrayMove(sortedColumns, oldIndex, newIndex)
      const updatedColumns = reordered.map((col, idx) => ({ ...col, order: idx }))
      onChange(updatedColumns)
    }
  }

  const toggleVisibility = (id: string) => {
    onChange(columns.map(col => col.id === id ? { ...col, visible: !col.visible } : col))
  }

  const updateWidth = (id: string, width: number) => {
    onChange(columns.map(col => col.id === id ? { ...col, width: Math.max(5, Math.min(50, width)) } : col))
  }

  const updateLabel = (id: string, label: string) => {
    onChange(columns.map(col => col.id === id ? { ...col, label } : col))
  }

  const deleteColumn = (id: string) => {
    const filtered = columns.filter(col => col.id !== id)
    const reordered = filtered.map((col, idx) => ({ ...col, order: idx }))
    onChange(reordered)
  }

  const addColumn = (field: TableColumn['field']) => {
    const predefined = PREDEFINED_COLUMNS.find(p => p.field === field)
    const newColumn: TableColumn = {
      id: `col-${field}-${Date.now()}`,
      label: predefined?.label || 'Custom',
      field,
      width: predefined?.defaultWidth || 10,
      visible: true,
      order: columns.length,
    }
    onChange([...columns, newColumn])
  }

  const addCustomColumn = () => {
    const newColumn: TableColumn = {
      id: `col-custom-${Date.now()}`,
      label: 'Custom Column',
      field: 'custom',
      width: 10,
      visible: true,
      order: columns.length,
    }
    onChange([...columns, newColumn])
  }

  // Get available columns that aren't already added (excluding custom which can have multiple)
  const availableColumns = PREDEFINED_COLUMNS.filter(
    p => p.field === 'custom' || !columns.some(c => c.field === p.field)
  )

  // Calculate total width
  const totalWidth = columns.filter(c => c.visible).reduce((sum, c) => sum + c.width, 0)

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-[#86868b]">
        Configure which columns appear in your {documentType === 'invoice' ? 'invoice' : documentType === 'quote' ? 'quote' : 'packing list'} table. 
        Drag to reorder, adjust widths, or add custom columns.
      </p>
      
      {/* Total width indicator */}
      <div className={`text-[12px] ${totalWidth === 100 ? 'text-[#34c759]' : totalWidth > 100 ? 'text-[#ff3b30]' : 'text-[#ff9500]'}`}>
        Total width: {totalWidth}% {totalWidth !== 100 && `(should be 100%)`}
      </div>
      
      {/* Column list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedColumns.map(col => col.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {sortedColumns.map(column => (
              <SortableColumn
                key={column.id}
                column={column}
                onToggleVisibility={toggleVisibility}
                onWidthChange={updateWidth}
                onLabelChange={updateLabel}
                onDelete={deleteColumn}
                canDelete={column.field === 'custom'}
              />
            ))}
          </div>
        </SortableContext>
        
        <DragOverlay>
          <DragOverlayContent column={activeColumn} />
        </DragOverlay>
      </DndContext>
      
      {/* Add column buttons */}
      <div className="border-t border-[#d2d2d7]/30 pt-4">
        <p className="text-[12px] font-medium text-[#1d1d1f] mb-2">Add Column</p>
        <div className="flex flex-wrap gap-2">
          {availableColumns.filter(c => c.field !== 'custom').map(col => (
            <button
              key={col.field}
              onClick={() => addColumn(col.field)}
              className="px-3 py-1.5 text-[12px] bg-[#f5f5f7] hover:bg-[#e8e8ed] rounded-lg transition-colors"
            >
              + {col.label}
            </button>
          ))}
          <button
            onClick={addCustomColumn}
            className="px-3 py-1.5 text-[12px] bg-[#0071e3] text-white hover:bg-[#0077ed] rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Custom Column
          </button>
        </div>
      </div>
    </div>
  )
}
