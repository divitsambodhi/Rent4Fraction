import { CalendarDays, Package, RotateCcw, Truck } from 'lucide-react'
import type { ScheduleDayGroup } from '@/types/vendor'
import { cn } from '@/lib/utils'

interface ScheduleCardProps {
  schedule: ScheduleDayGroup[]
  title?: string
  subtitle?: string
  className?: string
}

export function ScheduleCard({
  schedule,
  title = 'Next 7 days',
  subtitle = 'Upcoming deliveries, returns and pickups',
  className,
}: ScheduleCardProps) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'delivery':
        return Truck
      case 'return':
        return RotateCcw
      case 'pickup':
      default:
        return Package
    }
  }

  const getEventTone = (type: string) => {
    switch (type) {
      case 'delivery':
        return 'text-brand bg-brand/10 border-brand/20'
      case 'return':
        return 'text-warning bg-warning/10 border-warning/20'
      case 'pickup':
      default:
        return 'text-info bg-info/10 border-info/20'
    }
  }

  const totalEvents = schedule.reduce((acc, d) => acc + d.events.length, 0)

  return (
    <div className={cn('rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs flex flex-col', className)}>
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div>
          <h2 className="font-serif text-lg font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="size-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
          <CalendarDays className="size-4" />
        </div>
      </div>

      <div className="mt-4 flex-1">
        {totalEvents === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            <CalendarDays className="size-8 mx-auto mb-2 opacity-40" />
            <p>No handovers scheduled for the next 7 days</p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedule.map((group) => {
              if (group.events.length === 0) return null

              return (
                <div key={group.date} className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {group.day_label}
                  </span>

                  <div className="space-y-1.5">
                    {group.events.map((evt) => {
                      const Icon = getEventIcon(evt.type)
                      const tone = getEventTone(evt.type)

                      return (
                        <div
                          key={evt.id}
                          className="p-2.5 rounded-xl border border-border/70 bg-background/50 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn('size-7 rounded-lg flex items-center justify-center shrink-0 border', tone)}>
                              <Icon className="size-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-foreground capitalize block truncate">
                                {evt.type} · {evt.time}
                              </span>
                              <span className="text-muted-foreground truncate block">
                                {evt.customer_name} {evt.location ? `· ${evt.location}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0 max-w-[120px] truncate text-[11px] text-muted-foreground">
                            {evt.equipment_name}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
