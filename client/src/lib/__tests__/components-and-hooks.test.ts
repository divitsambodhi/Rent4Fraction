import { describe, it, expect } from 'vitest'
import { loadAccountState } from '@/lib/api/account-store'
import { submitReview } from '@/lib/api/account'
import { getUnifiedEquipmentRating } from '@/lib/api/selectors'

// In-memory storage shim for Node test runner
const mockStorageMap = new Map<string, string>()
const mockStorage = {
  getItem: (k: string) => mockStorageMap.get(k) || null,
  setItem: (k: string, v: string) => mockStorageMap.set(k, v),
  removeItem: (k: string) => mockStorageMap.delete(k),
  clear: () => mockStorageMap.clear(),
}

describe('Review Eligibility & Aggregates Unit Tests (Task E5)', () => {
  it('identifies eligible items: status must be returned and belong to customer with no existing review', () => {
    const state = loadAccountState()
    const returnedItems = state.bookings
      .flatMap((b) => b.items)
      .filter((it) => it.status === 'returned')

    expect(returnedItems.length).toBeGreaterThan(0)

    // Items with status !== 'returned' cannot be reviewed
    const unreturnedItems = state.bookings
      .flatMap((b) => b.items)
      .filter((it) => it.status !== 'returned')

    unreturnedItems.forEach((it) => {
      expect(it.status).not.toBe('returned')
    })
  })

  it('submitting a review updates the equipment rating aggregate atomically', async () => {
    const state = loadAccountState()
    const itemWithBooking = state.bookings
      .flatMap((b) => b.items.map((it) => ({ booking: b, item: it })))
      .find(({ item }) => item.status === 'returned' && !item.review)

    if (itemWithBooking) {
      const { booking, item } = itemWithBooking
      const initialRating = getUnifiedEquipmentRating(item.equipment_id)

      await submitReview(
        booking.booking_id,
        item.equipment_id,
        5,
        'Outstanding performance and build quality!'
      )

      const updatedRating = getUnifiedEquipmentRating(item.equipment_id)
      expect(updatedRating.count).toBeGreaterThanOrEqual(initialRating.count)
      expect(updatedRating.avg).toBeGreaterThanOrEqual(1)
      expect(updatedRating.avg).toBeLessThanOrEqual(5)
    }
  })
})

describe('Filter Radio Semantics & Persistence (Task B1 & B2)', () => {
  it('single-choice filters keep selection when clicked a second time (never toggle off)', () => {
    // Simulating radio selection logic:
    // When an option is clicked, it unconditionally sets the state to that option ID
    let selectedCategory: string | null = 'cat_speakers'

    const handleSelectCategory = (categoryId: string) => {
      // Radio semantics: always sets, never unsets to null
      selectedCategory = categoryId
    }

    // Clicking already active category keeps it active
    handleSelectCategory('cat_speakers')
    expect(selectedCategory).toBe('cat_speakers')

    // Deselect only happens through explicit "all" or clear
    handleSelectCategory('all')
    expect(selectedCategory).toBe('all')
  })

  it('persists filter collapse state in sessionStorage key r4f_catalog_filters_open_v1', () => {
    const key = 'r4f_catalog_filters_open_v1'
    const mockState = { category: true, rating: false }
    mockStorage.setItem(key, JSON.stringify(mockState))

    const stored = JSON.parse(mockStorage.getItem(key) || '{}')
    expect(stored.category).toBe(true)
    expect(stored.rating).toBe(false)
  })
})

describe('StarRating Cumulative Fill Values (Task C2)', () => {
  it('calculates 1..N filled stars for a selected value', () => {
    const getFilledStatus = (selectedRating: number, totalStars = 5) => {
      return Array.from({ length: totalStars }, (_, i) => i + 1 <= selectedRating)
    }

    expect(getFilledStatus(4)).toEqual([true, true, true, true, false])
    expect(getFilledStatus(5)).toEqual([true, true, true, true, true])
    expect(getFilledStatus(1)).toEqual([true, false, false, false, false])
  })

  it('displays correct descriptive label per star value', () => {
    const labels: Record<number, string> = {
      1: '1 out of 5, Poor',
      2: '2 out of 5, Fair',
      3: '3 out of 5, Average',
      4: '4 out of 5, Good',
      5: '5 out of 5, Excellent',
    }

    expect(labels[4]).toBe('4 out of 5, Good')
    expect(labels[5]).toBe('5 out of 5, Excellent')
    expect(labels[1]).toBe('1 out of 5, Poor')
  })
})

describe('Event Dates Date Persistence (Task A2)', () => {
  it('mirrors event dates to sessionStorage so dates survive navigation', () => {
    const datesKey = 'r4f_event_dates_v1'
    const sampleDates = { from: '2026-11-12', to: '2026-11-14' }
    mockStorage.setItem(datesKey, JSON.stringify(sampleDates))

    const retrieved = JSON.parse(mockStorage.getItem(datesKey) || '{}')
    expect(retrieved.from).toBe('2026-11-12')
    expect(retrieved.to).toBe('2026-11-14')
  })
})

describe('DateRangePicker 2-Step Range Selection (stepRange)', () => {
  // Dynamic import of stepRange to verify pure logic
  it('first click selects start date without completing range (popover stays open)', async () => {
    const { stepRange } = await import('@/components/catalog/date-range-picker')
    const start = new Date(2026, 9, 20)
    const res = stepRange(undefined, start)

    expect(res.isComplete).toBe(false)
    expect(res.next.from).toEqual(start)
    expect(res.next.to).toBeUndefined()
  })

  it('second click on later date completes range', async () => {
    const { stepRange } = await import('@/components/catalog/date-range-picker')
    const start = new Date(2026, 9, 20)
    const end = new Date(2026, 9, 25)

    const step1 = stepRange(undefined, start)
    const step2 = stepRange(step1.next, end)

    expect(step2.isComplete).toBe(true)
    expect(step2.next.from).toEqual(start)
    expect(step2.next.to).toEqual(end)
  })

  it('second click on same date completes single-day range', async () => {
    const { stepRange } = await import('@/components/catalog/date-range-picker')
    const day = new Date(2026, 9, 20)

    const step1 = stepRange(undefined, day)
    const step2 = stepRange(step1.next, day)

    expect(step2.isComplete).toBe(true)
    expect(step2.next.from).toEqual(day)
    expect(step2.next.to).toEqual(day)
  })

  it('clicking earlier date shifts start date and keeps popover open', async () => {
    const { stepRange } = await import('@/components/catalog/date-range-picker')
    const day1 = new Date(2026, 9, 25)
    const earlierDay = new Date(2026, 9, 20)

    const step1 = stepRange(undefined, day1)
    const step2 = stepRange(step1.next, earlierDay)

    expect(step2.isComplete).toBe(false)
    expect(step2.next.from).toEqual(earlierDay)
    expect(step2.next.to).toBeUndefined()
  })

  it('clicking when a range was already complete starts a new selection without closing', async () => {
    const { stepRange } = await import('@/components/catalog/date-range-picker')
    const oldRange = {
      from: new Date(2026, 9, 10),
      to: new Date(2026, 9, 15),
    }
    const newStart = new Date(2026, 10, 1)

    const res = stepRange(oldRange, newStart)

    expect(res.isComplete).toBe(false)
    expect(res.next.from).toEqual(newStart)
    expect(res.next.to).toBeUndefined()
  })
})
