import type {
  AvailabilityBlock,
  AvailabilityReason,
  EquipmentImage,
  EquipmentStatus,
  InventoryItem,
} from '@/types'
import { CANONICAL_CATEGORIES, CANONICAL_VENDORS } from '@/lib/api/canonical-ids'
import { MOCK_EQUIPMENT } from './mock-data'
import { loadAccountState } from './account-store'
import type { BookingDetail, BookingItemDetail } from '@/types/account'

const STORE_KEY = 'r4f-equipment-store-v1'
const STORE_VERSION = 1

export interface EquipmentStoreState {
  version: number
  items: InventoryItem[]
}

const GALLERY_IMAGE_SETS: Record<string, string[]> = {
  '1': [
    '/images/equipment/line-array-speaker.svg',
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80',
  ],
  '2': [
    '/images/equipment/wireless-mics.svg',
    'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1520523839898-507125cd53c1?auto=format&fit=crop&w=1200&q=80',
  ],
  '3': [
    '/images/equipment/dj-mixer.svg',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?auto=format&fit=crop&w=1200&q=80',
  ],
  '4': [
    '/images/equipment/stage-lights.svg',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
  ],
  '5': [
    '/images/equipment/fairy-lights.svg',
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80',
  ],
  '6': [
    '/images/equipment/banquet-chairs.svg',
    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
  ],
  '7': [
    '/images/equipment/cocktail-tables.svg',
    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80',
  ],
  '8': [
    '/images/equipment/pagoda-tent.svg',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
  ],
}

export function createInitialEquipmentState(): EquipmentStoreState {
  const items: InventoryItem[] = MOCK_EQUIPMENT.map((eq, index) => {
    const gallery = GALLERY_IMAGE_SETS[eq.category_id] || [eq.primary_image_url]
    const images: EquipmentImage[] = gallery.map((url, i) => ({
      image_id: `img-${eq.equipment_id}-${i + 1}`,
      url,
      is_primary: i === 0,
      sort_order: i,
    }))

    // Determine initial status based on stock and index for realistic variety
    let status: EquipmentStatus = 'active'
    if (eq.quantity === 0) {
      status = 'out_of_stock'
    } else if (index === 3) {
      status = 'inactive'
    }

    return {
      id: eq.equipment_id,
      equipment_id: eq.equipment_id,
      vendor_id: eq.vendor_id,
      vendor_name: eq.vendor_name,
      name: eq.name,
      description: eq.description,
      category_id: eq.category_id,
      category_name: eq.category_name,
      category: eq.category_name,
      parent_category_id: eq.parent_category_id,
      parent_category_name: eq.parent_category_name,
      price_per_day: eq.price_per_day,
      price: eq.price_per_day,
      security_deposit: eq.security_deposit,
      deposit: eq.security_deposit,
      quantity: eq.quantity || 6,
      stock: eq.quantity || 6,
      min_rental_days: eq.min_rental_days || 1,
      delivery_available: eq.delivery_available,
      avg_rating: eq.avg_rating,
      rating: eq.avg_rating,
      review_count: eq.review_count,
      reviews: eq.review_count,
      status,
      primary_image_url: eq.primary_image_url,
      image: eq.primary_image_url,
      images,
      includes: [
        'Professional setup guidance',
        'Protective road transport case',
        'All necessary cables and adaptors',
        'Pre-dispatch inspection and functional test',
      ],
      specifications: eq.specifications || {},
      blocked_ranges: [],
      updated_at: '2026-10-18T10:00:00Z',
      updated: '2026-10-18T10:00:00Z',
      created_at: '2026-06-01T10:00:00Z',
    }
  })

  return {
    version: STORE_VERSION,
    items,
  }
}

let memoryEquipmentState: EquipmentStoreState | null = null

export function getStoredEquipmentState(): EquipmentStoreState {
  if (typeof window === 'undefined') {
    if (!memoryEquipmentState) {
      memoryEquipmentState = createInitialEquipmentState()
    }
    return memoryEquipmentState
  }

  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) {
      const initial = createInitialEquipmentState()
      localStorage.setItem(STORE_KEY, JSON.stringify(initial))
      return initial
    }

    const parsed: EquipmentStoreState = JSON.parse(raw)
    if (!parsed.version || parsed.version < STORE_VERSION || !Array.isArray(parsed.items)) {
      const initial = createInitialEquipmentState()
      localStorage.setItem(STORE_KEY, JSON.stringify(initial))
      return initial
    }

    return parsed
  } catch (err) {
    console.error('[EquipmentStore] Failed to parse stored state, resetting to initial', err)
    const initial = createInitialEquipmentState()
    return initial
  }
}

