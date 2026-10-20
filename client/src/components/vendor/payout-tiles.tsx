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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total earned net
            </span>
            <div className="size-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              ₹{tiles.total_earned_net.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">All-time settled net</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending
            </span>
            <div className="size-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
              <Clock3 className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              ₹{tiles.pending.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active rentals in progress</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Processing
            </span>
            <div className="size-8 rounded-lg bg-info/10 text-info flex items-center justify-center">
              <Wallet className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              ₹{tiles.processing.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting bank settlement</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Paid out
            </span>
            <div className="size-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
              <Check className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              ₹{tiles.paid_out.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Successfully transferred</p>
          </div>
        </div>
      </div>
    </div>
  )
}
