import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CalendarDays, Truck } from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'
import type { ScheduleDeliveryPayload } from '@/lib/lifecycle'

interface ScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  startDate: string // e.g. 2026-11-15
  isPickup?: boolean
  onConfirm: (payload: ScheduleDeliveryPayload) => Promise<void>
}

export function ScheduleDialog({
  open,
  onOpenChange,
  orderId,
  startDate,
  isPickup = false,
  onConfirm,
}: ScheduleDialogProps) {
  // Allowed date range: startDate - 1 day to startDate
  let minDateStr = startDate
  try {
    const sDate = parseISO(startDate)
    minDateStr = format(subDays(sDate, 1), 'yyyy-MM-dd')
  } catch {
    // fallback
  }

  const [date, setDate] = useState(startDate)
  const [startTime, setStartTime] = useState('10:00 AM')
  const [endTime, setEndTime] = useState('01:00 PM')
  const [deliveredBy, setDeliveredBy] = useState('In-house delivery fleet')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onConfirm({
        date,
        startTime,
        endTime,
        deliveredBy,
        notes,
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
              <Truck className="size-5 text-brand" />
              <span>{isPickup ? 'Schedule Customer Pickup' : 'Schedule Delivery'} · {orderId}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isPickup
                ? 'Set the earliest pickup window when equipment will be staged and ready.'
                : 'Select the dispatch date and expected delivery window for venue arrival.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Fulfilment Date</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Permitted: {minDateStr} to {startDate}
                </span>
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={date}
                  min={minDateStr}
                  max={startDate}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-9 text-xs h-9"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Window Start</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-10 px-3 rounded-sm border border-border bg-card text-base md:text-sm text-foreground"
                >
                  {['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '04:00 PM'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Window End</label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-10 px-3 rounded-sm border border-border bg-card text-base md:text-sm text-foreground"
                >
                  {['11:00 AM', '12:00 PM', '01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM', '09:00 PM'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {isPickup ? 'On-site Contact / Counter' : 'Delivery Driver / Courier'}
              </label>
              <Input
                value={deliveredBy}
                onChange={(e) => setDeliveredBy(e.target.value)}
                placeholder="e.g. Ramesh Kumar (+91 98765 01234)"
                className="text-base md:text-sm h-10"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Logistics Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Gate 3 service elevator access required. Driver vehicle KA-03-ME-9021."
                rows={2}
                className="text-base md:text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 text-xs bg-brand hover:bg-brand-hover text-brand-foreground"
            >
              {isSubmitting ? 'Scheduling...' : 'Save Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