export function saveStoredEquipmentState(state: EquipmentStoreState): void {
  if (typeof window === 'undefined') {
    memoryEquipmentState = state
    return
  }
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state))
  } catch (err) {
    console.error('[EquipmentStore] Failed to save state to localStorage', err)
  }
}

export function enrichInventoryItem(item: Partial<InventoryItem> & { equipment_id: string }): InventoryItem {
  const now = new Date().toISOString()
  return {
    ...item,
    equipment_id: item.equipment_id,
    id: item.equipment_id,
    vendor_id: item.vendor_id || '1',
    vendor_name: item.vendor_name || 'Sargam Sound Systems',
    name: item.name || 'Untitled Equipment',
    description: item.description || '',
    category_id: item.category_id || 'sound',
    category_name: item.category_name || item.category || 'Sound',
    category: item.category_name || item.category || 'Sound',
    parent_category_id: item.parent_category_id ?? null,
    parent_category_name: item.parent_category_name ?? null,
    price_per_day: item.price_per_day ?? item.price ?? 1000,
    price: item.price_per_day ?? item.price ?? 1000,
    security_deposit: item.security_deposit ?? item.deposit ?? 2000,
    deposit: item.security_deposit ?? item.deposit ?? 2000,
    quantity: item.quantity ?? item.stock ?? 1,
    stock: item.quantity ?? item.stock ?? 1,
    min_rental_days: item.min_rental_days ?? 1,
    delivery_available: item.delivery_available ?? true,
    avg_rating: item.avg_rating ?? item.rating ?? 4.8,
    rating: item.avg_rating ?? item.rating ?? 4.8,
    review_count: item.review_count ?? item.reviews ?? 0,
    reviews: item.review_count ?? item.reviews ?? 0,
    status: item.status || 'active',
    primary_image_url: item.primary_image_url || item.image || '',
    image: item.primary_image_url || item.image || '',
    images: item.images || [],
    includes: item.includes || item.included || [],
    included: item.includes || item.included || [],
    specifications: item.specifications || {},
    blocked_ranges: item.blocked_ranges || [],
    commission_rate: item.commission_rate !== undefined ? item.commission_rate : null,
    created_at: item.created_at || now,
    updated_at: item.updated_at || item.updated || now,
    updated: item.updated_at || item.updated || now,
  }
}

export function updateEquipmentCommissionRate(
  equipmentId: string,
  rate: number | null
): InventoryItem {
  const state = getStoredEquipmentState()
  const index = state.items.findIndex((item) => item.equipment_id === equipmentId)
  if (index === -1) {
    throw new Error(`Equipment item with ID ${equipmentId} not found`)
  }
  const existing = state.items[index]
  const clampedRate = rate !== null && rate !== undefined && !isNaN(Number(rate))
    ? Math.round(Math.max(0, Math.min(100, Number(rate))) * 100) / 100
    : null
  const updated = enrichInventoryItem({
    ...existing,
    commission_rate: clampedRate,
    updated_at: new Date().toISOString(),
  })
  state.items[index] = updated
  saveStoredEquipmentState(state)
  return updated
}

export function getAllStoredEquipment(): InventoryItem[] {
  return getStoredEquipmentState().items.map(enrichInventoryItem)
}

/**
 * Filtered inventory query for Vendor inventory page.
 */
