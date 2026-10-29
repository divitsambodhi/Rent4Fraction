import { apiClient } from '@/lib/api/client'
import type { EquipmentListingView } from '@/types'
import type {
  AvailabilityBlock,
  AvailabilityReason,
  EquipmentStatus,
  InventoryItem,
} from '@/types/vendor'

export interface InventoryItemInput {
  name: string
  category_id: string
  price_per_day: number
  security_deposit: number
  quantity: number
  min_rental_days?: number
  description?: string
  delivery_available?: boolean
  images?: string[]
}

const INVENTORY_STORAGE_KEY = 'r4f-vendor-inventory-v1'

export interface EquipmentStoreState {
  version: number
  items: InventoryItem[]
}

export function getStoredEquipmentState(): EquipmentStoreState {
  if (typeof window === 'undefined') {
    return { version: 1, items: [] }
  }
  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY)
    if (!raw) {
      return { version: 1, items: [] }
    }
    const parsed = JSON.parse(raw)
    return { version: 1, items: Array.isArray(parsed.items) ? parsed.items : [] }
  } catch {
    return { version: 1, items: [] }
  }
}

export function saveStoredEquipmentState(state: EquipmentStoreState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function getAllStoredEquipment(): InventoryItem[] {
  return getStoredEquipmentState().items
}

export function getInventoryItemById(id: string): InventoryItem | null {
  const all = getAllStoredEquipment()
  return all.find((item) => item.id === id || item.equipment_id === id) || null
}

export function saveInventoryItem(
  data: Partial<InventoryItem> & { equipment_id?: string },
  vendorId = '1',
): InventoryItem {
  const state = getStoredEquipmentState()
  const now = new Date().toISOString()

  let savedItem: InventoryItem

  if (data.equipment_id && data.equipment_id !== 'new') {
    const index = state.items.findIndex(
      (item) => item.equipment_id === data.equipment_id || item.id === data.equipment_id,
    )
    if (index === -1) {
      throw new Error(`Equipment item with ID ${data.equipment_id} not found`)
    }
    const existing = state.items[index]
    savedItem = {
      ...existing,
      ...data,
      id: existing.id || existing.equipment_id,
      equipment_id: existing.equipment_id || existing.id,
      vendor_id: existing.vendor_id || vendorId,
      updated_at: now,
    } as InventoryItem
    state.items[index] = savedItem
  } else {
    const newId = String(Date.now())
    savedItem = {
      id: newId,
      equipment_id: newId,
      vendor_id: vendorId,
      vendor_name: data.vendor_name || 'My Equipment Co.',
      name: data.name || 'Untitled Equipment',
      description: data.description || '',
      category_id: data.category_id || '1',
      category_name: data.category_name || 'Sound',
      category: data.category_name || 'Sound',
      parent_category_id: data.parent_category_id || null,
      parent_category_name: data.parent_category_name || null,
      price_per_day: data.price_per_day ?? 1000,
      price: data.price_per_day ?? 1000,
      security_deposit: data.security_deposit ?? 2000,
      deposit: data.security_deposit ?? 2000,
      quantity: data.quantity ?? 1,
      stock: data.quantity ?? 1,
      min_rental_days: data.min_rental_days ?? 1,
      delivery_available: data.delivery_available ?? true,
      avg_rating: 0,
      rating: 0,
      review_count: 0,
      reviews: 0,
      status: (data.status as EquipmentStatus) || 'active',
      primary_image_url: data.primary_image_url || '',
      image: data.primary_image_url || '',
      images: (data.images as EquipmentImage[]) || [],
      includes: data.includes || ['Standard accessories'],
      specifications: data.specifications || {},
      blocked_ranges: [],
      created_at: now,
      updated_at: now,
      updated: now,
    } as unknown as InventoryItem
    state.items.unshift(savedItem)
  }

  saveStoredEquipmentState(state)
  return savedItem
}

export function duplicateInventoryItem(id: string): InventoryItem {
  const state = getStoredEquipmentState()
  const original = state.items.find((item) => item.equipment_id === id || item.id === id)
  if (!original) {
    throw new Error(`Equipment item with ID ${id} not found`)
  }
  const newId = String(Date.now())
  const now = new Date().toISOString()
  const duplicated: InventoryItem = {
    ...original,
    id: newId,
    equipment_id: newId,
    name: `${original.name} (Copy)`,
    status: 'inactive',
    created_at: now,
    updated_at: now,
  }
  state.items.unshift(duplicated)
  saveStoredEquipmentState(state)
  return duplicated
}

export function setInventoryItemStatuses(ids: string[], status: EquipmentStatus): void {
  const state = getStoredEquipmentState()
  const now = new Date().toISOString()
  state.items = state.items.map((item) => {
    if (ids.includes(item.equipment_id) || ids.includes(item.id)) {
      return { ...item, status, updated_at: now }
    }
    return item
  })
  saveStoredEquipmentState(state)
}

export function checkCanArchiveEquipment(_id: string): { canArchive: boolean; reason?: string } {
  return { canArchive: true }
}

export function archiveEquipmentItem(id: string): { success: boolean; error?: string } {
  setInventoryItemStatuses([id], 'archived' as EquipmentStatus)
  return { success: true }
}

export function queryInventory(
  params: {
    q?: string
    status?: EquipmentStatus | 'all'
    category?: string
    stock?: 'low' | 'all'
    sort?: string
    page?: number
    pageSize?: number
  } = {},
  vendorId = '1',
) {
  const all = getAllStoredEquipment().filter((i) => i.vendor_id === vendorId || !i.vendor_id)
  let filtered = all.filter((item) => {
    if (params.q) {
      const q = params.q.toLowerCase()
      if (!item.name.toLowerCase().includes(q) && !(item.description || '').toLowerCase().includes(q)) {
        return false
      }
    }
    if (params.status && params.status !== 'all' && item.status !== params.status) {
      return false
    }
    if (params.category && params.category !== 'all' && item.category_id !== params.category) {
      return false
    }
    if (params.stock === 'low' && item.quantity > 2) {
      return false
    }
    return true
  })

  const page = Math.max(1, params.page || 1)
  const pageSize = params.pageSize || 10
  const start = (page - 1) * pageSize
  const paginated = filtered.slice(start, start + pageSize)

  return {
    items: paginated,
    total: filtered.length,
    page,
    pageSize,
  }
}

export function validateBlockUnits(
  _equipmentId: string,
  _fromDate: string,
  _toDate: string,
  units: number,
  stock = 10,
): { valid: boolean; max_allowed: number; message?: string } {
  const valid = units > 0 && units <= stock
  return {
    valid,
    max_allowed: stock,
    message: valid ? undefined : `Units must be between 1 and ${stock}`,
  }
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
    blocks: item.blocked_ranges || [],
  }
}

