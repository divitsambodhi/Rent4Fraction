import { Icon } from '@/components/ui/icon'
import { EmptyState } from '@/components/shared/empty-state'
import { PageContainer } from '@/components/shared/page-container'

export function NotFoundPage() {
  return (
    <PageContainer size="narrow" className="py-20 sm:py-28">
      <EmptyState
        icon={<Icon name="help" size={32} />}
        title="Page not found"
        description="The page or equipment listing you requested does not exist or has been moved."
        actionLabel="Return to home"
        actionHref="/"
      />
    </PageContainer>
  )
}
