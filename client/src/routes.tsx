import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { PublicShell } from '@/components/layout/public-shell'
import { VendorShell } from '@/components/layout/vendor-shell'
import { AdminShell } from '@/components/layout/admin-shell'
import { RoleAwareHelpPage } from '@/components/layout/role-aware-help'
import { ScrollManager } from '@/components/shared/scroll-manager'
import { RequireRole } from '@/components/auth/require-role'

// Lazy loaded page components (Chunk isolation per Task D1)
const HomePage = lazy(() => import('@/pages/home-page').then((m) => ({ default: m.HomePage })))
const CatalogPage = lazy(() => import('@/pages/catalog-page').then((m) => ({ default: m.CatalogPage })))
const EquipmentDetailPage = lazy(() =>
  import('@/pages/equipment-detail-page').then((m) => ({ default: m.EquipmentDetailPage }))
)
const CheckoutPage = lazy(() => import('@/pages/checkout-page').then((m) => ({ default: m.CheckoutPage })))
const AccountPage = lazy(() => import('@/pages/account-page').then((m) => ({ default: m.AccountPage })))
const VendorPage = lazy(() => import('@/pages/vendor-page').then((m) => ({ default: m.VendorPage })))
const InventoryPage = lazy(() => import('@/pages/inventory-page').then((m) => ({ default: m.InventoryPage })))
const VendorOrdersPage = lazy(() =>
  import('@/pages/vendor-orders-page').then((m) => ({ default: m.VendorOrdersPage }))
)
const AdminPage = lazy(() => import('@/pages/admin-page').then((m) => ({ default: m.AdminPage })))
const AuthPage = lazy(() => import('@/pages/auth-page').then((m) => ({ default: m.AuthPage })))
const NotFoundPage = lazy(() => import('@/pages/not-found-page').then((m) => ({ default: m.NotFoundPage })))


// Prefetch triggers for next likely route chunk (Task D4)
export function prefetchCatalog() {
  import('@/pages/catalog-page')
}
export function prefetchDetail() {
  import('@/pages/equipment-detail-page')
}
export function prefetchCheckout() {
  import('@/pages/checkout-page')
}

function PageFallback() {
  return (
    <div className="w-full min-h-[60dvh] flex flex-col items-center justify-center p-6 space-y-4 animate-pulse">
      <div className="size-10 rounded-full bg-muted/60" />
      <div className="h-4 w-40 bg-muted/60 rounded" />
      <div className="h-3 w-64 bg-muted/40 rounded" />
    </div>
  )
}

function PublicRootLayout() {
  return (
    <>
      <ScrollManager />
      <PublicShell />
    </>
  )
}

function VendorRootLayout() {
  return (
    <>
      <ScrollManager />
      <Suspense fallback={<PageFallback />}>
        <VendorShell />
      </Suspense>
    </>
  )
}

function AdminRootLayout() {
  return (
    <>
      <ScrollManager />
      <Suspense fallback={<PageFallback />}>
        <AdminShell />
      </Suspense>
    </>
  )
}


export const router = createBrowserRouter([
  {
    path: '/auth',
    element: (
      <>
        <ScrollManager />
        <Suspense fallback={<PageFallback />}>
          <AuthPage />
        </Suspense>
      </>
    ),
  },

  // Vendor Shell Routes
  {
    path: '/vendor',
    element: <VendorRootLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageFallback />}>
            <VendorPage />
          </Suspense>
        ),
      },
      {
        path: 'inventory',
        element: (
          <RequireRole roles={['vendor']} requireApprovedVendor>
            <Suspense fallback={<PageFallback />}>
              <InventoryPage />
            </Suspense>
          </RequireRole>
        ),
      },
      {
        path: 'orders',
        element: (
          <RequireRole roles={['vendor']} requireApprovedVendor>
            <Suspense fallback={<PageFallback />}>
              <VendorOrdersPage />
            </Suspense>
          </RequireRole>
        ),
      },
    ],
  },

  // Admin Shell Routes
  {
    path: '/admin',
    element: <AdminRootLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageFallback />}>
            <AdminPage />
          </Suspense>
        ),
      },
    ],
  },

  // Public & Customer Shell Routes
  {
    path: '/',
    element: <PublicRootLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageFallback />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: 'equipment',
        element: (
          <Suspense fallback={<PageFallback />}>
            <CatalogPage />
          </Suspense>
        ),
      },
      {
        path: 'equipment/:id',
        element: (
          <Suspense fallback={<PageFallback />}>
            <EquipmentDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'checkout',
        element: (
          <RequireRole roles={['customer']}>
            <Suspense fallback={<PageFallback />}>
              <CheckoutPage />
            </Suspense>
          </RequireRole>
        ),
      },
      {
        path: 'account',
        element: (
          <RequireRole roles={['customer']}>
            <Suspense fallback={<PageFallback />}>
              <AccountPage />
            </Suspense>
          </RequireRole>
        ),
      },
      {
        path: 'help',
        element: (
          <Suspense fallback={<PageFallback />}>
            <RoleAwareHelpPage />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<PageFallback />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
])
