import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import type { CartLine, CartPeriod } from '@/types/checkout'
import {
  getCart,
  saveCart,
  getDemoCartLines,
  updateCartLine,
  removeCartLine,
  moveCartLineToWishlist,
  applyDatesToAll,
  CART_STORAGE_KEY,
} from '@/lib/api/cart'
import { groupByPeriod, rentalDays } from '@/lib/pricing'

import { toast } from 'sonner'

export type CartItem = CartLine

export interface AddToCartInput {
  equipment_id: string
  name: string
  price_per_day: number
  security_deposit: number
  primary_image_url: string
  vendor_name: string
  quantity: number
  start_date?: string
  end_date?: string
  category?: string
  category_id?: string
  vendor_id?: string
  delivery_available?: boolean
  min_rental_days?: number
  max_available_quantity?: number
}

interface CartContextType {
  items: CartLine[]
  lines: CartLine[]
  cartCount: number
  groupedPeriods: CartPeriod[]
  addToCart: (input: AddToCartInput) => void
  removeFromCart: (cartItemId: string) => CartLine | undefined
  updateQuantity: (cartItemId: string, quantity: number) => void
  updateLineDates: (cartItemId: string, startDate: string, endDate: string) => void
  restoreLine: (line: CartLine) => void
  moveToWishlist: (cartItemId: string) => Promise<void>
  applyPeriodToAll: (periodKey: string) => { conflicts: { equipment_id: string; name: string; available: number }[] }
  loadDemoItems: () => void
  clearCart: () => void
  refreshCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => getCart())

  const refreshCart = useCallback(() => {
    setLines(getCart())
  }, [])

  useEffect(() => {
    const handleCartUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<CartLine[]>
      if (customEvent.detail) {
        setLines(customEvent.detail)
      } else {
        setLines(getCart())
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY) {
        setLines(getCart())
      }
    }

    window.addEventListener('r4f-cart-updated', handleCartUpdated)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('r4f-cart-updated', handleCartUpdated)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const cartCount = useMemo(
    () => lines.reduce((acc, it) => acc + it.quantity, 0),
    [lines],
  )

  const groupedPeriods = useMemo(
    () => groupByPeriod(lines),
    [lines],
  )

  const addToCart = useCallback((input: AddToCartInput) => {
    const from = input.start_date || '2026-11-12'
    const to = input.end_date || '2026-11-14'
    const days = rentalDays(from, to)

    const eqId = String(input.equipment_id)
    const mock = null as any

    const compositeId = `${eqId}_${from}_${to}`

    setLines((prev) => {
      const existingIdx = prev.findIndex(
        (it) => it.equipment_id === eqId && it.start_date === from && it.end_date === to,
      )

      let updated: CartLine[]
      if (existingIdx >= 0) {
        updated = [...prev]
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + input.quantity,
          days,
        }
      } else {
        const newLine: CartLine = {
          cart_item_id: compositeId,
          equipment_id: eqId,
          name: input.name || mock?.name || 'Equipment Item',
          category: input.category || mock?.category_name || 'Equipment',
          category_id: input.category_id || mock?.category_id || '1',
          vendor_id: input.vendor_id || mock?.vendor_id || '1',
          vendor_name: input.vendor_name || mock?.vendor_name || 'Vendor Partner',
          price_per_day: input.price_per_day ?? mock?.price_per_day ?? 1000,
          security_deposit: input.security_deposit ?? mock?.security_deposit ?? 2000,
          quantity: Math.max(1, input.quantity || 1),
          start_date: from,
          end_date: to,
          days,
          primary_image_url: input.primary_image_url || mock?.primary_image_url || '/images/equipment/line-array-speaker.svg',
          delivery_available: input.delivery_available ?? mock?.delivery_available ?? true,
          min_rental_days: input.min_rental_days ?? mock?.min_rental_days ?? 1,
          max_available_quantity: input.max_available_quantity ?? 6,
        }
        updated = [...prev, newLine]
      }

      saveCart(updated)
      return updated
    })
  }, [])

  const removeFromCart = useCallback((cartItemId: string): CartLine | undefined => {
    const { updatedLines, removed } = removeCartLine(cartItemId)
    setLines(updatedLines)
    return removed
  }, [])

  const restoreLine = useCallback((line: CartLine) => {
    setLines((prev) => {
      const updated = [...prev, line]
      saveCart(updated)
      return updated
    })
  }, [])

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId)
      return
    }
    const updated = updateCartLine(cartItemId, { quantity })
    setLines(updated)
  }, [removeFromCart])

  const updateLineDates = useCallback((cartItemId: string, startDate: string, endDate: string) => {
    const updated = updateCartLine(cartItemId, {
      start_date: startDate,
      end_date: endDate,
    })
    setLines(updated)
  }, [])

  const moveToWishlist = useCallback(async (cartItemId: string) => {
    const updated = await moveCartLineToWishlist(cartItemId)
    setLines(updated)
    toast.success('Moved to wishlist')
  }, [])

  const applyPeriodToAll = useCallback((periodKey: string) => {
    const { updatedLines, conflicts } = applyDatesToAll(periodKey, lines)
    setLines(updatedLines)
    return { conflicts }
  }, [lines])

  const loadDemoItems = useCallback(() => {
    const demo = getDemoCartLines()
    saveCart(demo)
    setLines(demo)
    toast.success('Added demo items to cart', {
      description: 'Loaded 4 items across 2 rental periods.',
    })
  }, [])

  const clearCart = useCallback(() => {
    saveCart([])
    setLines([])
  }, [])

  return (
    <CartContext.Provider
      value={{
        items: lines,
        lines,
        cartCount,
        groupedPeriods,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateLineDates,
        restoreLine,
        moveToWishlist,
        applyPeriodToAll,
        loadDemoItems,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
