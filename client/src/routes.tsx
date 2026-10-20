import { createBrowserRouter, Outlet } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/public-layout'
import { ScrollManager } from '@/components/shared/scroll-manager'
import { HomePage } from '@/pages/home-page'
import { CatalogPage } from '@/pages/catalog-page'
import { EquipmentDetailPage } from '@/pages/equipment-detail-page'
import { ComingSoonPage } from '@/pages/coming-soon-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { AuthPage } from '@/pages/auth-page'
import { AccountPage } from '@/pages/account-page'
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
            <ComingSoonPage />
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
        element: <ComingSoonPage />,
      },
      {
        path: 'vendor',
        element: (
          <RequireRole roles={['vendor']}>
            <ComingSoonPage />
          </RequireRole>
        ),
      },
      {
        path: 'vendor/inventory',
        element: (
          <RequireRole roles={['vendor']} requireApprovedVendor>
            <ComingSoonPage />
          </RequireRole>
        ),
      },
      {
        path: 'vendor/orders',
        element: (
          <RequireRole roles={['vendor']} requireApprovedVendor>
            <ComingSoonPage />
          </RequireRole>
        ),
      },
      {
        path: 'admin',
        element: (
          <RequireRole roles={['admin']}>
            <ComingSoonPage />
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
