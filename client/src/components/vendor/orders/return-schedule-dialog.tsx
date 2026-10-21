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
import { CalendarDays, RotateCcw } from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'
import type { ScheduleReturnPayload } from '@/lib/lifecycle'

interface ReturnScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  endDate: string // e.g. 2026-11-17
  onConfirm: (payload: ScheduleReturnPayload) => Promise<void>
}

export function ReturnScheduleDialog({
  open,
  onOpenChange,
  orderId,
  endDate,
  onConfirm,
}: ReturnScheduleDialogProps) {
  // Allowed date: on or after (endDate - 1 day)
  let minDateStr = endDate
  try {
    const eDate = parseISO(endDate)
    minDateStr = format(subDays(eDate, 1), 'yyyy-MM-dd')
  } catch {
    // fallback
  }

  const [date, setDate] = useState(endDate)
  const [startTime, setStartTime] = useState('04:00 PM')
  const [endTime, setEndTime] = useState('07:00 PM')
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
              <RotateCcw className="size-5 text-brand" />
              <span>Schedule Equipment Return · {orderId}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Coordinate the return pickup window from the venue or customer handover counter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Return Date</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Earliest permitted: {minDateStr}
                </span>
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={date}
                  min={minDateStr}
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
                  {['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM'].map((t) => (
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
                  {['12:00 PM', '02:00 PM', '05:00 PM', '07:00 PM', '09:00 PM', '11:00 PM'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Pickup Logistics Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Ensure cables are coiled into crate B2. Team will arrive in Tata Ace vehicle."
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
              {isSubmitting ? 'Scheduling...' : 'Confirm Return Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
