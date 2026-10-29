import type {
  BookingDetail,
  DamageReport,
  ItemCondition,
  PaymentRecord,
  VendorOrder,
} from '@/types/account'

export type LifecycleRole = 'customer' | 'vendor' | 'admin' | 'system'

export type LifecycleAction =
  | 'accept'
  | 'decline'
  | 'cancel'
  | 'schedule_delivery'
  | 'schedule_pickup'
  | 'dispatch'
  | 'mark_delivered'
  | 'delivery_failed'
  | 'reschedule_delivery'
  | 'schedule_return'
  | 'mark_returned'
  | 'inspect'
  | 'complete_order'
  | 'resolve_dispute'

export interface ScheduleDeliveryPayload {
  date: string // between rental_start - 1 and rental_start
  startTime: string
  endTime: string
  deliveredBy?: string
  trackingInfo?: string
  notes?: string
}

export interface MarkDeliveredPayload {
  deliveredBy: string
  deliveredAt: string
  proofPhotoUrl?: string // Required for delivery; optional/note for pickup
  proofPublicId?: string
  notes?: string
}

export interface DeliveryFailedPayload {
  reason: string
}

export interface ScheduleReturnPayload {
  date: string // >= rental_end - 1
  startTime: string
  endTime: string
  notes?: string
}

export interface InspectionItemResult {
  itemId: string
  equipmentId: string
  equipmentName: string
  returnedQuantity: number
  condition: ItemCondition // 'Good' | 'Minor damage' | 'Major damage' | 'Lost'
  damageDescription?: string
  damageCost?: number
  deductFromDeposit?: boolean
  notes?: string
}

export interface InspectionPayload {
  items: InspectionItemResult[]
  inspectedAt?: string
  generalNotes?: string
}

export interface DisputeResolutionPayload {
  outcome: 'full' | 'partial' | 'reject'
  finalAmount: number // strictly between 0 and claim if partial, 0 if reject, claim if full
  resolutionNote: string // >= 10 chars
  resolvedBy: string
}

export interface LifecycleActionResult {
  booking: BookingDetail
  vendorOrder: VendorOrder
  createdPayout?: {
    payoutId: string
    vendorId: string
    gross: number
    commission: number
    net: number
  }
  createdDepositRefund?: PaymentRecord
  createdDamageReports?: DamageReport[]
  error?: string
}
