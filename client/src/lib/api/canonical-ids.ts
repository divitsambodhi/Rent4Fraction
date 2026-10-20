export interface CanonicalCategory {
  id: string
  groupId: string
  groupName: string
  name: string
  starting_price: number
  icon: string
  description: string
  image: string
}

export interface CanonicalGroup {
  id: string
  name: string
  categoryIds: string[]
}

export interface CanonicalVendor {
  id: string
  name: string
  city: string
  rating: number
  review_count: number
  item_count: number
  verified: boolean
  initials: string
  tagline: string
  description: string
  memberSince: string
  categoryIds: string[]
}

export const CANONICAL_GROUPS: CanonicalGroup[] = [
  {
    id: '101',
    name: 'Sound',
    categoryIds: ['1', '2', '3'],
  },
  {
    id: '102',
    name: 'Lighting',
    categoryIds: ['4', '5'],
  },
  {
    id: '103',
    name: 'Furniture',
    categoryIds: ['6', '7'],
  },
  {
    id: '8',
    name: 'Tents & decor',
    categoryIds: ['8'],
  },
]

export const CANONICAL_CATEGORIES: CanonicalCategory[] = [
  {
    id: '1',
    groupId: '101',
    groupName: 'Sound',
    name: 'Speakers',
    starting_price: 1500,
    icon: 'Volume2',
    description: 'High-output PA systems, line-arrays, and subwoofers for crystal clear sound.',
    image: '/images/equipment/line-array-speaker.svg',
  },
  {
    id: '2',
    groupId: '101',
    groupName: 'Sound',
    name: 'Microphones',
    starting_price: 500,
    icon: 'Mic',
    description: 'Wireless handhelds, lapels, podium, and studio-grade instruments mics.',
    image: '/images/equipment/wireless-mics.svg',
  },
  {
    id: '3',
    groupId: '101',
    groupName: 'Sound',
    name: 'DJ equipment',
    starting_price: 2500,
    icon: 'Disc3',
    description: 'Club-standard multi-players, digital controllers, and performance mixers.',
    image: '/images/equipment/dj-mixer.svg',
  },
  {
    id: '4',
    groupId: '102',
    groupName: 'Lighting',
    name: 'Stage lights',
    starting_price: 1200,
    icon: 'Sparkles',
    description: 'Beam moving heads, LED washes, blinders, and automated DMX rigs.',
    image: '/images/equipment/stage-lights.svg',
  },
  {
    id: '5',
    groupId: '102',
    groupName: 'Lighting',
    name: 'Fairy lights',
    starting_price: 400,
    icon: 'Flame',
    description: 'Warm white string curtains, rice bulbs, and fairy canopy decor.',
    image: '/images/equipment/fairy-lights.svg',
  },
  {
    id: '6',
    groupId: '103',
    groupName: 'Furniture',
    name: 'Chairs',
    starting_price: 800,
    icon: 'Armchair',
    description: 'Cushioned banquet chairs, chiavari seating, and VIP lounge armchairs.',
    image: '/images/equipment/banquet-chairs.svg',
  },
  {
    id: '7',
    groupId: '103',
    groupName: 'Furniture',
    name: 'Tables',
    starting_price: 900,
    icon: 'SquareMenu',
    description: 'Round dining banquet tables, standing high-top cocktail tables.',
    image: '/images/equipment/cocktail-tables.svg',
  },
  {
    id: '8',
    groupId: '8',
    groupName: 'Tents & decor',
    name: 'Tents & decor',
    starting_price: 2000,
    icon: 'Tent',
    description: 'Pagoda canopies, weather-resistant marquees, drapes, and stage platforms.',
    image: '/images/equipment/pagoda-tent.svg',
  },
]

export const CANONICAL_VENDORS: CanonicalVendor[] = [
  {
    id: '1',
    name: 'Sargam Sound Systems',
    city: 'Bengaluru',
    rating: 4.8,
    review_count: 142,
    item_count: 11,
    verified: true,
    initials: 'SS',
    tagline: 'Crisp sound and dependable event setups for celebrations big and small.',
    description: 'Specialists in concert sound, acoustic staging, and touring audio setups across Karnataka and Maharashtra.',
    memberSince: '2023',
    categoryIds: ['1', '2', '3'],
  },
  {
    id: '2',
    name: 'Lumina Lighting Co.',
    city: 'Mumbai',
    rating: 4.7,
    review_count: 98,
    item_count: 8,
    verified: true,
    initials: 'LL',
    tagline: 'Thoughtful lighting that turns ordinary spaces into memorable rooms.',
    description: 'Design-led architectural lighting, intelligent moving heads, ambient festoon, and subtle stage illumination.',
    memberSince: '2022',
    categoryIds: ['4', '5'],
  },
  {
    id: '3',
    name: 'RoyalSeat Furniture',
    city: 'Delhi',
    rating: 4.9,
    review_count: 180,
    item_count: 9,
    verified: true,
    initials: 'RF',
    tagline: 'Beautiful, comfortable furniture for weddings, dinners, and gatherings.',
    description: 'Finely crafted banquet chairs, cocktail tables, lounge furniture, and podium stages for corporate and wedding galas.',
    memberSince: '2021',
    categoryIds: ['6', '7'],
  },
  {
    id: '4',
    name: 'Shamiyana Tents & Decor',
    city: 'Jaipur',
    rating: 4.6,
    review_count: 115,
    item_count: 8,
    verified: true,
    initials: 'ST',
    tagline: 'Warm decor and practical shelter for outdoor moments.',
    description: 'All-weather pagoda canopies, festive marquees, elegant drapery, and rustic decorative accents for open-air events.',
    memberSince: '2023',
    categoryIds: ['8', '5'],
  },
]

/**
 * Resolves category or group ID to an array of matching individual category IDs.
 */
export function resolveCategoryIds(categoryIdOrGroupId?: string | null): string[] {
  if (!categoryIdOrGroupId || categoryIdOrGroupId === 'all') {
    return CANONICAL_CATEGORIES.map((c) => c.id)
  }

  // Check if it's a group
  const group = CANONICAL_GROUPS.find((g) => g.id === categoryIdOrGroupId)
  if (group) {
    return group.categoryIds
  }

  // Direct category match
  const cat = CANONICAL_CATEGORIES.find((c) => c.id === categoryIdOrGroupId)
  if (cat) {
    return [cat.id]
  }

  // Slug or name fallback match
  const bySlug = CANONICAL_CATEGORIES.find(
    (c) =>
      c.name.toLowerCase() === categoryIdOrGroupId.toLowerCase() ||
      c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') ===
        categoryIdOrGroupId.toLowerCase(),
  )
  if (bySlug) {
    return [bySlug.id]
  }

  return []
}
