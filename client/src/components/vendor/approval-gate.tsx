import { CheckCircle2, Clock, Hourglass, ShieldAlert, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'
import type { VendorApprovalStatus } from '@/types/vendor'
import { cn } from '@/lib/utils'

interface ApprovalGateProps {
  status: VendorApprovalStatus
  businessName: string
  email?: string
  phone?: string
  city?: string
  rejectionReason?: string
  suspensionReason?: string
}

export function ApprovalGate({
  status,
  businessName,
  email = 'partner@rent4fraction.example',
  phone = '+91 98765 43210',
  city = 'Bengaluru',
  rejectionReason = 'Submitted business registration documents could not be verified.',
  suspensionReason = 'Account suspended pending administrative compliance review.',
}: ApprovalGateProps) {
  if (status === 'rejected') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6 sm:p-8 space-y-5">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-danger/15 text-danger flex items-center justify-center shrink-0">
              <XCircle className="size-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-danger">
                Application Status
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                Your application was not approved
              </h2>
              <p className="text-sm text-muted-foreground">
                Our onboarding team reviewed your partner application and was unable to approve equipment listing access.
              </p>
            </div>
          </div>

          {/* Quoted Rejection Reason */}
          <div className="rounded-xl border border-danger/20 bg-background/80 p-4 space-y-1">
            <span className="text-xs font-semibold text-danger">Reason for rejection:</span>
            <blockquote className="text-sm text-foreground italic border-l-2 border-danger pl-3 my-1">
              &ldquo;{rejectionReason}&rdquo;
            </blockquote>
          </div>

          {/* Read-only application summary */}
          <div className="border-t border-danger/20 pt-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Submitted Business Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Business Name</span>
                <p className="font-medium text-foreground">{businessName}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Registered Email</span>
                <p className="font-medium text-foreground">{email}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Contact Phone</span>
                <p className="font-medium text-foreground">{phone}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Location</span>
                <p className="font-medium text-foreground">{city}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <AppLink to="/help?tab=contact">
              <Button variant="default" className="bg-danger hover:bg-danger/90 text-white">
                Contact support
              </Button>
            </AppLink>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'suspended') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6 sm:p-8 space-y-5">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-danger/15 text-danger flex items-center justify-center shrink-0">
              <ShieldAlert className="size-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-danger">
                Account Notice
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                Your account is suspended
              </h2>
              <p className="text-sm text-muted-foreground">
                Your vendor workspace and active equipment listings have been suspended. Contact support to learn more.
              </p>
            </div>
          </div>

          {/* Quoted Suspension Note */}
          <div className="rounded-xl border border-danger/20 bg-background/80 p-4 space-y-1">
            <span className="text-xs font-semibold text-danger">Notice details:</span>
            <blockquote className="text-sm text-foreground italic border-l-2 border-danger pl-3 my-1">
              &ldquo;{suspensionReason}&rdquo;
            </blockquote>
          </div>

          {/* Read-only account facts */}
          <div className="border-t border-danger/20 pt-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Account Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Business Name</span>
                <p className="font-medium text-foreground">{businessName}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Registered Email</span>
                <p className="font-medium text-foreground">{email}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <AppLink to="/help?tab=contact">
              <Button variant="default" className="bg-danger hover:bg-danger/90 text-white">
                Contact support
              </Button>
            </AppLink>
          </div>
        </div>
      </div>
    )
  }

  // Pending approval gate (default)
  const steps = [
    { title: 'Account created', status: 'complete', description: 'Vendor login credentials set up' },
    { title: 'Email verified', status: 'complete', description: 'Primary contact address confirmed' },
    { title: 'Admin review', status: 'current', description: 'Our team is reviewing your business details' },
    { title: 'Start listing equipment', status: 'upcoming', description: 'Access catalogue, orders, and payouts' },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4 sm:py-6">
      {/* Primary Banner */}
      <div className="rounded-2xl border border-warning/30 bg-warning/5 p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <Hourglass className="size-6" />
          </div>
          <div className="space-y-1 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-warning">
              Application Under Review
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
              Your application is under review
            </h2>
            <p className="text-sm text-muted-foreground">
              Thank you for applying to partner with Rent4Fraction. Our team is verifying your business documentation before you can begin listing inventory.
            </p>
          </div>
        </div>

        {/* Timeline: Account created -> Email verified -> Admin review (current) -> Start listing equipment */}
        <div className="border-t border-warning/20 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Onboarding Progress
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {steps.map((step, idx) => {
              const isComplete = step.status === 'complete'
              const isCurrent = step.status === 'current'

              return (
                <div
                  key={step.title}
                  className={cn(
                    'p-3 rounded-xl border transition-colors',
                    isCurrent
                      ? 'border-warning/40 bg-warning/10 shadow-xs'
                      : isComplete
                      ? 'border-border bg-surface'
                      : 'border-border/50 bg-surface/50 opacity-70',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {isComplete ? (
                      <CheckCircle2 className="size-4 text-success shrink-0" />
                    ) : isCurrent ? (
                      <Clock className="size-4 text-warning shrink-0" />
                    ) : (
                      <div className="size-4 rounded-full border border-muted-foreground/40 shrink-0 text-[10px] flex items-center justify-center font-bold text-muted-foreground">
                        {idx + 1}
                      </div>
                    )}
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        isCurrent ? 'text-warning font-bold' : isComplete ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {step.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Application summary */}
        <div className="border-t border-warning/20 pt-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Application Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-background/80 border border-border text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Business Name</span>
              <p className="font-semibold text-foreground truncate">{businessName}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Primary Email</span>
              <p className="font-semibold text-foreground truncate">{email}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Contact Phone</span>
              <p className="font-semibold text-foreground truncate">{phone}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Operating City</span>
              <p className="font-semibold text-foreground truncate">{city}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Edit details (links to profile tab), Contact support */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <AppLink to="/vendor?tab=profile">
            <Button variant="default" className="bg-brand hover:bg-brand-hover text-white">
              Edit details
            </Button>
          </AppLink>
          <AppLink to="/help?tab=contact">
            <Button variant="outline">
              Contact support
            </Button>
          </AppLink>
        </div>
      </div>
    </div>
  )
}
