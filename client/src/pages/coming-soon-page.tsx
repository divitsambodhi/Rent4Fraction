import {
  Calendar,
  Compass,
  FileQuestion,
  Filter,
  Lock,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  User,
  Wrench,
} from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { PageContainer } from '@/components/shared/page-container'
import {
  useAppParams,
  useAppPathname,
  useAppSearchParams,
} from '@/components/shared/app-link'

interface ComingSoonPageProps {
  title?: string
  description?: string
}

export function ComingSoonPage({
  title: defaultTitle,
  description: defaultDesc,
}: ComingSoonPageProps) {
  const pathname = useAppPathname()
  const [searchParams] = useAppSearchParams()
  const params = useAppParams()

  // Dynamic parameters
  const equipmentId = params.id
  const q = searchParams.get('q')
  const category = searchParams.get('category')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const vendor = searchParams.get('vendor')
  const tab = searchParams.get('tab')

  // Derive human-readable title & icon based on route
  let pageTitle = defaultTitle
  let pageDesc = defaultDesc
  let Icon = Compass

  if (pathname.startsWith('/equipment') && equipmentId) {
    pageTitle = `Equipment Listing: ${equipmentId}`
    pageDesc = `Detailed specifications, rental calendar, vendor policies, and direct reservation for equipment unit ${equipmentId}.`
    Icon = Package
  } else if (pathname.startsWith('/equipment')) {
    pageTitle = 'Equipment Catalog & Search'
    pageDesc = 'Full multi-vendor equipment directory with faceted filtering and date availability.'
    Icon = Search
  } else if (pathname.startsWith('/checkout')) {
    pageTitle = 'Secure Checkout & Escrow'
    pageDesc = 'Review rental dates, calculate deposit, apply organization billing, and confirm venue delivery.'
    Icon = ShoppingBag
  } else if (pathname.startsWith('/auth')) {
    pageTitle = 'Sign In / Register'
    pageDesc = 'Firebase authentication integration for customers, verified vendors, and administrators.'
    Icon = Lock
  } else if (pathname.startsWith('/account')) {
    pageTitle = `Customer Account ${tab ? `(${tab})` : ''}`
    pageDesc = 'Manage past event bookings, saved wishlist items, active deposits, and delivery addresses.'
    Icon = User
  } else if (pathname.startsWith('/help')) {
    pageTitle = `Help & Knowledge Base ${tab ? `• ${tab.toUpperCase()}` : ''}`
    pageDesc = 'Comprehensive guidelines on rental safety, deposit returns, and multi-vendor coordination.'
    Icon = FileQuestion
  } else if (pathname.startsWith('/vendor/inventory')) {
    pageTitle = 'Vendor Inventory Management'
    pageDesc = 'Add new audio/lighting gear, set daily pricing and deposit requirements, and manage stock quantities.'
    Icon = Package
  } else if (pathname.startsWith('/vendor/orders')) {
    pageTitle = 'Vendor Dispatch & Orders'
    pageDesc = 'Manage delivery schedules, technician staging, and return inspection reports.'
    Icon = Wrench
  } else if (pathname.startsWith('/vendor')) {
    pageTitle = 'Vendor Portal'
    pageDesc = 'Business dashboard, revenue analytics, and performance ratings.'
    Icon = Wrench
  } else if (pathname.startsWith('/admin')) {
    pageTitle = 'Superadmin Operations Console'
    pageDesc = 'Vendor onboarding review, escrow fund management, and platform dispute arbitration.'
    Icon = Sparkles
  }

  const hasSearchParams = Boolean(q || category || from || to || vendor)

  return (
    <PageContainer size="narrow" className="py-16 sm:py-24">
      <EmptyState
        icon={<Icon className="size-8" />}
        title={pageTitle || 'Yet to be updated by admin.'}
        description={
          pageDesc ||
          'This section is part of the next development phase and will connect with the FastAPI backend services.'
        }
        actionLabel="Back to Home"
        actionHref="/"
      />

      {/* Query String Echoing for /equipment and search wiring verification */}
      {hasSearchParams && (
        <div className="mt-8 p-5 rounded-[16px] border border-brand/20 bg-brand/5 max-w-lg mx-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand mb-3">
            <Filter className="size-3.5" />
            <span>Active Search Parameters Detected:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-foreground">
            {q && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-surface border border-border">
                <Search className="size-3.5 text-brand shrink-0" />
                <span className="text-muted-foreground">Query:</span>
                <strong className="truncate">&quot;{q}&quot;</strong>
              </div>
            )}
            {category && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-surface border border-border">
                <Tag className="size-3.5 text-brand shrink-0" />
                <span className="text-muted-foreground">Category:</span>
                <strong className="truncate capitalize">{category}</strong>
              </div>
            )}
            {(from || to) && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-surface border border-border sm:col-span-2">
                <Calendar className="size-3.5 text-brand shrink-0" />
                <span className="text-muted-foreground">Dates:</span>
                <strong>
                  {from || 'Start'} → {to || 'End'}
                </strong>
              </div>
            )}
            {vendor && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-surface border border-border sm:col-span-2">
                <User className="size-3.5 text-brand shrink-0" />
                <span className="text-muted-foreground">Vendor Filter:</span>
                <strong>{vendor}</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  )
}
