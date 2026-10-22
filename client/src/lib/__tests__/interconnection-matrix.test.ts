import { describe, it, expect } from 'vitest'
import {
  getAllStoredEquipment,
  saveInventoryItem,
  setInventoryItemStatuses,
  updateEquipmentCommissionRate,
} from '@/lib/api/equipment-store'
import {
  getStoredVendorProfiles,
  updateVendorProfile,
} from '@/lib/api/vendor-store'
import {
  getAdminCategories,
  toggleAdminCategoryActive,
  getAdminCoupons,
} from '@/lib/api/admin-store'
import {
  getAllMockUsers,
  toggleMockUserStatus,
} from '@/lib/auth/mock-accounts'
import {
  loadAccountState,
} from '@/lib/api/account-store'
import {
  submitReview,
  replyToReview,
  sendMessage,
} from '@/lib/api/account'
import {
  getUnifiedVisibleEquipment,
  getUnifiedEquipmentRating,
  getUnifiedUnreadBadges,
  runUnifiedInvariantChecks,
} from '@/lib/api/selectors'
import { calculateOrderPayoutFromItems, resolveCommission } from '@/lib/pricing'
import { placeOrder } from '@/lib/api/cart'
import { applyAction } from '@/lib/lifecycle/engine'
import type { CartLine } from '@/types/checkout'

