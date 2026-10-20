import { createBrowserRouter, Outlet } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/public-layout'
import { ScrollManager } from '@/components/shared/scroll-manager'
import { HomePage } from '@/pages/home-page'
import { CatalogPage } from '@/pages/catalog-page'
import { EquipmentDetailPage } from '@/pages/equipment-detail-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { AuthPage } from '@/pages/auth-page'
import { AccountPage } from '@/pages/account-page'
import { CheckoutPage } from '@/pages/checkout-page'
import { HelpPage } from '@/pages/help-page'
import { VendorPage } from '@/pages/vendor-page'
import { InventoryPage } from '@/pages/inventory-page'
import { VendorOrdersPage } from '@/pages/vendor-orders-page'
import { AdminPage } from '@/pages/admin-page'
import { RequireRole } from '@/components/auth/require-role'
import { VendorDashboardPreview } from '@/pages/preview/vendor-dashboard-preview'
import { AdminDashboardPreview } from '@/pages/preview/admin-dashboard-preview'

function RootLayout() {
  return (
    <>
      <ScrollManager />
      <PublicLayout>
        <Outlet />
      </PublicLayout>
    </>
  )
}

function PreviewLayout() {
  return (
    <>
      <ScrollManager />
      <Outlet />
    </>
  )
}

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: (
      <>
        <ScrollManager />
        <AuthPage />
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
