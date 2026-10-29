import { useState } from 'react'
import { AlertCircle, Calendar, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/catalog/date-range-picker'
import { validateBlockUnits } from '@/lib/api/inventory'
import type { AvailabilityReason } from '@/types/vendor'

interface BlockFormProps {
  equipmentId: string
  totalStock: number
  onAddBlock: (block: {
    start_date: string
    end_date: string
    reason: AvailabilityReason
    units: number
  }) => Promise<void>
  disabled?: boolean
}

export function BlockForm({
  equipmentId,
  totalStock,
  onAddBlock,
  disabled = false,
}: BlockFormProps) {
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({})
  const [reason, setReason] = useState<AvailabilityReason>('maintenance')
  const [units, setUnits] = useState(1)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!dateRange.from || !dateRange.to) {
      setErrorMessage('Please select start and end dates for the block range.')
      return
    }

    if (dateRange.to < dateRange.from) {
      setErrorMessage('End date must be after or equal to the start date.')
      return
    }

    const todayStr = new Date().toISOString().split('T')[0]
    if (dateRange.from < todayStr) {
      setErrorMessage('Block range cannot start in the past.')
      return
    }

    if (units < 1 || units > totalStock) {
      setErrorMessage(`Units to block must be between 1 and total stock (${totalStock}).`)
      return
    }

    // Server/store validation: cannot block more units than are free on any day in the range
    const validation = validateBlockUnits(equipmentId, dateRange.from, dateRange.to, units)
    if (!validation.valid) {
      setErrorMessage(validation.message || 'Cannot block requested units.')
      return
    }

    setIsSubmitting(true)
    try {
      await onAddBlock({
        start_date: dateRange.from,
        end_date: dateRange.to,
        reason,
        units,
      })
      // Reset form
      setDateRange({})
      setUnits(1)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Calendar className="size-3.5 text-brand" />
          <span>Add New Availability Block</span>
        </h4>
        <span className="text-[11px] text-muted-foreground">
          Total stock: {totalStock} unit{totalStock > 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Date Range Picker */}
        <div className="sm:col-span-1">
          <label className="text-xs font-semibold text-foreground block mb-1">
            Date Range <span className="text-danger">*</span>
          </label>
          <DateRangePicker
            from={dateRange.from}
            to={dateRange.to}
            onChange={setDateRange}
            placeholder="Select block dates"
            className="w-full text-xs"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Block Reason <span className="text-danger">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as AvailabilityReason)}
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          >
            <option value="maintenance">Maintenance / Servicing</option>
            <option value="vendor_blocked">Vendor Blocked / Reserved</option>
          </select>
        </div>

        {/* Units to block */}
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Units to Block <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={totalStock}
            value={units}
            onChange={(e) => setUnits(parseInt(e.target.value, 10) || 1)}
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand tabular-nums"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded-lg border border-danger/30 bg-danger/5 text-xs text-danger flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={disabled || isSubmitting || !dateRange.from || !dateRange.to}
          className="text-xs h-8 bg-brand hover:bg-brand-hover text-white gap-1.5"
        >
          <Plus className="size-3.5" />
          <span>{isSubmitting ? 'Adding block...' : 'Block inventory'}</span>
        </Button>
      </div>
    </form>
  )
}
