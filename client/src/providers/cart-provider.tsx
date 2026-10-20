import React, { createContext, useContext, useEffect, useState } from 'react'

export interface CartItem {
  id: string
  equipment_id: string
  name: string
  price_per_day: number
  security_deposit: number
  primary_image_url: string
  vendor_name: string
  quantity: number
  start_date?: string
  end_date?: string
  days: number
}

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
}

interface CartContextType {
  items: CartItem[]
  cartCount: number
  addToCart: (input: AddToCartInput) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
}

const CART_STORAGE_KEY = 'r4f-cart-items-v1'

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
      // Also sync legacy key for backwards compatibility
      const totalCount = items.reduce((acc, it) => acc + it.quantity, 0)
      localStorage.setItem('r4f-cart-count', String(totalCount))
    } catch {
      // Ignore
    }
  }, [items])

  const addToCart = (input: AddToCartInput) => {
    const from = input.start_date
    const to = input.end_date
    const compositeId = `${input.equipment_id}_${from || 'none'}_${to || 'none'}`

    let days = 1
    if (from && to) {
      const d1 = new Date(from).getTime()
      const d2 = new Date(to).getTime()
      days = Math.max(1, Math.round((d2 - d1) / 86400000) + 1)
    }

    setItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.id === compositeId)
      if (existingIdx >= 0) {
        // Merge identical item + dates
        const updated = [...prev]
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + input.quantity,
          days,
        }
        return updated
      }

      const newItem: CartItem = {
        id: compositeId,
        equipment_id: input.equipment_id,
        name: input.name,
        price_per_day: input.price_per_day,
        security_deposit: input.security_deposit,
        primary_image_url: input.primary_image_url,
        vendor_name: input.vendor_name,
        quantity: input.quantity,
        start_date: from,
        end_date: to,
        days,
      }

      return [...prev, newItem]
    })
  }

  const removeFromCart = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id)
      return
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item)),
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const cartCount = items.reduce((acc, it) => acc + it.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
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
