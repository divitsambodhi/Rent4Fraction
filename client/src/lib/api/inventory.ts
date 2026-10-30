import { apiClient } from '@/lib/api/client'
import type {
  AvailabilityBlock,
  AvailabilityReason,
  EquipmentStatus,
  InventoryItem,
} from '@/types/vendor'

export interface InventoryStats {
  total: number
  active: number
  lowStock: number
  outOfStock: number
}

export interface InventoryListResult {
  items: InventoryItem[]
  total: number
  page: number
  pageSize: number
  stats: {
    total: number
    active: number
    inactive: number
    out_of_stock: number
    low_stock: number
    archived: number
  }
}

// In-memory cache for synchronous readers
let cachedEquipment: InventoryItem[] = []

export function getAllStoredEquipment(): InventoryItem[] {
  return cachedEquipment
}

export async function fetchVendorInventory(params: {
  q?: string
  status?: string
  category_id?: number
  stock?: string
  sort?: string
  page?: number
  pageSize?: number
} = {}): Promise<InventoryListResult> {
  try {
    const queryParams: Record<string, any> = {}
    if (params.q) queryParams.q = params.q
    if (params.status && params.status !== 'all') queryParams.status = params.status
    if (params.category_id) queryParams.category_id = params.category_id
    if (params.stock && params.stock !== 'all') queryParams.stock = params.stock
    if (params.sort) queryParams.sort = params.sort
    if (params.page) queryParams.page = params.page
    if (params.pageSize) queryParams.pageSize = params.pageSize

    const res = await apiClient.get<any>('/api/v1/vendor/inventory', { params: queryParams })
    if (res && Array.isArray(res.items)) {
      cachedEquipment = res.items
      return {
        items: res.items,
        total: res.total ?? res.items.length,
        page: res.page ?? 1,
        pageSize: res.pageSize ?? 10,
        stats: res.stats || {
          total: res.items.length,
          active: res.items.filter((i: any) => i.status === 'active').length,
          inactive: res.items.filter((i: any) => i.status === 'inactive').length,
          out_of_stock: res.items.filter((i: any) => (i.quantity ?? 0) === 0).length,
          low_stock: res.items.filter((i: any) => (i.quantity ?? 0) > 0 && (i.quantity ?? 0) <= 2).length,
          archived: 0,
        },
      }
    }
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      stats: { total: 0, active: 0, inactive: 0, out_of_stock: 0, low_stock: 0, archived: 0 },
    }
  } catch {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      stats: { total: 0, active: 0, inactive: 0, out_of_stock: 0, low_stock: 0, archived: 0 },
    }
  }
}

export const getVendorInventory = fetchVendorInventory

export async function getInventoryItemById(id: string): Promise<InventoryItem | null> {
  try {
    const item = await apiClient.get<InventoryItem>(`/api/v1/vendor/inventory/${id}`)
    return item || null
  } catch {
    return cachedEquipment.find((i) => i.id === id || i.equipment_id === id) || null
  }
}

function cleanImagePayload(images?: any[]): any[] {
  if (!images || !Array.isArray(images)) return []
  return images.map((img, idx) => {
    if (typeof img === 'string') {
      return { url: img, is_primary: idx === 0, sort_order: idx }
    }
    return {
      url: img.url || '',
      public_id: img.public_id || undefined,
      storage_path: img.storage_path || undefined,
      is_primary: Boolean(img.is_primary || img.isPrimary),
      sort_order: typeof img.sort_order === 'number' ? img.sort_order : idx,
      alt_text: img.alt_text || undefined,
    }
  }).filter((img) => Boolean(img.url))
}

export async function createVendorEquipment(data: Partial<InventoryItem>): Promise<InventoryItem> {
  const images = cleanImagePayload(data.images)
  if (images.length === 0 && data.primary_image_url) {
    images.push({ url: data.primary_image_url, is_primary: true, sort_order: 0 })
  }

  const payload = {
    category_id: parseInt(String(data.category_id || '1'), 10) || 1,
    name: (data.name || 'Untitled Equipment').trim(),
    description: data.description || '',
    price_per_day: Number(data.price_per_day ?? (data as any).price ?? 1000),
    security_deposit: Number(data.security_deposit ?? (data as any).deposit ?? 0),
    quantity: Number(data.quantity ?? (data as any).stock ?? 1),
    min_rental_days: Number(data.min_rental_days ?? 1),
    delivery_available: data.delivery_available ?? true,
    images,
    includes: data.includes || (data as any).included || [],
    specifications: data.specifications || {},
  }

  const res = await apiClient.post<InventoryItem>('/api/v1/vendor/inventory', payload)
  return res
}

