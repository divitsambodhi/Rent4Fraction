import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, BarChart2, Table } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ChartDataPoint {
  label: string
  date: string
  amount: number
}

interface EarningsChartProps {
  series: ChartDataPoint[]
  rangeTotal: number
  deltaPercent: number
  title?: string
  subtitle?: string
  className?: string
}

export function EarningsChart({
  series,
  rangeTotal,
  deltaPercent,
  title = 'Net Earnings',
  subtitle = 'Net earnings over the selected period',
  className,
}: EarningsChartProps) {
  const [showTable, setShowTable] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null)

  const maxAmount = Math.max(...series.map((p) => p.amount), 1)
  const isPositiveDelta = deltaPercent >= 0

  return (
    <div className={cn('rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs flex flex-col', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <h2 className="font-serif text-lg font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
              ₹{rangeTotal.toLocaleString('en-IN')}
            </div>
            <div
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-semibold',
                isPositiveDelta ? 'text-success' : 'text-danger',
              )}
            >
              {isPositiveDelta ? (
                <ArrowUpRight className="size-3 shrink-0" />
              ) : (
                <ArrowDownRight className="size-3 shrink-0" />
              )}
              <span className="tabular-nums">
                {isPositiveDelta ? '+' : ''}
                {deltaPercent.toFixed(1)}% vs prev period
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTable(!showTable)}
            className="text-xs h-8 px-2.5 gap-1.5"
          >
            {showTable ? (
              <>
                <BarChart2 className="size-3.5" />
                <span>View chart</span>
              </>
            ) : (
              <>
                <Table className="size-3.5" />
                <span>View as table</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Area */}
      <div className="pt-4 flex-1">
        {series.length === 0 ? (
          <div className="h-[240px] sm:h-[280px] flex flex-col items-center justify-center text-muted-foreground text-sm">
            <BarChart2 className="size-8 mb-2 opacity-40" />
            <p>No earnings recorded for this timeframe</p>
          </div>
        ) : showTable ? (
          <div className="h-[240px] sm:h-[280px] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-semibold sticky top-0 border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Date / Interval</th>
                  <th className="px-4 py-2.5 text-right">Net Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {series.map((point) => (
                  <tr key={point.date} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 text-foreground font-medium">{point.label}</td>
                    <td className="px-4 py-2 text-right font-semibold text-foreground tabular-nums">
                      ₹{point.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="relative">
            {/* Tooltip Overlay */}
            <div className="h-6 mb-2 flex items-center justify-end text-xs text-muted-foreground">
              {hoveredPoint ? (
                <span className="font-medium text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/80">
                  {hoveredPoint.label}: <strong className="text-brand tabular-nums">₹{hoveredPoint.amount.toLocaleString('en-IN')}</strong>
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground/80 italic">Hover on a bar for interval details</span>
              )}
            </div>

            {/* Bars container (240px mobile, 280px desktop) */}
            <div
              className="h-[200px] sm:h-[240px] flex items-end gap-1 sm:gap-2 px-1 pt-4 pb-6 border-b border-border relative"
              role="img"
              aria-label="Net earnings bar chart"
            >
              {series.map((point) => {
                const heightPercent = Math.max((point.amount / maxAmount) * 100, 4)
                const isHovered = hoveredPoint?.date === point.date

                return (
                  <div
                    key={point.date}
                    onMouseEnter={() => setHoveredPoint(point)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
                  >
                    <div
                      className={cn(
                        'w-full max-w-[32px] rounded-t-sm transition-all duration-200',
                        isHovered
                          ? 'bg-brand shadow-sm scale-y-[1.02]'
                          : point.amount > 0
                          ? 'bg-brand/80 hover:bg-brand'
                          : 'bg-muted-foreground/20 hover:bg-muted-foreground/40',
                      )}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="absolute -bottom-5 text-[10px] text-muted-foreground/80 truncate w-full text-center group-hover:text-foreground">
                      {point.label.split(' ')[0]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
