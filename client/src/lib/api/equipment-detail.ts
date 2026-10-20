import type {
  EquipmentAvailability,
  EquipmentDetail,
  EquipmentImage,
  EquipmentListingView,
  Review,
  ReviewsResponse,
  VendorDetail,
} from '@/types'
import {
  CANONICAL_CATEGORIES,
  CANONICAL_GROUPS,
  CANONICAL_VENDORS,
} from './canonical-ids'
import { MOCK_EQUIPMENT } from './mock-data'

const DEFAULT_DELAY = 120

function shouldSimulate(type: 'error' | 'unavailable', paramSimulate?: string): boolean {
  if (paramSimulate === type) return true
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    return params.get('simulate') === type
  }
  return false
}

// Curated high quality image galleries matching gear categories
const GALLERY_IMAGE_SETS: Record<string, string[]> = {
  // Speakers
  '1': [
    '/images/equipment/line-array-speaker.svg',
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
  ],
  // Microphones
  '2': [
    '/images/equipment/wireless-mics.svg',
    'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1520523839898-507125cd53c1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1200&q=80',
  ],
  // DJ equipment
  '3': [
    '/images/equipment/dj-mixer.svg',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
  ],
  // Stage lights
  '4': [
    '/images/equipment/stage-lights.svg',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
  ],
  // Fairy lights
  '5': [
    '/images/equipment/fairy-lights.svg',
    'https://images.unsplash.com/photo-1513297887119-d46091b24bfa?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?auto=format&fit=crop&w=1200&q=80',
  ],
  // Chairs
  '6': [
    '/images/equipment/banquet-chairs.svg',
    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
  ],
  // Tables
  '7': [
    '/images/equipment/cocktail-tables.svg',
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
  ],
  // Tents & decor
  '8': [
    '/images/equipment/canopy-tent.svg',
    'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
  ],
}

// Contextual "What's included" checklists per category
const CATEGORY_INCLUDES: Record<string, string[]> = {
  '1': [
    'Heavy-duty adjustable speaker stands (pair)',
    'Dual 10m shielded XLR audio cables',
    'Padded tour-grade weather covers',
    'PowerCON locking AC power cables',
    'Pre-rental audio test verification certificate',
    'Quick-setup wiring diagram and gain guide',
  ],
  '2': [
    'Handheld / bodypack transmitter unit',
    'Dual-channel UHF rackmount receiver',
    'Foam windscreens & pop filters',
    'Fresh rechargeable batteries & dock',
    'Hard-shell foam-lined flight case',
    'Balanced XLR patch cables',
  ],
  '3': [
    'Flightcase with integrated slide-out laptop shelf',
    'Gold-plated USB-B connection cables',
    'Dual RCA-to-XLR master output interconnects',
    'Dedicated power supply & surge adapter',
    'Protective Decksaver polycarbonate cover',
  ],
  '4': [
    'Heavy-duty safety cables with steel carabiners',
    'Omega bracket clamps for 50mm truss mounting',
    '5-pin DMX linking cables (5m)',
    'PowerCON pass-through cables',
    'Standard DMX channel mapping sheet',
  ],
  '5': [
    'UL-certified outdoor waterproof driver/transformer',
    'Mounting hooks and clear zip-tie pack',
    'Spare warm white LED bulbs',
    '15m outdoor extension cord',
  ],
  '6': [
    'Protective dust transport covers',
    'Scratch-resistant non-marking rubber feet',
    'Stackable transport cart (for orders >30)',
    'Spot-cleaned fabric upholstery check',
  ],
  '7': [
    'Heavyweight weighted cast-iron pedestal base',
    'Fitted black or white stretch spandex linen',
    'Non-slip leveler foot pegs',
    'Fold-flat hardware for easy transport',
  ],
  '8': [
    'Reinforced anodized aluminium frame',
    'Waterproof UV50+ fire-retardant canopy top',
    'Heavy-duty ground stakes & tie-down ratchets',
    'Heavy cast-iron base weight plates (4 × 15kg)',
    'Wheeled carry duffel for transit',
  ],
}

