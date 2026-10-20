import { Check, Clock3, DollarSign, ShieldCheck, Wallet } from 'lucide-react'
import type { VendorPayoutTiles } from '@/types/vendor'

interface PayoutTilesProps {
  tiles: VendorPayoutTiles
}

export function PayoutTiles({ tiles }: PayoutTilesProps) {
  return (
    <div className="space-y-4">
      {/* Commission note line: reads the vendor's stored rate */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/20 bg-brand/5 text-xs sm:text-sm text-foreground">
        <ShieldCheck className="size-4 text-brand shrink-0" />
        <span>
          Your commission rate is <strong className="text-brand font-bold">{tiles.commission_rate}%</strong>
        </span>
        <span className="text-muted-foreground text-xs ml-auto">
          Set by Rent4Fraction · Deducted on completion
        </span>
      </div>

      {/* 4 Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-[12px] border border-border bg-surface p-4 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total earned net
            </span>
            <DollarSign className="size-4 text-muted-foreground/70" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground tabular-nums">
              ₹{tiles.total_earned_net.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">All-time settled net</p>
          </div>
        </div>

        <div className="rounded-[12px] border border-border bg-surface p-4 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Pending
            </span>
            <Clock3 className="size-4 text-amber-600/80" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-semibold tracking-tight text-amber-700 dark:text-amber-400 tabular-nums">
              ₹{tiles.pending.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active rentals in progress</p>
          </div>
        </div>

        <div className="rounded-[12px] border border-border bg-surface p-4 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Processing
            </span>
            <Wallet className="size-4 text-muted-foreground/70" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground tabular-nums">
              ₹{tiles.processing.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting bank settlement</p>
          </div>
        </div>

        <div className="rounded-[12px] border border-border bg-surface p-4 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Paid out
            </span>
            <Check className="size-4 text-emerald-600/80" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-400 tabular-nums">
              ₹{tiles.paid_out.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Successfully transferred</p>
          </div>
        </div>
      </div>
    </div>
  )
}
