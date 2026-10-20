import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/providers/theme-provider'
import { MockAuthProvider } from '@/providers/auth-provider'
import { WishlistProvider } from '@/providers/wishlist-provider'
import { CartProvider } from '@/providers/cart-provider'
import { router } from './routes'

export function App() {
  return (
    <ThemeProvider>
      <MockAuthProvider>
        <WishlistProvider>
          <CartProvider>
            <RouterProvider router={router} />
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                className: 'font-sans text-xs',
              }}
            />
          </CartProvider>
        </WishlistProvider>
      </MockAuthProvider>
    </ThemeProvider>
  )
}

export default App