/**
 * Deterministic blocked ranges for equipment availability testing.
 * Equipment 1 has booked days from Nov 20 to Nov 23, 2026, and partial bookings elsewhere.
 */
export function getEquipmentBlockedRanges(itemId: string) {
  const numId = parseInt(itemId, 10) || 1

  // Base calendar year 2026
  const ranges = [
    {
      start_date: '2026-11-20',
      end_date: '2026-11-23',
      quantity_blocked: 6, // Fully booked for item 1 (quantity 6)
      reason: 'booked' as const,
    },
    {
      start_date: '2026-11-28',
      end_date: '2026-11-30',
      quantity_blocked: 4, // Limited availability (4 units blocked out of 6)
      reason: 'booked' as const,
    },
    {
      start_date: '2026-12-05',
      end_date: '2026-12-06',
      quantity_blocked: 2,
      reason: 'maintenance' as const,
    },
  ]

  // Shift dates slightly for other items
  if (numId % 2 === 0) {
    return [
      {
        start_date: '2026-11-15',
        end_date: '2026-11-18',
        quantity_blocked: 4,
        reason: 'booked' as const,
      },
      {
        start_date: '2026-11-25',
        end_date: '2026-11-26',
        quantity_blocked: 6,
        reason: 'booked' as const,
      },
    ]
  }

  return ranges
}

/**
 * Formats YYYY-MM-DD date into friendly string like "24 Nov"
 */
function formatFriendlyDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return dateStr
  }
}

/**
 * Retrieves full equipment detail by ID.
 */
export async function getEquipmentDetail(
  id: string,
  simulate?: string,
): Promise<EquipmentDetail | null> {
  await new Promise((resolve) => setTimeout(resolve, DEFAULT_DELAY))

  if (shouldSimulate('error', simulate)) {
    throw new Error('Failed to retrieve equipment detail. Simulated error active (?simulate=error).')
  }

  const item = MOCK_EQUIPMENT.find((eq) => eq.equipment_id === id)
  if (!item) {
    return null
  }

  const vendor = CANONICAL_VENDORS.find((v) => v.id === item.vendor_id) || CANONICAL_VENDORS[0]
  const cat = CANONICAL_CATEGORIES.find((c) => c.id === item.category_id) || CANONICAL_CATEGORIES[0]
  const group = CANONICAL_GROUPS.find((g) => g.id === cat.groupId) || CANONICAL_GROUPS[0]

  // Determine status (support ?simulate=unavailable)
  let status: EquipmentDetail['status'] = 'active'
  if (shouldSimulate('unavailable', simulate) || id === '99') {
    status = 'out_of_stock'
  }

  // Build images
  const catGallery = GALLERY_IMAGE_SETS[item.category_id] || GALLERY_IMAGE_SETS['1']
  const images: EquipmentImage[] = [
    {
      image_id: `${id}-img-primary`,
      url: item.primary_image_url,
      is_primary: true,
      sort_order: 0,
    },
    ...catGallery.slice(1).map((url, idx) => ({
      image_id: `${id}-img-${idx + 1}`,
      url,
      is_primary: false,
      sort_order: idx + 1,
    })),
  ]

  // Category Path
  const category_path = [
    { id: group.id, name: group.name },
    { id: cat.id, name: cat.name },
    { id: item.equipment_id, name: item.name },
  ]

  // Vendor Detail
  const vendorDetail: VendorDetail = {
    vendor_id: vendor.id,
    business_name: vendor.name,
    city: vendor.city,
    avg_rating: vendor.rating,
    review_count: vendor.review_count,
    item_count: vendor.item_count,
    member_since: vendor.memberSince,
    description: vendor.description,
  }

  // Specifications
  const specs: Record<string, string | number> = {
    ...item.specifications,
    'Vendor Location': vendor.city,
    'Condition Rating': 'Grade A (Inspected before dispatch)',
    'Rental Term': `Minimum ${item.min_rental_days} day(s)`,
    'Security Deposit': `₹${item.security_deposit.toLocaleString('en-IN')} (Refundable)`,
    'Logistics': item.delivery_available ? 'Delivery & Pickup available' : 'Pickup only',
  }

  const blocked_ranges = getEquipmentBlockedRanges(id)
  const includes = CATEGORY_INCLUDES[item.category_id] || CATEGORY_INCLUDES['1']

  return {
    ...item,
    status,
    images,
    includes,
    specifications: specs,
    category_path,
    vendor: vendorDetail,
    blocked_ranges,
  }
}

