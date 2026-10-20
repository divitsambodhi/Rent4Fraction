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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <div className="p-3.5 rounded-[10px] border border-border bg-surface shadow-none flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-muted-foreground block">
            Total items
          </span>
          <span className="text-lg sm:text-xl font-semibold text-foreground tabular-nums mt-0.5 block">
            {total}
          </span>
        </div>
        <Package className="size-4 text-muted-foreground/70" />
      </div>

      <div className="p-3.5 rounded-[10px] border border-border bg-surface shadow-none flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-muted-foreground block">
            Active
          </span>
          <span className="text-lg sm:text-xl font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5 block">
            {active}
          </span>
        </div>
        <CheckCircle2 className="size-4 text-emerald-600/80" />
      </div>

      <div className="p-3.5 rounded-[10px] border border-border bg-surface shadow-none flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-muted-foreground block">
            Low stock (≤2)
          </span>
          <span className="text-lg sm:text-xl font-semibold text-amber-700 dark:text-amber-400 tabular-nums mt-0.5 block">
            {lowStock}
          </span>
        </div>
        <AlertTriangle className="size-4 text-amber-600/80" />
      </div>

      <div className="p-3.5 rounded-[10px] border border-border bg-surface shadow-none flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-muted-foreground block">
            Out of stock
          </span>
          <span className="text-lg sm:text-xl font-semibold text-rose-700 dark:text-rose-400 tabular-nums mt-0.5 block">
            {outOfStock}
          </span>
        </div>
        <XCircle className="size-4 text-rose-600/80" />
      </div>
    </div>
  )
}