export function queryInventory(
  params: {
    vendorId?: string
    q?: string
    status?: string
    category?: string
    stock?: 'all' | 'low'
    sort?: 'updated' | 'name' | 'price' | 'stock' | 'rating'
    page?: number
    pageSize?: number
  } = {},
  vendorIdOverride?: string
): {
  items: InventoryItem[]
  total: number
  page: number
  pageSize: number
  stats: {
    total: number
    active: number
    low_stock: number
    out_of_stock: number
  }
} {
  const all = getAllStoredEquipment()
  const vendorId = vendorIdOverride || params.vendorId || '1' // Default to Sargam Sound Systems (Vendor 1)

  // Scope to vendor
  const vendorItems = all.filter(
    (item) => item.vendor_id === vendorId || (vendorId === '1' && item.vendor_id === 'v_sargam')
  )

  const stats = {
    total: vendorItems.length,
    active: vendorItems.filter((i) => i.status === 'active').length,
    low_stock: vendorItems.filter((i) => i.quantity > 0 && i.quantity <= 2 && i.status !== 'archived').length,
    out_of_stock: vendorItems.filter((i) => i.quantity === 0 && i.status !== 'archived').length,
  }

  const filtered = vendorItems.filter((item) => {
    // Search query
    if (params.q && params.q.trim()) {
      const q = params.q.trim().toLowerCase()
      const match = `${item.name} ${item.description} ${item.category_name}`.toLowerCase().includes(q)
      if (!match) return false
    }

    // Status filter
    if (params.status && params.status !== 'all') {
      if (item.status !== params.status) return false
    }

    // Category filter
    if (params.category && params.category !== 'all') {
      if (item.category_id !== params.category) return false
    }

    // Stock filter
    if (params.stock === 'low') {
      if (item.quantity > 2 || item.status === 'archived') return false
    }

    return true
  })

  // Sort
  const sort = params.sort || 'updated'
  filtered.sort((a, b) => {
    switch (sort) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'price':
        return a.price_per_day - b.price_per_day
      case 'stock':
        return a.quantity - b.quantity
      case 'rating':
        return b.avg_rating - a.avg_rating
      case 'updated':
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    }
  })

  const page = Math.max(1, params.page || 1)
  const pageSize = params.pageSize || 10
  const start = (page - 1) * pageSize
  const paginated = filtered.slice(start, start + pageSize).map(enrichInventoryItem)

  return {
    items: paginated,
    total: filtered.length,
    page,
    pageSize,
    stats,
  }
}

export function getInventoryItemById(id: string): InventoryItem | null {
  const all = getAllStoredEquipment()
  const found = all.find((item) => item.equipment_id === id)
  return found ? enrichInventoryItem(found) : null
}

export function saveInventoryItem(
  data: Partial<InventoryItem> & { equipment_id?: string },
  vendorId = '1'
): InventoryItem {
  const state = getStoredEquipmentState()
  const now = new Date().toISOString()
  const vendor = CANONICAL_VENDORS.find((v) => v.id === vendorId) || CANONICAL_VENDORS[0]

  let savedItem: InventoryItem

  if (data.equipment_id && data.equipment_id !== 'new') {
    // Update existing item
    const index = state.items.findIndex((item) => item.equipment_id === data.equipment_id)
    if (index === -1) {
      throw new Error(`Equipment item with ID ${data.equipment_id} not found`)
    }

    const existing = state.items[index]
    const updatedImages = data.images || existing.images
    const primaryImgObj = (updatedImages as EquipmentImage[]).find((img) => typeof img === 'object' && img?.is_primary)
    const primaryImg = (primaryImgObj && 'url' in primaryImgObj && primaryImgObj.url ? primaryImgObj.url : null) || existing.primary_image_url

    savedItem = enrichInventoryItem({
      ...existing,
      ...data,
      equipment_id: existing.equipment_id,
      vendor_id: existing.vendor_id,
      vendor_name: existing.vendor_name,
      primary_image_url: primaryImg || existing.primary_image_url,
      images: updatedImages as EquipmentImage[],
      updated_at: now,
    })

    state.items[index] = savedItem
  } else {
    // Create new item with stable incrementing ID
    const maxNum = state.items.reduce((max, i) => {
      const num = parseInt(i.equipment_id, 10)
      return !isNaN(num) && num > max ? num : max
    }, 36)
    const newId = String(maxNum + 1)

    const cat = CANONICAL_CATEGORIES.find((c) => c.id === data.category_id) || CANONICAL_CATEGORIES[0]
    const rawImages = data.images && data.images.length > 0 ? data.images : [
      {
        image_id: `img-${newId}-1`,
        url: cat.image || '/images/equipment/line-array-speaker.svg',
        is_primary: true,
        sort_order: 0,
      },
    ]

    const images: EquipmentImage[] = rawImages.map((img: EquipmentImage | string, i: number) => {
      if (typeof img === 'string') {
        return {
          image_id: `img-${newId}-${i + 1}`,
          url: img,
          is_primary: i === 0,
          sort_order: i,
        }
      }
      return img
    })

    const primaryImg = images.find((i) => i.is_primary)?.url || images[0]?.url || ''

    savedItem = enrichInventoryItem({
      equipment_id: newId,
      vendor_id: vendorId,
      vendor_name: vendor.name,
      name: data.name || 'Untitled Equipment',
      description: data.description || '',
      category_id: cat.id,
      category_name: cat.name,
      parent_category_id: cat.groupId,
      parent_category_name: cat.groupName,
      price_per_day: data.price_per_day ?? 1000,
      security_deposit: data.security_deposit ?? 2000,
      quantity: data.quantity ?? 1,
      min_rental_days: data.min_rental_days ?? 1,
      delivery_available: data.delivery_available ?? true,
      avg_rating: 0,
      review_count: 0,
      status: (data.status as EquipmentStatus) || 'active',
      primary_image_url: primaryImg || '',
      images,
      includes: data.includes || ['Standard accessories', 'User guide'],
      specifications: data.specifications || {},
      blocked_ranges: [],
      created_at: now,
      updated_at: now,
    })

    state.items.unshift(savedItem)
  }

  saveStoredEquipmentState(state)
  return savedItem
}