/**
 * Calculates remaining available quantity for a date range.
 * Range available_quantity is the minimum available across each day.
 */
export async function getEquipmentAvailability(
  id: string,
  from?: string | null,
  to?: string | null,
): Promise<EquipmentAvailability> {
  await new Promise((resolve) => setTimeout(resolve, 60))

  const item = MOCK_EQUIPMENT.find((eq) => eq.equipment_id === id)
  const totalStock = item ? item.quantity : 6
  const blockedRanges = getEquipmentBlockedRanges(id)

  if (!from || !to) {
    return {
      available_quantity: totalStock,
      next_available_from: null,
      unavailable_days: [],
    }
  }

  const startDate = new Date(from)
  const endDate = new Date(to)

  let minAvailable = totalStock
  const unavailableDays: string[] = []

  // Check each day in the requested range
  const curr = new Date(startDate)
  while (curr <= endDate) {
    const yyyy = curr.getFullYear()
    const mm = String(curr.getMonth() + 1).padStart(2, '0')
    const dd = String(curr.getDate()).padStart(2, '0')
    const dayStr = `${yyyy}-${mm}-${dd}`

    // Sum blocked units on this day
    let blockedUnits = 0
    for (const b of blockedRanges) {
      if (dayStr >= b.start_date && dayStr <= b.end_date) {
        blockedUnits += b.quantity_blocked
      }
    }

    const dayRemaining = Math.max(0, totalStock - blockedUnits)
    if (dayRemaining < minAvailable) {
      minAvailable = dayRemaining
    }
    if (dayRemaining === 0) {
      unavailableDays.push(dayStr)
    }

    curr.setDate(curr.getDate() + 1)
  }

  let nextAvailableFrom: string | null = null
  if (minAvailable === 0) {
    // Find next available date starting after the conflicting range
    // Check next 30 days
    const searchDate = new Date(endDate)
    searchDate.setDate(searchDate.getDate() + 1)

    for (let i = 0; i < 30; i++) {
      const yyyy = searchDate.getFullYear()
      const mm = String(searchDate.getMonth() + 1).padStart(2, '0')
      const dd = String(searchDate.getDate()).padStart(2, '0')
      const dStr = `${yyyy}-${mm}-${dd}`

      let blockedOnD = 0
      for (const b of blockedRanges) {
        if (dStr >= b.start_date && dStr <= b.end_date) {
          blockedOnD += b.quantity_blocked
        }
      }

      if (totalStock - blockedOnD > 0) {
        nextAvailableFrom = formatFriendlyDate(dStr)
        break
      }
      searchDate.setDate(searchDate.getDate() + 1)
    }

    if (!nextAvailableFrom) {
      nextAvailableFrom = '24 Nov'
    }
  }

  return {
    available_quantity: minAvailable,
    next_available_from: nextAvailableFrom,
    unavailable_days: unavailableDays,
  }
}

/**
 * Deterministically generates reviews that perfectly match item.review_count and item.avg_rating.
 */
