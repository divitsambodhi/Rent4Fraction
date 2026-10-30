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

export const CANONICAL_CATEGORIES: CanonicalCategory[] = [
  {
    id: '1',
    groupId: '1',
    groupName: 'Furniture & Seating',
    name: 'Furniture & Seating',
    starting_price: 500,
    icon: 'Armchair',
    description: 'Tables, chairs, lounges, banquet and event seating arrangements.',
    image: '/images/equipment/banquet-chairs.svg',
  },
  {
    id: '2',
    groupId: '2',
    groupName: 'Tents, Canopies & Structures',
    name: 'Tents, Canopies & Structures',
    starting_price: 2500,
    icon: 'Tent',
    description: 'Marquees, canopies, pagodas, gazebos, and structural setups.',
    image: '/images/equipment/pagoda-tent.svg',
  },
  {
    id: '3',
    groupId: '3',
    groupName: 'Decor & Backdrops',
    name: 'Decor & Backdrops',
    starting_price: 1000,
    icon: 'Sparkles',
    description: 'Photo backdrops, floral frames, stage decor, and drapery.',
    image: '/images/equipment/stage-lights.svg',
  },
  {
    id: '4',
    groupId: '4',
    groupName: 'Sound & DJ Equipment',
    name: 'Sound & DJ Equipment',
    starting_price: 2000,
    icon: 'Volume2',
    description: 'PA systems, speakers, DJ mixers, consoles, and microphones.',
    image: '/images/equipment/line-array-speaker.svg',
  },
  {
    id: '5',
    groupId: '5',
    groupName: 'Lighting & Effects',
    name: 'Lighting & Effects',
    starting_price: 1200,
    icon: 'Flame',
    description: 'Stage spotlights, LED pars, ambient lighting, smoke and haze machines.',
    image: '/images/equipment/stage-lights.svg',
  },
  {
    id: '6',
    groupId: '6',
    groupName: 'Screens & Visual Equipment',
    name: 'Screens & Visual Equipment',
    starting_price: 3500,
    icon: 'Layout',
    description: 'LED video walls, projectors, projection screens, and monitors.',
    image: '/images/equipment/stage-lights.svg',
  },
  {
    id: '7',
    groupId: '7',
    groupName: 'Catering & Dining',
    name: 'Catering & Dining',
    starting_price: 800,
    icon: 'SquareMenu',
    description: 'Chafing dishes, beverage dispensers, buffet counters, and food warmers.',
    image: '/images/equipment/cocktail-tables.svg',
  },
  {
    id: '8',
    groupId: '8',
    groupName: 'Photography & Videography',
    name: 'Photography & Videography',
    starting_price: 3000,
    icon: 'Camera',
    description: 'Cameras, camera lenses, stabilizers, tripods, and lighting kits.',
    image: '/images/equipment/line-array-speaker.svg',
  },
  {
    id: '9',
    groupId: '9',
    groupName: 'Power & Climate Control',
    name: 'Power & Climate Control',
    starting_price: 2500,
    icon: 'Power',
    description: 'Silent diesel generators, heavy-duty UPS, mist fans, and portable ACs.',
    image: '/images/equipment/line-array-speaker.svg',
  },
  {
    id: '10',
    groupId: '10',
    groupName: 'Flooring & Carpets',
    name: 'Flooring & Carpets',
    starting_price: 1500,
    icon: 'Box',
    description: 'Dance floors, red carpets, wooden platforms, and artificial turf.',
    image: '/images/equipment/banquet-chairs.svg',
  },
  {
    id: '11',
    groupId: '11',
    groupName: 'Event Accessories',
    name: 'Event Accessories',
    starting_price: 400,
    icon: 'Shield',
    description: 'Stanchions, crowd control barriers, podiums, and welcome boards.',
    image: '/images/equipment/cocktail-tables.svg',
  },
  {
    id: '12',
    groupId: '12',
    groupName: 'Tableware & Serving',
    name: 'Tableware & Serving',
    starting_price: 300,
    icon: 'SquareMenu',
    description: 'Plates, glassware, cutlery, serving trays, and fine tableware.',
    image: '/images/equipment/cocktail-tables.svg',
  },
  {
    id: '13',
    groupId: '13',
    groupName: 'Games & Entertainment',
    name: 'Games & Entertainment',
    starting_price: 2000,
    icon: 'Disc3',
    description: 'Carnival games, arcade machines, photo booths, and fun activities.',
    image: '/images/equipment/dj-mixer.svg',
  },
  {
    id: '14',
    groupId: '14',
    groupName: 'Safety & Security',
    name: 'Safety & Security',
    starting_price: 500,
    icon: 'Shield',
    description: 'Fire extinguishers, walkie-talkies, metal detectors, and safety gear.',
    image: '/images/equipment/wireless-mics.svg',
  },
  {
    id: '15',
    groupId: '15',
    groupName: 'Transport & Logistics Equipment',
    name: 'Transport & Logistics Equipment',
    starting_price: 800,
    icon: 'Truck',
    description: 'Hand trucks, equipment dollies, loading ramps, and trolleys.',
    image: '/images/equipment/pagoda-tent.svg',
  },
  {
    id: '16',
    groupId: '16',
    groupName: 'Others',
    name: 'Others',
    starting_price: 500,
    icon: 'Box',
    description: 'Miscellaneous event gear, tools, and specialty rental equipment.',
    image: '/images/equipment/line-array-speaker.svg',
  },
]

export const CANONICAL_GROUPS: CanonicalGroup[] = CANONICAL_CATEGORIES.map((cat) => ({
  id: cat.id,
  name: cat.name,
  categoryIds: [cat.id],
}))

export const CANONICAL_VENDORS: CanonicalVendor[] = []

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
