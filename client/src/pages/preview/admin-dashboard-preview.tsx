import {
  Activity,
  ArrowUpRight,
  Scale,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatINR } from '@/lib/format'

export function AdminDashboardPreview() {
  return (
    <DashboardLayout type="admin">
      <div className="space-y-8">
        {/* Banner */}
        <div className="p-6 rounded-[16px] bg-brand text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-white/80">
              // DEV ONLY PREVIEW
            </div>
            <h2 className="font-serif text-2xl font-bold mt-1">
              Platform Operations & Governance
            </h2>
            <p className="text-sm text-white/90 mt-1">
              Multi-Vendor Escrow Monitoring & Vendor Onboarding Audit
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-xs">
              System Health: 100% Normal
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-[12px] border border-border bg-surface">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Platform GMV (Current Month)</span>
              <Activity className="size-4 text-brand" />
            </div>
            <div className="text-2xl font-bold font-sans tabular-nums text-foreground">
              {formatINR(1420000)}
            </div>
            <div className="text-xs text-success flex items-center gap-1 mt-1 font-medium">
              <ArrowUpRight className="size-3" />
              <span>+24.1% vs last month</span>
            </div>
          </div>

          <div className="p-5 rounded-[12px] border border-border bg-surface">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Active Escrow Deposits</span>
              <ShieldAlert className="size-4 text-warning" />
            </div>
            <div className="text-2xl font-bold font-sans tabular-nums text-foreground">
              {formatINR(485000)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Across 34 active rentals
            </div>
          </div>

          <div className="p-5 rounded-[12px] border border-border bg-surface">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Verified Partner Vendors</span>
              <Users className="size-4 text-info" />
            </div>
            <div className="text-2xl font-bold font-sans tabular-nums text-foreground">
              28 Partners
            </div>
            <div className="text-xs text-brand mt-1 font-medium">
              5 pending audit reviews
            </div>
          </div>

          <div className="p-5 rounded-[12px] border border-border bg-surface">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Dispute Arbitration Rate</span>
              <Scale className="size-4 text-success" />
            </div>
            <div className="text-2xl font-bold font-sans tabular-nums text-foreground">
              0.2%
            </div>
            <div className="text-xs text-success mt-1">
              Top industry reliability tier
            </div>
          </div>
        </div>

        {/* Pending Vendor Approvals */}
        <div className="rounded-[16px] border border-border bg-surface overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Pending Vendor Partner Audits
              </h3>
              <p className="text-xs text-muted-foreground">
                GST verification and physical equipment checks awaiting review
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5 pl-5">Vendor Entity</th>
                  <th className="p-3.5">City Hub</th>
                  <th className="p-3.5">Specialization</th>
                  <th className="p-3.5">GST Identification</th>
                  <th className="p-3.5 pr-5">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                <tr>
                  <td className="p-3.5 pl-5 font-medium">Deccan Stage Dynamics</td>
                  <td className="p-3.5 text-muted-foreground">Hyderabad</td>
                  <td className="p-3.5">Aluminum Truss & Rigging</td>
                  <td className="p-3.5 font-mono">36AABCS1429E1Z8</td>
                  <td className="p-3.5 pr-5">
                    <StatusBadge status="processing" label="Inspection Scheduled" size="sm" />
                  </td>
                </tr>
                <tr>
                  <td className="p-3.5 pl-5 font-medium">SoundWave AV Bangalore</td>
                  <td className="p-3.5 text-muted-foreground">Bengaluru</td>
                  <td className="p-3.5">Digital Audio Consoles</td>
                  <td className="p-3.5 font-mono">29AAECS9921B1ZM</td>
                  <td className="p-3.5 pr-5">
                    <StatusBadge status="pending" label="Pending GST Match" size="sm" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