export async function getEquipmentReviews(
  id: string,
  options: {
    rating?: number
    sort?: 'newest' | 'highest' | 'lowest'
    page?: number
    pageSize?: number
  } = {},
): Promise<ReviewsResponse> {
  await new Promise((resolve) => setTimeout(resolve, 80))

  const item = MOCK_EQUIPMENT.find((eq) => eq.equipment_id === id)
  const totalCount = item ? item.review_count : 88
  const targetAvg = item ? item.avg_rating : 4.8

  // Deterministically compute distribution summing to totalCount and averaging to targetAvg
  // E.g. for 4.9: 5s = ~88%, 4s = ~10%, 3s = ~2%
  // E.g. for 4.2: 5s = ~50%, 4s = ~30%, 3s = ~15%, 2s = ~5%
  const factor5 = Math.max(0.1, (targetAvg - 3.8) / 1.2)
  const count5 = Math.round(totalCount * Math.min(0.88, factor5 * 0.85))
  const remainingAfter5 = totalCount - count5
  const count4 = Math.round(remainingAfter5 * 0.7)
  const remainingAfter4 = remainingAfter5 - count4
  const count3 = Math.round(remainingAfter4 * 0.6)
  const remainingAfter3 = remainingAfter4 - count3
  const count2 = Math.round(remainingAfter3 * 0.5)
  const count1 = totalCount - (count5 + count4 + count3 + count2)

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    5: Math.max(0, count5),
    4: Math.max(0, count4),
    3: Math.max(0, count3),
    2: Math.max(0, count2),
    1: Math.max(0, count1),
  }

  // Ensure exact sum
  const sum = distribution[5] + distribution[4] + distribution[3] + distribution[2] + distribution[1]
  if (sum !== totalCount) {
    distribution[5] += totalCount - sum
  }

  // Review pool templates
  const names = [
    'Ananya R.',
    'Rohan M.',
    'Meera S.',
    'Vikram K.',
    'Pooja N.',
    'Arjun T.',
    'Kavita D.',
    'Siddharth P.',
    'Neha G.',
    'Devendra B.',
  ]

  const comments5 = [
    'The sound was clear and powerful. Setup was easy and the vendor was extremely responsive throughout our 3-day wedding event.',
    'Exceptional gear quality. Came well-packed in road cases with all required cabling and power cords.',
    'Super reliable equipment. Handled 6 hours of continuous live music without breaking a sweat.',
    'Clean, pristine condition. The sound dispersion covered our outdoor lawn of 400 guests effortlessly.',
    'Punctual delivery and friendly staff. Will definitely rent again for our next company annual day.',
  ]

  const comments4 = [
    'Great equipment and solid performance. One cable was slightly worn but vendor swapped it out right away.',
    'Very good acoustic response. Clear highs and punchy bass for our reception dinner.',
    'Solid build and straightforward setup. Overall very pleased with the rental experience.',
  ]

  const comments3 = [
    'Equipment worked fine for our workshop, though pickup was delayed by 20 minutes from the warehouse.',
    'Decent sound output. Ensure you test your mixer gains beforehand.',
  ]

  const comments2 = [
    'Functioned adequately but showed visible scuffs on the enclosure.',
  ]

  const comments1 = [
    'Encountered an issue with one channel during soundcheck.',
  ]

  const vendorReplies = [
    'Thank you so much for trusting us with your celebration audio! Looking forward to your next event.',
    'We appreciate your detailed feedback! Our team takes pride in keeping every piece of gear concert-ready.',
    'Thank you for the review! Glad our standby technician could assist promptly with the cable swap.',
  ]

  // Deterministically create full review pool
  const allReviews: Review[] = []
  let revId = 1
  const ratingsList: (1 | 2 | 3 | 4 | 5)[] = []
  for (let s = 5; s >= 1; s--) {
    const star = s as 1 | 2 | 3 | 4 | 5
    for (let i = 0; i < distribution[star]; i++) {
      ratingsList.push(star)
    }
  }

  for (let i = 0; i < ratingsList.length; i++) {
    const star = ratingsList[i]
    const uName = names[(i + parseInt(id, 10)) % names.length]
    let comment: string | null = null
    if (star === 5) comment = comments5[i % comments5.length]
    else if (star === 4) comment = comments4[i % comments4.length]
    else if (star === 3) comment = comments3[i % comments3.length]
    else if (star === 2) comment = comments2[i % comments2.length]
    else comment = comments1[i % comments1.length]

    const day = (i * 3 + 1) % 28 + 1
    const month = (i % 5) + 6 // June to October 2026
    const monthNames = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct']
    const dateStr = `${day} ${monthNames[month - 6]} 2026`

    const reply = (star >= 4 && i % 3 === 0) ? vendorReplies[i % vendorReplies.length] : null

    allReviews.push({
      review_id: `rev-${id}-${revId++}`,
      user_name: uName,
      rating: star,
      comment,
      vendor_reply: reply,
      review_date: dateStr,
    })
  }

  // Filter by rating if requested
  let filtered = allReviews
  if (options.rating && options.rating >= 1 && options.rating <= 5) {
    filtered = filtered.filter((r) => r.rating === options.rating)
  }

  // Sort
  const sort = options.sort || 'newest'
  filtered.sort((a, b) => {
    if (sort === 'highest') {
      return b.rating - a.rating || b.review_id.localeCompare(a.review_id)
    }
    if (sort === 'lowest') {
      return a.rating - b.rating || b.review_id.localeCompare(a.review_id)
    }
    // Newest
    return b.review_id.localeCompare(a.review_id)
  })

  // Pagination
  const page = Math.max(1, options.page || 1)
  const pageSize = options.pageSize || 5
  const start = (page - 1) * pageSize
  const paginated = filtered.slice(start, start + pageSize)

  return {
    items: paginated,
    total: filtered.length,
    summary: {
      avg: targetAvg,
      count: totalCount,
      distribution,
    },
  }
}