export function setInventoryItemStatuses(ids: string[], status: EquipmentStatus): void {
  const state = getStoredEquipmentState()
  const now = new Date().toISOString()
  let changed = false

  state.items = state.items.map((item) => {
    if (ids.includes(item.equipment_id)) {
      changed = true
      return { ...item, status, updated_at: now }
    }
    return item
  })

  if (changed) {
    saveStoredEquipmentState(state)
  }
}

export function duplicateInventoryItem(id: string): InventoryItem {
  const state = getStoredEquipmentState()
  const original = state.items.find((item) => item.equipment_id === id)
  if (!original) {
    throw new Error(`Equipment item with ID ${id} not found`)
  }

  const maxNum = state.items.reduce((max, i) => {
    const num = parseInt(i.equipment_id, 10)
    return !isNaN(num) && num > max ? num : max
  }, 36)
  const newId = String(maxNum + 1)
  const now = new Date().toISOString()

  const duplicated: InventoryItem = {
    ...original,
    equipment_id: newId,
    name: `${original.name} (Copy)`,
    status: 'inactive', // Duplicated items start as inactive by default
    review_count: 0,
    avg_rating: 0,
    blocked_ranges: [],
    created_at: now,
    updated_at: now,
  }

  state.items.unshift(duplicated)
  saveStoredEquipmentState(state)
  return duplicated
}

/**
 * Checks if an item can be archived.
 * Rule: Archiving is blocked when the item has active or upcoming bookings.
 */
export function checkCanArchiveEquipment(id: string): { canArchive: boolean; reason?: string } {
  const accountState = loadAccountState()
  const todayStr = new Date().toISOString().split('T')[0]

  const activeOrUpcoming = accountState.bookings.filter((b: BookingDetail) => {
    // Only check active or upcoming bookings
    if (b.status === 'completed' || b.status === 'cancelled') return false
    // Booking end date is today or in future
    return b.end_date >= todayStr
  })

  const targetItem = getInventoryItemById(id)
  const targetName = targetItem?.name.toLowerCase()

  for (const booking of activeOrUpcoming) {
    const hasItem = booking.items.some((item: BookingItemDetail) => {
      if (item.equipment_id === id) return true
      if (targetName && item.name.toLowerCase() === targetName) return true
      if (id === '1' && (item.equipment_id === 'eq_speaker_pair_01' || item.name.includes('Line-Array'))) return true
      return false
    })
    if (hasItem) {
      return {
        canArchive: false,
        reason: `Cannot archive item because it is reserved in booking ${booking.booking_id} (${booking.event_name}) from ${booking.start_date} to ${booking.end_date}.`,
      }
    }
  }

  return { canArchive: true }
}

export function archiveEquipmentItem(id: string): { success: boolean; error?: string } {
  const check = checkCanArchiveEquipment(id)
  if (!check.canArchive) {
    return { success: false, error: check.reason }
  }

  setInventoryItemStatuses([id], 'archived')
  return { success: true }
}

/**
 * Retrieves booked quantities per date for an item from active/confirmed bookings.
 */
export function getBookedUnitsPerDay(
  equipmentId: string
): { date: string; quantity: number; order_id: string }[] {
  const accountState = loadAccountState()
  const bookedList: { date: string; quantity: number; order_id: string }[] = []

  accountState.bookings.forEach((booking: BookingDetail) => {
    if (booking.status === 'cancelled') return

    const item = booking.items.find(
      (i: BookingItemDetail) => i.equipment_id === equipmentId || i.name.toLowerCase().includes(equipmentId.toLowerCase())
    )
    if (!item) return

    const start = new Date(booking.start_date)
    const end = new Date(booking.end_date)
    const cur = new Date(start)

    while (cur <= end) {
      bookedList.push({
        date: cur.toISOString().split('T')[0],
        quantity: item.quantity,
        order_id: booking.booking_id,
      })
      cur.setDate(cur.getDate() + 1)
    }
  })

  return bookedList
}

