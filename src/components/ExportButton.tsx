'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { ExportModal, ExportColumn } from '@/components/ExportModal'

interface ExportButtonProps {
  title: string
  entityType: 'invoices' | 'quotes' | 'orders' | 'products' | 'packingLists' | 'payments' | 'customers'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  availableColumns: ExportColumn[]
  customFieldsColumns?: ExportColumn[]
  showCustomerFilter?: boolean
  buttonVariant?: 'primary' | 'secondary'
  buttonSize?: 'sm' | 'md'
}

export function ExportButton({
  title,
  entityType,
  data,
  availableColumns,
  customFieldsColumns = [],
  showCustomerFilter = false,
  buttonVariant = 'primary',
  buttonSize = 'md'
}: ExportButtonProps) {
  const [showExportModal, setShowExportModal] = useState(false)

  const baseClasses = 'inline-flex items-center gap-2 font-medium rounded-xl transition-colors'
  const variantClasses = buttonVariant === 'primary'
    ? 'bg-[#34c759] hover:bg-[#2db350] text-white'
    : 'bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f]'
  const sizeClasses = buttonSize === 'sm'
    ? 'text-[12px] px-3 h-8'
    : 'text-[13px] px-4 h-10'

  return (
    <>
      <button
        onClick={() => setShowExportModal(true)}
        className={`${baseClasses} ${variantClasses} ${sizeClasses}`}
      >
        <Download className={buttonSize === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        Export
      </button>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={title}
        entityType={entityType}
        data={data}
        availableColumns={availableColumns}
        customFieldsColumns={customFieldsColumns}
        showCustomerFilter={showCustomerFilter}
      />
    </>
  )
}