/**
 * Returns up to 4 similar items from the same category (or fallback to same group).
 */
export async function getSimilarEquipment(id: string): Promise<EquipmentListingView[]> {
  await new Promise((resolve) => setTimeout(resolve, 60))

  const current = MOCK_EQUIPMENT.find((eq) => eq.equipment_id === id)
  if (!current) return []

  // 1. Same category
  const sameCat = MOCK_EQUIPMENT.filter(
    (eq) => eq.category_id === current.category_id && eq.equipment_id !== id,
  )

  if (sameCat.length >= 4) {
    return sameCat.slice(0, 4)
  }

  // 2. Fall back to same group
  const sameGroup = MOCK_EQUIPMENT.filter(
    (eq) =>
      eq.parent_category_id === current.parent_category_id &&
      eq.equipment_id !== id &&
      !sameCat.some((sc) => sc.equipment_id === eq.equipment_id),
  )

  return [...sameCat, ...sameGroup].slice(0, 4)
}

/**
 * Returns other equipment from the same vendor, excluding the current item.
 */
export async function getVendorEquipment(
  vendorId: string,
  excludeId: string,
): Promise<EquipmentListingView[]> {
  await new Promise((resolve) => setTimeout(resolve, 60))

  return MOCK_EQUIPMENT.filter(
    (eq) => eq.vendor_id === vendorId && eq.equipment_id !== excludeId,
  )
}

import { sendMessage } from './account'

/**
 * Sends a message to the vendor (mock).
 */
export async function sendVendorMessage(input: {
  vendor_id: string
  equipment_id: string
  subject: string
  message: string
  customer_name?: string
}): Promise<{ success: boolean; message_id: string }> {
  const item = MOCK_EQUIPMENT.find((eq) => eq.equipment_id === input.equipment_id)
  const vendor = CANONICAL_VENDORS.find((v) => v.id === input.vendor_id)
  const msg = await sendMessage({
    vendorId: input.vendor_id,
    vendorName: vendor?.name || item?.vendor_name,
    equipmentId: input.equipment_id,
    equipmentName: item?.name,
    equipmentImage: item?.primary_image_url,
    text: input.message,
  })
  return {
    success: true,
    message_id: msg.message_id,
  }
}
