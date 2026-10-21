import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/public-layout'
import { ScrollManager } from '@/components/shared/scroll-manager'
import { RequireRole } from '@/components/auth/require-role'

// Lazy loaded page components
const HomePage = lazy(() => import('@/pages/home-page').then((m) => ({ default: m.HomePage })))
const CatalogPage = lazy(() => import('@/pages/catalog-page').then((m) => ({ default: m.CatalogPage })))
const EquipmentDetailPage = lazy(() =>
  import('@/pages/equipment-detail-page').then((m) => ({ default: m.EquipmentDetailPage }))
)
const CheckoutPage = lazy(() => import('@/pages/checkout-page').then((m) => ({ default: m.CheckoutPage })))
const AccountPage = lazy(() => import('@/pages/account-page').then((m) => ({ default: m.AccountPage })))
const HelpPage = lazy(() => import('@/pages/help-page').then((m) => ({ default: m.HelpPage })))
const VendorPage = lazy(() => import('@/pages/vendor-page').then((m) => ({ default: m.VendorPage })))
const InventoryPage = lazy(() => import('@/pages/inventory-page').then((m) => ({ default: m.InventoryPage })))
const VendorOrdersPage = lazy(() =>
  import('@/pages/vendor-orders-page').then((m) => ({ default: m.VendorOrdersPage }))
)
const AdminPage = lazy(() => import('@/pages/admin-page').then((m) => ({ default: m.AdminPage })))
const AuthPage = lazy(() => import('@/pages/auth-page').then((m) => ({ default: m.AuthPage })))
const NotFoundPage = lazy(() => import('@/pages/not-found-page').then((m) => ({ default: m.NotFoundPage })))
const VendorDashboardPreview = lazy(() =>
  import('@/pages/preview/vendor-dashboard-preview').then((m) => ({ default: m.VendorDashboardPreview }))
)
const AdminDashboardPreview = lazy(() =>
  import('@/pages/preview/admin-dashboard-preview').then((m) => ({ default: m.AdminDashboardPreview }))
)

// Prefetch triggers for next likely route chunk
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

function RootLayout() {
  return (
    <>
      <ScrollManager />
      <PublicLayout>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </PublicLayout>
    </>
  )
}

function PreviewLayout() {
  return (
    <>
      <ScrollManager />
      <Suspense fallback={<PageFallback />}>
        <Outlet />
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
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'equipment',
        element: <CatalogPage />,
      },
      {
        path: 'equipment/:id',
        element: <EquipmentDetailPage />,
      },
      {
        path: 'checkout',
        element: (
          <RequireRole roles={['customer']}>
            <CheckoutPage />
          </RequireRole>
        ),
      },
      {
        path: 'account',
        element: (
          <RequireRole roles={['customer']}>
            <AccountPage />
          </RequireRole>
        ),
      },
      {
        path: 'help',
        element: <HelpPage />,
      },
      {
        path: 'vendor',
        element: (
          <RequireRole roles={['vendor']}>
            <VendorPage />
          </RequireRole>
        ),
      },
      {
        path: 'vendor/inventory',
        element: (
          <RequireRole roles={['vendor']} requireApprovedVendor>
            <InventoryPage />
          </RequireRole>
        ),
      },
      {
        path: 'vendor/orders',
        element: (
          <RequireRole roles={['vendor']} requireApprovedVendor>
            <VendorOrdersPage />
          </RequireRole>
        ),
      },
      {
        path: 'admin',
        element: (
          <RequireRole roles={['admin']}>
            <AdminPage />
          </RequireRole>
        ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: '_preview',
    element: <PreviewLayout />,
    children: [
      {
        path: 'vendor',
        element: <VendorDashboardPreview />,
      },
      {
        path: 'admin',
        element: <AdminDashboardPreview />,
      },
    ],
  },
])
