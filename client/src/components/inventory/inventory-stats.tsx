import { AlertTriangle, CheckCircle2, Package, XCircle } from 'lucide-react'

interface InventoryStatsProps {
  total: number
  active: number
  lowStock: number
  outOfStock: number
}

export function InventoryStats({
  total,
  active,
  lowStock,
  outOfStock,
}: InventoryStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div className="p-4 rounded-xl border border-border bg-surface shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Total items
          </span>
          <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums mt-0.5 block">
            {total}
          </span>
        </div>
        <div className="size-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
          <Package className="size-4" />
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-surface shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Active
          </span>
          <span className="text-xl sm:text-2xl font-bold text-success tabular-nums mt-0.5 block">
            {active}
          </span>
        </div>
        <div className="size-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
          <CheckCircle2 className="size-4" />
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-surface shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Low stock (≤2)
          </span>
          <span className="text-xl sm:text-2xl font-bold text-warning tabular-nums mt-0.5 block">
            {lowStock}
          </span>
        </div>
        <div className="size-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
          <AlertTriangle className="size-4" />
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-surface shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Out of stock
          </span>
          <span className="text-xl sm:text-2xl font-bold text-danger tabular-nums mt-0.5 block">
            {outOfStock}
          </span>
        </div>
        <div className="size-8 rounded-lg bg-danger/10 text-danger flex items-center justify-center">
          <XCircle className="size-4" />
        </div>
      </div>
    </div>
  )
}