export async function updateVendorEquipment(id: string, data: Partial<InventoryItem>): Promise<InventoryItem> {
  const payload: Record<string, any> = {}
  if (data.category_id !== undefined) payload.category_id = parseInt(String(data.category_id), 10) || 1
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.description !== undefined) payload.description = data.description
  if (data.price_per_day !== undefined) payload.price_per_day = Number(data.price_per_day)
  if (data.security_deposit !== undefined) payload.security_deposit = Number(data.security_deposit)
  if (data.quantity !== undefined) payload.quantity = Number(data.quantity)
  if (data.min_rental_days !== undefined) payload.min_rental_days = Number(data.min_rental_days)
  if (data.delivery_available !== undefined) payload.delivery_available = Boolean(data.delivery_available)
  if (data.status !== undefined) {
    payload.status = data.status === 'out_of_stock' ? 'inactive' : data.status
  }
  if (data.images !== undefined) {
    payload.images = cleanImagePayload(data.images)
  }
  if (data.includes !== undefined || (data as any).included !== undefined) {
    payload.includes = data.includes || (data as any).included
  }
  if (data.specifications !== undefined) {
    payload.specifications = data.specifications
  }

  const res = await apiClient.patch<InventoryItem>(`/api/v1/vendor/inventory/${id}`, payload)
  return res
}

export async function saveInventoryItem(
  data: Partial<InventoryItem> & { equipment_id?: string },
  _vendorId = '1',
): Promise<InventoryItem> {
  const targetId = data.equipment_id || data.id
  if (targetId && targetId !== 'new') {
    return await updateVendorEquipment(targetId, data)
  }
  return await createVendorEquipment(data)
}

export async function duplicateInventoryItem(id: string): Promise<InventoryItem> {
  const res = await apiClient.post<InventoryItem>(`/api/v1/vendor/inventory/${id}/duplicate`)
  return res
}

export async function setInventoryItemStatuses(ids: string[], status: EquipmentStatus): Promise<void> {
  const mappedStatus = status === 'out_of_stock' ? 'inactive' : status
  const numericIds = ids.map((id) => parseInt(id.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n))
  if (numericIds.length === 0) return
  await apiClient.post('/api/v1/vendor/inventory/bulk-status', {
    equipment_ids: numericIds,
    status: mappedStatus,
  })
}

export function checkCanArchiveEquipment(_id: string): boolean {
  return true
}

export function queryInventory(
  params: {
    q?: string
    status?: string
    category?: string
    stock?: string
    sort?: string
    page?: number
    pageSize?: number
  },
  _vendorId = '1',
): { items: InventoryItem[]; total: number; page: number; pageSize: number } {
  let filtered = [...cachedEquipment]
  if (params.q) {
    const q = params.q.toLowerCase()
    filtered = filtered.filter((i) => i.name.toLowerCase().includes(q))
  }
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter((i) => i.status === params.status)
  }
  const page = Math.max(1, params.page || 1)
  const pageSize = params.pageSize || 10
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
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
  const item = cachedEquipment.find((i) => i.id === equipmentId || i.equipment_id === equipmentId)
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
  return await apiClient.post<AvailabilityBlock>(`/api/v1/vendor/inventory/${equipmentId}/availability-blocks`, {
    start_date: blockData.start_date,
    end_date: blockData.end_date,
    units: qty,
    reason: blockData.reason === 'maintenance' ? 'maintenance' : 'vendor_blocked',
    note: blockData.note,
  })
}

export async function removeAvailabilityBlock(equipmentId: string, blockId: string): Promise<void> {
  await apiClient.delete(`/api/v1/vendor/inventory/${equipmentId}/availability-blocks/${blockId}`)
}