export async function addAvailabilityBlock(
  equipmentId: string,
  blockData: {
    start_date: string
    end_date: string
    reason: AvailabilityReason
    quantity?: number
    units?: number
    note?: string
  },
): Promise<AvailabilityBlock> {
  const qty = blockData.quantity ?? blockData.units ?? 1
  const blockId = `blk-${Date.now()}`
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

  const state = getStoredEquipmentState()
  const item = state.items.find((i) => i.equipment_id === equipmentId || i.id === equipmentId)
  if (item) {
    item.blocked_ranges = item.blocked_ranges || []
    item.blocked_ranges.push(newBlock)
    saveStoredEquipmentState(state)
  }

  return newBlock
}

export async function removeAvailabilityBlock(equipmentId: string, blockId: string): Promise<void> {
  const state = getStoredEquipmentState()
  const item = state.items.find((i) => i.equipment_id === equipmentId || i.id === equipmentId)
  if (item && item.blocked_ranges) {
    item.blocked_ranges = item.blocked_ranges.filter((b) => b.id !== blockId && b.block_id !== blockId)
    saveStoredEquipmentState(state)
  }
}

export async function getVendorInventory(): Promise<EquipmentListingView[]> {
  try {
    const res = await apiClient.get<{ items: EquipmentListingView[] }>('/api/v1/vendor/equipment')
    return res.items || []
  } catch {
    return []
  }
}

export async function createInventoryEquipment(data: InventoryItemInput): Promise<EquipmentListingView> {
  return await apiClient.post<EquipmentListingView>('/api/v1/vendor/equipment', data)
}

export async function updateInventoryEquipment(
  equipmentId: string,
  data: Partial<InventoryItemInput>,
): Promise<EquipmentListingView> {
  return await apiClient.put<EquipmentListingView>(`/api/v1/vendor/equipment/${equipmentId}`, data)
}

export async function deleteInventoryEquipment(equipmentId: string): Promise<void> {
  await apiClient.delete(`/api/v1/vendor/equipment/${equipmentId}`)
}

export async function bulkUpdateInventoryStatus(
  equipmentIds: string[],
  status: 'active' | 'paused' | 'archived',
): Promise<void> {
  await apiClient.post('/api/v1/vendor/equipment/bulk-status', {
    equipment_ids: equipmentIds,
    status,
  })
}

export async function createAvailabilityBlock(
  equipmentId: string,
  data: { start_date: string; end_date: string; reason?: string },
): Promise<{ block_id: string }> {
  return await apiClient.post<{ block_id: string }>(`/api/v1/vendor/equipment/${equipmentId}/blocks`, data)
}

export async function deleteAvailabilityBlock(equipmentId: string, blockId: string): Promise<void> {
  await apiClient.delete(`/api/v1/vendor/equipment/${equipmentId}/blocks/${blockId}`)
}
