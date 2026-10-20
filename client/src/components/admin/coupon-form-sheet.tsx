import { useEffect, useMemo, useState } from 'react'
import { EntitySheet } from '@/components/shared/entity-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Coupon } from '@/types/checkout'

interface CouponFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  coupon: Coupon | null // null for new coupon
  existingCoupons: Coupon[]
  onSave: (couponData: Coupon) => Promise<void>
}

export function CouponFormSheet({
  open,
  onOpenChange,
  coupon,
  existingCoupons,
  onSave,
}: CouponFormSheetProps) {
  const isNew = !coupon
  const todayStr = new Date().toISOString().slice(0, 10)

  const [code, setCode] = useState(coupon?.code || '')
  const [type, setType] = useState<'percent' | 'flat'>(coupon?.type || 'percent')
  const [value, setValue] = useState(String(coupon?.value || 10))
  const [minOrder, setMinOrder] = useState(String(coupon?.min_order_amount || 1000))
  const [validFrom, setValidFrom] = useState(coupon?.valid_from?.slice(0, 10) || todayStr)
  const [validTo, setValidTo] = useState(coupon?.valid_to?.slice(0, 10) || coupon?.expires_at?.slice(0, 10) || '')
  const [usageLimit, setUsageLimit] = useState(String(coupon?.usage_limit || ''))
  const [isActive, setIsActive] = useState(coupon ? coupon.is_active : true)
  const [description, setDescription] = useState(coupon?.description || '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (coupon) {
      setCode(coupon.code)
      setType(coupon.type)
      setValue(String(coupon.value))
      setMinOrder(String(coupon.min_order_amount))
      setValidFrom(coupon.valid_from?.slice(0, 10) || todayStr)
      setValidTo(coupon.valid_to?.slice(0, 10) || coupon.expires_at?.slice(0, 10) || '')
      setUsageLimit(coupon.usage_limit ? String(coupon.usage_limit) : '')
      setIsActive(coupon.is_active)
      setDescription(coupon.description || '')
    } else {
      setCode('')
      setType('percent')
      setValue('10')
      setMinOrder('1000')
      setValidFrom(todayStr)
      setValidTo('')
      setUsageLimit('')
      setIsActive(true)
      setDescription('')
    }
    setError(null)
  }, [coupon, open, todayStr])

  // Live preview sentence
  const previewSentence = useMemo(() => {
    const numVal = parseFloat(value) || 0
    const numMin = parseFloat(minOrder) || 0
    const discountText = type === 'percent' ? `${numVal}% discount` : `₹${numVal.toLocaleString('en-IN')} flat discount`
    const minText = numMin > 0 ? `on rental orders of ₹${numMin.toLocaleString('en-IN')} or more` : 'with no minimum order requirement'
    return `Customers receive a ${discountText} ${minText}.`
  }, [type, value, minOrder])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = code.trim().toUpperCase()

    // 1. Code 4 to 20 letters or digits
    if (!/^[A-Z0-9]{4,20}$/.test(cleanCode)) {
      setError('Coupon code must be 4 to 20 uppercase alphanumeric characters (e.g. FESTIVAL20).')
      return
    }

    // 2. Uniqueness
    if (isNew && existingCoupons.some((c) => c.code === cleanCode)) {
      setError('A coupon with this code already exists.')
      return
    }

    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue <= 0) {
      setError('Discount value must be greater than zero.')
      return
    }
    if (type === 'percent' && numValue > 100) {
      setError('Percentage discount cannot exceed 100%.')
      return
    }

    const numMinOrder = parseFloat(minOrder)
    if (isNaN(numMinOrder) || numMinOrder < 0) {
      setError('Minimum order amount must be 0 or greater.')
      return
    }

    if (validTo && validTo < validFrom) {
      setError('End date cannot be earlier than start date.')
      return
    }

    const numUsageLimit = usageLimit ? parseInt(usageLimit, 10) : undefined
    if (numUsageLimit !== undefined && (isNaN(numUsageLimit) || numUsageLimit < 1)) {
      setError('Usage limit must be a positive integer of at least 1.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const payload: Coupon = {
        code: cleanCode,
        type,
        value: numValue,
        min_order_amount: numMinOrder,
        valid_from: validFrom ? new Date(validFrom).toISOString() : undefined,
        valid_to: validTo ? new Date(validTo).toISOString() : undefined,
        expires_at: validTo ? new Date(validTo).toISOString() : undefined,
        usage_limit: numUsageLimit,
        used_count: coupon?.used_count || 0,
        is_active: isActive,
        description: description.trim() || undefined,
      }
      await onSave(payload)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <EntitySheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={isNew ? 'PROMOTIONAL MARKETING' : `COUPON #${coupon.code}`}
      title={isNew ? 'Create Discount Coupon' : `Edit Coupon ${coupon.code}`}
      subtitle="Configure customer cart discount rules and campaign parameters"
      widthClass="sm:max-w-[500px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Monospace Code */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Coupon Code <span className="text-destructive">*</span>
          </label>
          <Input
            value={code}
            disabled={!isNew}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            placeholder="e.g. FESTIVAL15"
            className="h-9 text-sm font-mono uppercase font-semibold tracking-wide"
            maxLength={20}
            required
          />
        </div>

        {/* Type & Value */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Discount Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'percent' | 'flat')}
              className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs text-foreground font-medium"
            >
              <option value="percent">Percentage (%)</option>
              <option value="flat">Flat Amount (₹)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Value {type === 'percent' ? '(%)' : '(₹)'} <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              step={type === 'percent' ? '0.1' : '1'}
              min="0.1"
              max={type === 'percent' ? '100' : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>
        </div>

        {/* Minimum Order */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Minimum Order Amount (₹)
          </label>
          <Input
            type="number"
            min="0"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        {/* Validity Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Valid From</label>
            <Input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Valid To <span className="text-[11px] text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              type="date"
              min={validFrom}
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Usage Limit & Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Usage Limit <span className="text-[11px] text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              type="number"
              min="1"
              placeholder="Unlimited"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {!isNew && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Redemptions</label>
              <div className="h-9 px-3 rounded-xl border border-border bg-muted/40 flex items-center text-xs text-foreground font-mono">
                {coupon.used_count} redemptions
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 15% discount for festival concert bookings."
            rows={2}
            className="text-xs resize-none"
          />
        </div>

        {/* Active Switch */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
          <div>
            <p className="text-xs font-semibold text-foreground">Active Status</p>
            <p className="text-[11px] text-muted-foreground">Enabled for checkout code entry</p>
          </div>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4 rounded text-brand focus:ring-brand"
          />
        </div>

        {/* Live Preview Sentence */}
        <div className="p-3.5 rounded-xl bg-brand/5 border border-brand/10 text-xs text-brand font-medium">
          {previewSentence}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-9 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="h-9 text-xs bg-brand hover:bg-brand-hover text-brand-foreground"
          >
            {isSubmitting ? 'Saving...' : isNew ? 'Create Coupon' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </EntitySheet>
  )
}
