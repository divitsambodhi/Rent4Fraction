import React, { createContext, useContext, useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/providers/auth-provider'

interface WishlistContextType {
  wishlist: string[]
  isWishlisted: (id: string) => boolean
  toggleWishlist: (id: string) => void
  cartCount: number
  addToCart: () => void
  clearCart: () => void
}

const WISHLIST_KEY = 'r4f-wishlist'
const CART_KEY = 'r4f-cart-count'

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth()
  const [wishlist, setWishlist] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(WISHLIST_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [cartCount, setCartCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    try {
      const saved = localStorage.getItem(CART_KEY)
      return saved ? Number(saved) : 0
    } catch {
      return 0
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist))
    } catch {
      // Ignore
    }
  }, [wishlist])

  useEffect(() => {
    if (status !== 'ready' || !user) return

    apiClient
      .get<Array<{ equipment_id: string }>>('/api/v1/wishlist')
      .then((serverItems) => {
        if (Array.isArray(serverItems) && serverItems.length > 0) {
          setWishlist((prev) => {
            const serverIds = serverItems.map((it) => String(it.equipment_id))
            return Array.from(new Set([...prev, ...serverIds]))
          })
        }
      })
      .catch(() => {
        // Visitor or unauthenticated; ignore
      })

    const handleSync = () => {
      try {
        const saved = localStorage.getItem(WISHLIST_KEY)
        if (saved) {
          setWishlist(JSON.parse(saved))
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener('r4f-account-store-updated', handleSync)
    return () => window.removeEventListener('r4f-account-store-updated', handleSync)
  }, [status, user])

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, String(cartCount))
    } catch {
      // Ignore
    }
  }, [cartCount])

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const willRemove = prev.includes(id)
      const next = willRemove ? prev.filter((item) => item !== id) : [...prev, id]
      const numericId = id.replace(/\D/g, '') || id
      if (numericId) {
        if (willRemove) {
          apiClient.delete(`/api/v1/wishlist/${numericId}`).catch(() => {})
        } else {
          apiClient.post(`/api/v1/wishlist/${numericId}`).catch(() => {})
        }
      }
      return next
    })
  }

  const isWishlisted = (id: string) => wishlist.includes(id)

  const addToCart = () => setCartCount((prev) => prev + 1)
  const clearCart = () => setCartCount(0)

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isWishlisted,
        toggleWishlist,
        cartCount,
        addToCart,
        clearCart,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
}