/**
 * Validates whether requested units can be blocked across date interval.
 * Invariant: Cannot block more units than are free on any day in the range.
 */
export function validateBlockUnits(
  equipmentId: string,
  startDate: string,
  endDate: string,
  requestedUnits: number
): { valid: boolean; maxAvailable: number; message?: string } {
  const item = getInventoryItemById(equipmentId)
  if (!item) {
    return { valid: false, maxAvailable: 0, message: 'Equipment not found' }
  }

  if (endDate < startDate) {
    return { valid: false, maxAvailable: 0, message: 'End date must be on or after start date.' }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  if (startDate < todayStr) {
    return { valid: false, maxAvailable: 0, message: 'Cannot block past dates.' }
  }

  const totalStock = item.quantity
  const bookedDays = getBookedUnitsPerDay(equipmentId)

  const cur = new Date(startDate)
  const end = new Date(endDate)
  let minFreeUnits = totalStock
  let bottleneckDate = ''

  while (cur <= end) {
    const curStr = cur.toISOString().split('T')[0]

    // Booked units on curStr
    const bookedOnDate = bookedDays
      .filter((b) => b.date === curStr)
      .reduce((sum, b) => sum + b.quantity, 0)

    // Existing custom blocks on curStr
    const blockedOnDate = item.blocked_ranges
      .filter((b) => b.start_date <= curStr && b.end_date >= curStr)
      .reduce((sum, b) => sum + b.quantity, 0)

    const freeUnits = Math.max(0, totalStock - bookedOnDate - blockedOnDate)
    if (freeUnits < minFreeUnits) {
      minFreeUnits = freeUnits
      bottleneckDate = curStr
    }

    cur.setDate(cur.getDate() + 1)
  }

  if (requestedUnits > minFreeUnits) {
    const dObj = new Date(bottleneckDate)
    const dateFormatted = dObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    return {
      valid: false,
      maxAvailable: minFreeUnits,
      message: `Only ${minFreeUnits} unit${minFreeUnits === 1 ? '' : 's'} free on ${dateFormatted}. Cannot block ${requestedUnits} units.`,
    }
  }

  return {
    valid: true,
    maxAvailable: minFreeUnits,
  }
}

export function addAvailabilityBlock(
  equipmentId: string,
  blockData: {
    start_date: string
    end_date: string
    reason: AvailabilityReason
    quantity?: number
    units?: number
    note?: string
  }
): AvailabilityBlock {
  const qty = blockData.quantity ?? blockData.units ?? 1
  const validation = validateBlockUnits(
    equipmentId,
    blockData.start_date,
    blockData.end_date,
    qty
  )

  if (!validation.valid) {
    throw new Error(validation.message || 'Cannot block requested units.')
  }

  const state = getStoredEquipmentState()
  const item = state.items.find((i) => i.equipment_id === equipmentId)
  if (!item) {
    throw new Error(`Equipment item with ID ${equipmentId} not found`)
  }

  const blockId = `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const newBlock: AvailabilityBlock = {
    id: blockId,
    block_id: blockId,
    equipment_id: equipmentId,
    start_date: blockData.start_date,
    end_date: blockData.end_date,
    reason: blockData.reason,
    units: qty,
    quantity: qty,
    note: blockData.note,
    created_at: new Date().toISOString(),
  }

  item.blocked_ranges.push(newBlock)
  item.updated_at = new Date().toISOString()
  saveStoredEquipmentState(state)

  return newBlock
}

export function removeAvailabilityBlock(equipmentId: string, blockId: string): void {
  const state = getStoredEquipmentState()
  const item = state.items.find((i) => i.equipment_id === equipmentId)
  if (!item) return

  item.blocked_ranges = item.blocked_ranges.filter((b) => b.id !== blockId && b.block_id !== blockId)
  item.updated_at = new Date().toISOString()
  saveStoredEquipmentState(state)
}

export function getAvailability(equipmentId: string): {
  equipment_id: string
  total_quantity: number
  blocks: AvailabilityBlock[]
} | null {
  const item = getInventoryItemById(equipmentId)
  if (!item) return null
  return {
    equipment_id: equipmentId,
    total_quantity: item.quantity,
    blocks: item.blocked_ranges,
  }
}
