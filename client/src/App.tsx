import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ThemeProvider, useTheme } from '@/providers/theme-provider'
import { MockAuthProvider } from '@/providers/auth-provider'
import { WishlistProvider } from '@/providers/wishlist-provider'
import { CartProvider } from '@/providers/cart-provider'
import { router } from './routes'

function AppContent() {
  const { resolvedTheme } = useTheme()

  return (
    <MockAuthProvider>
      <WishlistProvider>
        <CartProvider>
          <RouterProvider router={router} />
          <Toaster
            position="top-center"
            theme={resolvedTheme}
            richColors
            closeButton
            toastOptions={{
              className: 'font-sans text-xs',
            }}
          />
        </CartProvider>
      </WishlistProvider>
    </MockAuthProvider>
  )
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
