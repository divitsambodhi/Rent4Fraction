export type UserRole = 'visitor' | 'customer' | 'vendor' | 'admin'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  avatarInitials: string
}

export interface EquipmentListingView {
  equipment_id: string
  name: string
  description: string
  price_per_day: number
  security_deposit: number
  quantity: number
  min_rental_days: number
  delivery_available: boolean
  avg_rating: number
  review_count: number
  specifications: Record<string, string>
  vendor_id: string
  vendor_name: string
  category_id: string
  category_name: string
  parent_category_id: string | null
  parent_category_name: string | null
  primary_image_url: string
}

export type EquipmentStatus = 'active' | 'inactive' | 'out_of_stock' | 'archived'

export interface EquipmentImage {
  image_id: string
  url: string | null
  is_primary: boolean
  sort_order: number
}

export interface BlockedRange {
  start_date: string
  end_date: string
  quantity_blocked: number
  reason: 'maintenance' | 'vendor_blocked' | 'booked'
}

export interface VendorDetail {
  vendor_id: string
  business_name: string
  city: string
  avg_rating: number
  review_count: number
  item_count: number
  member_since: string
  description: string
}

export interface EquipmentDetail extends Omit<EquipmentListingView, 'specifications'> {
  status: EquipmentStatus
  images: EquipmentImage[]
  includes: string[]
  specifications: Record<string, string | number>
  category_path: { id: string; name: string }[]
  vendor: VendorDetail
  blocked_ranges: BlockedRange[]
}

export interface Review {
  review_id: string
  user_name: string
  rating: number
  comment: string | null
  vendor_reply: string | null
  review_date: string
}

export interface ReviewsResponse {
  items: Review[]
  total: number
  summary: {
    avg: number
    count: number
    distribution: Record<1 | 2 | 3 | 4 | 5, number>
  }
}

export interface EquipmentAvailability {
  available_quantity: number
  next_available_from: string | null
  unavailable_days: string[]
}

export interface Vendor {
  id: string
  name: string
  city: string
  rating: number
  review_count: number
  item_count: number
  verified: boolean
  initials: string
  tagline: string
}

export interface Category {
  id: string
  name: string
  starting_price: number
  icon: string
  description: string
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: 'order' | 'system' | 'return' | 'promotion'
}

export interface FAQItem {
  id: string
  question: string
  answer: string
  category?: string
}

export * from './account'
