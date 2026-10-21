import { useMemo, useState } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Stepper } from '@/components/shared/stepper'
import { Icon } from '@/components/ui/icon'
import type { BookingItemDetail, ItemCondition } from '@/types/account'
import type { InspectionItemResult, InspectionPayload } from '@/lib/lifecycle'
import { cn } from '@/lib/utils'

interface InspectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  items: BookingItemDetail[]
  equipmentDeposits?: Record<string, number>
  onConfirm: (payload: InspectionPayload) => Promise<void>
}

interface ItemFormState {
  returnedQuantity: number
  condition: ItemCondition
  description: string
  cost: number
  deductFromDeposit: boolean
  notes: string
}

export function InspectionDialog({
  open,
  onOpenChange,
  orderId,
  items,
  equipmentDeposits = {},
  onConfirm,
}: InspectionDialogProps) {
  const [step, setStep] = useState(1) // 1: Conditions, 2: Damage Details, 3: Review
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize per-item inspection form state
  const [formState, setFormState] = useState<Record<string, ItemFormState>>(() => {
    const init: Record<string, ItemFormState> = {}
    items.forEach((it) => {
      init[it.item_id] = {
        returnedQuantity: it.quantity,
        condition: 'Good',
        description: '',
        cost: 0,
        deductFromDeposit: true,
        notes: '',
      }
    })
    return init
  })

  // Has any item with damage?
  const hasDamage = useMemo(() => {
    return Object.values(formState).some((s) => s.condition !== 'Good')
  }, [formState])

  // Total deposit held for these items
  const totalDepositHeld = useMemo(() => {
    return items.reduce((sum, it) => {
      const unitDeposit = equipmentDeposits[it.equipment_id] ?? 2000
      return sum + unitDeposit * (it.quantity || 1)
    }, 0)
  }, [items, equipmentDeposits])

  // Total claimed damage cost
  const totalClaimed = useMemo(() => {
    return Object.values(formState).reduce((sum, s) => {
      if (s.condition !== 'Good' && s.deductFromDeposit) {
        return sum + (Number(s.cost) || 0)
      }
      return sum
    }, 0)
  }, [formState])

  const steps = useMemo(() => {
    if (!hasDamage) {
      return [
        { id: 1, title: 'Item Condition' },
        { id: 2, title: 'Review & Submit' },
      ]
    }
    return [
      { id: 1, title: 'Item Condition' },
      { id: 2, title: 'Damage Details' },
      { id: 3, title: 'Review & Submit' },
    ]
  }, [hasDamage])

  const handleNext = () => {
    setError(null)
    if (step === 1) {
      if (hasDamage) {
        setStep(2)
      } else {
        setStep(2) // Jump to Review for clean returns
      }
    } else if (step === 2 && hasDamage) {
      // Validate damage descriptions
      for (const it of items) {
        const state = formState[it.item_id]
        if (state.condition !== 'Good') {
          if (!state.description || state.description.trim().length < 10) {
            setError(`Please provide a damage description with at least 10 characters for "${it.name}".`)
            return
          }
        }
      }
      setStep(3)
    }
  }

  const handleBack = () => {
    setError(null)
    if (step === 3 && hasDamage) {
      setStep(2)
    } else if (step === 2) {
      setStep(1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const results: InspectionItemResult[] = items.map((it) => {
        const s = formState[it.item_id]
        return {
          itemId: it.item_id,
          equipmentId: it.equipment_id,
          equipmentName: it.name,
          returnedQuantity: s.returnedQuantity,
          condition: s.condition,
          damageDescription: s.condition !== 'Good' ? s.description : undefined,
          damageCost: s.condition !== 'Good' ? Number(s.cost) : 0,
          deductFromDeposit: s.deductFromDeposit,
          notes: s.notes,
        }
      })

      await onConfirm({ items: results })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateItem = (itemId: string, patch: Partial<ItemFormState>) => {
    setFormState((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch },
    }))
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      fullScreenMobile={true}
      overlayId="inspection-dialog"
      title={`Return Inspection · ${orderId}`}
      description="Verify condition, counts, and file damage claims."
      className="sm:max-w-[760px]"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between w-full gap-2">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
                className="h-11 sm:h-9 text-xs w-full sm:w-auto"
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-11 sm:h-9 text-xs w-full sm:w-auto"
            >
              Cancel
            </Button>

            {step < (hasDamage ? 3 : 2) ? (
              <Button
                type="button"
                onClick={handleNext}
                className="h-11 sm:h-9 text-xs bg-brand hover:bg-brand-hover text-brand-foreground w-full sm:w-auto"
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={cn(
                  'h-11 sm:h-9 text-xs w-full sm:w-auto',
                  hasDamage
                    ? 'bg-brand hover:bg-brand-hover text-brand-foreground'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                )}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Inspection'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="pt-1 pb-3">
          <Stepper steps={steps} currentStep={step} />
        </div>

        {/* STEP 1: Conditions & Quantities */}
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Item Condition Assessment
            </h4>

            <div className="space-y-4">
              {items.map((it) => {
                const s = formState[it.item_id]
                return (
                  <div
                    key={it.item_id}
                    className="p-4 rounded-xl border border-border bg-card space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{it.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Delivered: {it.quantity} unit{it.quantity > 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Returned:</label>
                        <select
                          value={s.returnedQuantity}
                          onChange={(e) =>
                            updateItem(it.item_id, { returnedQuantity: parseInt(e.target.value, 10) })
                          }
                          className="h-10 sm:h-8 px-2 rounded-lg border border-border bg-card text-base sm:text-xs text-foreground font-semibold"
                        >
                          {Array.from({ length: it.quantity + 1 }).map((_, q) => (
                            <option key={q} value={q}>
                              {q}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Physical Condition</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['Good', 'Minor damage', 'Major damage', 'Lost'] as ItemCondition[]).map(
                          (cond) => {
                            const isSelected = s.condition === cond
                            return (
                              <button
                                key={cond}
                                type="button"
                                onClick={() => updateItem(it.item_id, { condition: cond })}
                                className={cn(
                                  'min-h-[44px] py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer',
                                  isSelected
                                    ? cond === 'Good'
                                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold'
                                      : 'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-400 font-semibold'
                                    : 'bg-card border-border text-muted-foreground hover:border-foreground/40'
                                )}
                              >
                                {cond}
                              </button>
                            )
                          }
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Damage Details (if damage exists) */}
        {step === 2 && hasDamage && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Icon name="alert" size={16} className="shrink-0" />
              <span>
                Please describe the physical damage observed and estimate repair or replacement costs.
              </span>
            </div>

            <div className="space-y-4">
              {items
                .filter((it) => formState[it.item_id].condition !== 'Good')
                .map((it) => {
                  const s = formState[it.item_id]
                  const unitDep = equipmentDeposits[it.equipment_id] ?? 2000
                  const itemDepositShare = unitDep * it.quantity
                  return (
                    <div
                      key={it.item_id}
                      className="p-4 rounded-xl border border-border bg-card space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{it.name}</span>
                        <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                          Condition: {s.condition}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Damage Description <span className="text-destructive">*</span>
                        </label>
                        <Textarea
                          value={s.description}
                          onChange={(e) => updateItem(it.item_id, { description: e.target.value })}
                          placeholder="e.g. Deep dent on speaker horn grill and cracked mounting bracket. Requires component swap."
                          rows={2}
                          className="text-base sm:text-xs resize-none"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                            <span>Estimated Repair Cost (₹)</span>
                            <span className="text-[11px] text-muted-foreground font-normal">
                              Held: ₹{itemDepositShare.toLocaleString('en-IN')}
                            </span>
                          </label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={s.cost || ''}
                            onChange={(e) => updateItem(it.item_id, { cost: parseFloat(e.target.value) || 0 })}
                            placeholder="e.g. 1500"
                            className="text-base sm:text-xs h-11 sm:h-9"
                          />
                        </div>

                        <div className="flex items-center justify-between min-h-[44px] px-3 rounded-lg bg-muted/20 border border-border">
                          <label className="text-xs font-medium text-foreground cursor-pointer">
                            Deduct from deposit share
                          </label>
                          <input
                            type="checkbox"
                            checked={s.deductFromDeposit}
                            onChange={(e) => updateItem(it.item_id, { deductFromDeposit: e.target.checked })}
                            className="size-5 rounded text-brand focus:ring-brand cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* STEP 3: Review & Summary (or Step 2 when no damage) */}
        {(step === 3 || (!hasDamage && step === 2)) && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Inspection Summary & Outcome
            </h4>

            {!hasDamage ? (
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                  <Icon name="check" size={20} />
                  <span>All Items Returned in Clean & Good Condition</span>
                </div>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                  Submitting this inspection will immediately mark the order <strong>Completed</strong>. Your
                  vendor payout will be created and the customer's full security deposit share of{' '}
                  <strong>₹{totalDepositHeld.toLocaleString('en-IN')}</strong> will be refunded.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {totalClaimed > totalDepositHeld && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                    <Icon name="alert" size={16} className="shrink-0" />
                    <span>
                      <strong>Warning:</strong> Total claimed damage (₹{totalClaimed.toLocaleString('en-IN')})
                      exceeds the deposit share held (₹{totalDepositHeld.toLocaleString('en-IN')}). Platform
                      arbitration will cap deduction to the available deposit.
                    </span>
                  </div>
                )}

                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between text-xs py-1 border-b border-border">
                    <span className="text-muted-foreground">Deposit Share Held</span>
                    <strong className="text-foreground">₹{totalDepositHeld.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-border">
                    <span className="text-muted-foreground">Total Claimed Deductions</span>
                    <strong className="text-destructive">−₹{totalClaimed.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-muted-foreground">Estimated Customer Refund</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      ₹{Math.max(0, totalDepositHeld - totalClaimed).toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Upon submission, a damage report will be presented to the customer. They may accept the deduction
                  or dispute it for admin review. Order completion will proceed once all claims are resolved.
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
                <Icon name="alert" size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  )
}
