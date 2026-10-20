import { Compass } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { PageContainer } from '@/components/shared/page-container'

export function NotFoundPage() {
  return (
    <PageContainer size="narrow" className="py-20 sm:py-28">
      <EmptyState
        icon={<Compass className="size-8" />}
        title="Page Not Found (404)"
        description="The event gear or page you requested does not exist or may have been relocated."
        actionLabel="Return to Storefront"
        actionHref="/"
      />
    </PageContainer>
  )
}
