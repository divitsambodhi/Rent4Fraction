import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '@/lib/api/client'
import {
  fetchVendorInventory,
  saveInventoryItem,
  duplicateInventoryItem,
  setInventoryItemStatuses,
  addAvailabilityBlock,
  removeAvailabilityBlock,
} from '@/lib/api/inventory'

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Inventory API Client Module (B4 Regression & Real Wiring)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchVendorInventory calls GET /api/v1/vendor/inventory with correct query parameters', async () => {
    const mockResponse = {
      items: [
        {
          id: 'eq-101',
          name: 'Sony FX3 Cinema Camera',
          category_id: 1,
          category_name: 'Cameras',
          price_per_day: 3500,
          security_deposit: 15000,
          quantity: 2,
          status: 'active',
          images: [{ url: 'https://res.cloudinary.com/demo/image/upload/fx3.jpg', is_primary: true }],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      stats: {
        total: 1,
        active: 1,
        inactive: 0,
        out_of_stock: 0,
        low_stock: 1,
        archived: 0,
      },
    }

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse)

    const result = await fetchVendorInventory({ q: 'Sony', status: 'active', page: 1, pageSize: 10 })
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/vendor/inventory', {
      params: { q: 'Sony', status: 'active', page: 1, pageSize: 10 },
    })
    expect(result.items.length).toBe(1)
    expect(result.items[0].name).toBe('Sony FX3 Cinema Camera')
    expect(result.stats.active).toBe(1)
  })

  it('saveInventoryItem calls POST /api/v1/vendor/inventory for new listings without ID', async () => {
    const createdItem = {
      id: 'eq-202',
      equipment_id: 'eq-202',
      name: 'Rode Wireless Pro Mic',
      category_id: 2,
      price_per_day: 1200,
      security_deposit: 5000,
      quantity: 3,
      status: 'active',
      images: [],
    }

    vi.mocked(apiClient.post).mockResolvedValueOnce(createdItem)

    const input = {
      name: 'Rode Wireless Pro Mic',
      category_id: '2',
      price_per_day: 1200,
      security_deposit: 5000,
      quantity: 3,
    }

    const saved = await saveInventoryItem(input)
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/vendor/inventory',
      expect.objectContaining({
        name: 'Rode Wireless Pro Mic',
        price_per_day: 1200,
      }),
    )
    expect(saved.id).toBe('eq-202')
  })

  it('saveInventoryItem calls PATCH /api/v1/vendor/inventory/:id for existing listings', async () => {
    const updatedItem = {
      id: 'eq-101',
      name: 'Sony FX3 Cinema Camera (Updated)',
      category_id: 1,
      price_per_day: 3800,
      security_deposit: 15000,
      quantity: 2,
      status: 'active',
      images: [],
    }

    vi.mocked(apiClient.patch).mockResolvedValueOnce(updatedItem)

    const input = {
      id: 'eq-101',
      name: 'Sony FX3 Cinema Camera (Updated)',
      price_per_day: 3800,
    }

    const saved = await saveInventoryItem(input)
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/api/v1/vendor/inventory/eq-101',
      expect.objectContaining({
        name: 'Sony FX3 Cinema Camera (Updated)',
        price_per_day: 3800,
      }),
    )
    expect(saved.name).toBe('Sony FX3 Cinema Camera (Updated)')
  })

  it('setInventoryItemStatuses calls POST /api/v1/vendor/inventory/bulk-status', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ updated: 2 })

    await setInventoryItemStatuses(['eq-1', 'eq-2'], 'archived')
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/vendor/inventory/bulk-status', {
      equipment_ids: [1, 2],
      status: 'archived',
    })
  })

  it('duplicateInventoryItem calls POST /api/v1/vendor/inventory/:id/duplicate', async () => {
    const duplicated = {
      id: 'eq-copy',
      name: 'Sony FX3 Cinema Camera (Copy)',
    }
    vi.mocked(apiClient.post).mockResolvedValueOnce(duplicated)

    const result = await duplicateInventoryItem('eq-101')
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/vendor/inventory/eq-101/duplicate')
    expect(result.id).toBe('eq-copy')
  })

  it('addAvailabilityBlock and removeAvailabilityBlock call respective backend endpoints', async () => {
    const block = {
      id: 'blk-1',
      equipment_id: 'eq-101',
      start_date: '2026-11-01',
      end_date: '2026-11-05',
      units: 1,
      reason: 'maintenance',
    }
    vi.mocked(apiClient.post).mockResolvedValueOnce(block)

    const createdBlock = await addAvailabilityBlock('eq-101', {
      start_date: '2026-11-01',
      end_date: '2026-11-05',
      units: 1,
      reason: 'maintenance',
    })
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/vendor/inventory/eq-101/availability-blocks',
      expect.objectContaining({
        start_date: '2026-11-01',
        end_date: '2026-11-05',
        reason: 'maintenance',
      }),
    )
    expect(createdBlock.id).toBe('blk-1')

    vi.mocked(apiClient.delete).mockResolvedValueOnce({ success: true })
    await removeAvailabilityBlock('eq-101', 'blk-1')
    expect(apiClient.delete).toHaveBeenCalledWith(
      '/api/v1/vendor/inventory/eq-101/availability-blocks/blk-1',
    )
  })
})