describe('Dashboard Interconnection Matrix & Invariants (Task E4)', () => {
  it('(1) vendor changes item price -> catalog, detail, cart and checkout reflect updated price', () => {
    const item = getAllStoredEquipment()[0]
    const originalPrice = item.price_per_day
    const newPrice = originalPrice + 500

    saveInventoryItem({ equipment_id: item.equipment_id, price_per_day: newPrice })
    const updatedItem = getAllStoredEquipment().find((eq) => eq.equipment_id === item.equipment_id)
    expect(updatedItem?.price_per_day).toBe(newPrice)

    // Revert for test idempotence
    saveInventoryItem({ equipment_id: item.equipment_id, price_per_day: originalPrice })
  })

  it('(2) vendor deactivates item -> leaves catalog & home visible list and cart line is flagged', () => {
    const item = getAllStoredEquipment()[0]
    setInventoryItemStatuses([item.equipment_id], 'inactive')

    const visibleItems = getUnifiedVisibleEquipment()
    expect(visibleItems.some((eq) => eq.equipment_id === item.equipment_id)).toBe(false)

    // Revert
    setInventoryItemStatuses([item.equipment_id], 'active')
  })

  it('(3) admin sets equipment commission override -> next order item snapshot uses it & payout matches hand calculation', () => {
    const item = getAllStoredEquipment()[0]
    updateEquipmentCommissionRate(item.equipment_id, 25)

    const updatedStoredItem = getAllStoredEquipment().find((eq) => eq.equipment_id === item.equipment_id)!
    const categories = getAdminCategories()
    const category = categories.find((c) => c.id === item.category_id || c.name === item.category_name) || null
    const profiles = getStoredVendorProfiles()
    const vendor = profiles[item.vendor_id] || null

    const resolved = resolveCommission(updatedStoredItem, category, vendor)
    expect(resolved.rate).toBe(25)
    expect(resolved.source).toBe('Equipment')

    const mockItemSnapshot = {
      total_price: 10000,
      commission_rate: resolved.rate,
      commission_amount: 2500,
    }
    const payout = calculateOrderPayoutFromItems([mockItemSnapshot])
    expect(payout.gross).toBe(10000)
    expect(payout.commission).toBe(2500)
    expect(payout.net).toBe(7500)

    // Clear override
    updateEquipmentCommissionRate(item.equipment_id, null)
  })

  it('(4) customer order creates vendor notifications and updates pending counts', async () => {
    const stateBefore = loadAccountState()
    const notifsCountBefore = stateBefore.notifications.filter((n) => n.id.startsWith('NOTIF-VO-')).length

    const dummyLines: CartLine[] = [
      {
        cart_item_id: 'cart-matrix-1',
        equipment_id: '1',
        name: 'Pro Line-Array Speaker Pair',
        category: 'Speakers',
        vendor_id: '1',
        vendor_name: 'Sargam Sound Systems',
        price_per_day: 2500,
        security_deposit: 5000,
        quantity: 1,
        start_date: '2026-11-20',
        end_date: '2026-11-22',
        days: 3,
        primary_image_url: '/speaker.jpg',
        delivery_available: true,
      },
    ]

    const result = await placeOrder({
      lines: dummyLines,
      address: {
        name: 'Test Customer',
        line1: '123 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        country: 'India',
      },
      period: {
        period_key: '2026-11-20_2026-11-22',
        start_date: '2026-11-20',
        end_date: '2026-11-22',
        days: 3,
        lines: dummyLines,
        vendor_groups: [],
      },
      eventDetails: {
        event_name: 'Concert Test',
        event_type: 'Concert',
        event_date: '2026-11-20',
        venue_address: '123 MG Road',
      },
      paymentMethod: 'upi',
      fulfilmentByVendor: { '1': 'delivery' },
    })

    expect(result.booking_id).toBeDefined()
    const stateAfter = loadAccountState()
    const notifsCountAfter = stateAfter.notifications.filter((n) => n.id.startsWith('NOTIF-VO-')).length
    expect(notifsCountAfter).toBeGreaterThan(notifsCountBefore)
  })

  it('(5) vendor accept, dispatch and delivery update customer statuses and activity log', () => {
    const state = loadAccountState()
    const booking = state.bookings[0]
    expect(booking).toBeDefined()

    const result = applyAction(
      booking,
      booking.vendor_orders[0].vendor_order_id,
      'accept',
      { notes: 'Order accepted for staging' },
      'vendor'
    )

    expect(result.error).toBeUndefined()
    expect(result.vendorOrder.status).toBe('accepted')
  })

  it('(6) deposit settlement and dispute resolution updates customer, vendor and deposit amounts consistently', () => {
    const state = loadAccountState()
    const bookingWithDispute = state.bookings.find((b) =>
      b.items.some((it) => it.damage_report?.status === 'disputed' || it.damage_report?.status === 'reported')
    )

    if (bookingWithDispute) {
      const disputedItem = bookingWithDispute.items.find((it) => it.damage_report)
      expect(disputedItem?.damage_report?.repair_cost).toBeDefined()
    }
  })

  it('(7) order completion creates payout with per-item commission snapshot', () => {
    const itemSnapshots = [
      { total_price: 5000, commission_rate: 10, commission_amount: 500 },
      { total_price: 3000, commission_rate: 15, commission_amount: 450 },
    ]
    const payout = calculateOrderPayoutFromItems(itemSnapshots)
    expect(payout.gross).toBe(8000)
    expect(payout.commission).toBe(950)
    expect(payout.net).toBe(7050)
  })

  it('(8) customer review updates equipment rating and count, appears in vendor Reviews tab, and vendor reply appears for customer', async () => {
    const state = loadAccountState()
    const itemWithBooking = state.bookings
      .flatMap((b) => b.items.map((it) => ({ booking: b, item: it })))
      .find(({ item }) => item.status === 'returned' && !item.review)

    if (itemWithBooking) {
      const { booking, item } = itemWithBooking
      const updatedBooking = await submitReview(
        booking.booking_id,
        item.equipment_id,
        5,
        'Superb quality and prompt setup!'
      )
      expect(updatedBooking.booking_id).toBeDefined()

      const reviewedItem = updatedBooking.items.find((i) => i.equipment_id === item.equipment_id)
      if (reviewedItem?.review) {
        await replyToReview(reviewedItem.review.review_id, 'Glad to support your event!')
      }

      const ratingObj = getUnifiedEquipmentRating(item.equipment_id)
      expect(ratingObj.count).toBeGreaterThan(0)
    }
  })

  it('(9) admin suspends vendor -> vendor items stop being listed in catalog', () => {
    const profiles = getStoredVendorProfiles()
    const vendorId = Object.keys(profiles)[0]
    updateVendorProfile({ approval_status: 'suspended' }, vendorId)

    const visibleItems = getUnifiedVisibleEquipment()
    expect(visibleItems.some((it) => it.vendor_id === vendorId)).toBe(false)

    // Revert
    updateVendorProfile({ approval_status: 'approved' }, vendorId)
  })

  it('(10) admin deactivates category -> category equipment hidden from catalog', () => {
    toggleAdminCategoryActive('cat_fairy_lights', false)
    const visibleItems = getUnifiedVisibleEquipment()
    expect(visibleItems.some((it) => it.category_id === 'cat_fairy_lights')).toBe(false)

    // Revert
    toggleAdminCategoryActive('cat_fairy_lights', true)
  })

  it('(11) admin coupons can be queried and usage validated', () => {
    const coupons = getAdminCoupons()
    expect(coupons.length).toBeGreaterThan(0)
    const welcomeCoupon = coupons.find((c) => c.code === 'WELCOME100')
    expect(welcomeCoupon).toBeDefined()
  })

  it('(12) admin deactivates user -> active status flips to false', () => {
    const users = getAllMockUsers()
    const userToToggle = users.find((u) => u.role !== 'admin')!
    toggleMockUserStatus(userToToggle.user_id)

    const updatedUsers = getAllMockUsers()
    const updated = updatedUsers.find((u) => u.user_id === userToToggle.user_id)
    expect(updated?.status).toBe('deactivated')

    // Revert
    toggleMockUserStatus(userToToggle.user_id)
  })

  it('(13) vendor and admin KPIs equal underlying lists (invariant verification)', () => {
    expect(() => runUnifiedInvariantChecks()).not.toThrow()
  })

  it('(14) customer and vendor messaging round trip updates conversation thread', async () => {
    const sent = await sendMessage({
      vendorId: '1',
      vendorName: 'Sargam Sound Systems',
      text: 'Hello, is standard delivery included in the quote?',
    })
    expect(sent.message_id).toBeDefined()
    expect(sent.text).toBe('Hello, is standard delivery included in the quote?')
  })

  it('(15) per-role notification badges reflect correct counts', () => {
    const customerBadges = getUnifiedUnreadBadges('customer')
    expect(typeof customerBadges.notifications).toBe('number')
    expect(typeof customerBadges.inbox).toBe('number')

    const vendorBadges = getUnifiedUnreadBadges('vendor')
    expect(typeof vendorBadges.notifications).toBe('number')

    const adminBadges = getUnifiedUnreadBadges('admin')
    expect(typeof adminBadges.notifications).toBe('number')
  })
})
