import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { PageContainer } from '@/components/shared/page-container'

export function DetailSkeleton() {
  return (
    <PageContainer className="py-6 space-y-6">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <LoadingSkeleton className="h-4 w-16 rounded" />
        <span className="text-muted-foreground/40">/</span>
        <LoadingSkeleton className="h-4 w-24 rounded" />
        <span className="text-muted-foreground/40">/</span>
        <LoadingSkeleton className="h-4 w-20 rounded" />
        <span className="text-muted-foreground/40">/</span>
        <LoadingSkeleton className="h-4 w-36 rounded" />
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Main 4:3 Gallery Skeleton */}
          <div className="space-y-3">
            <LoadingSkeleton className="w-full aspect-4/3 rounded-[16px]" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <LoadingSkeleton
                  key={i}
                  className="h-[72px] aspect-4/3 rounded-[10px]"
                />
              ))}
            </div>
          </div>

          {/* Title Block Skeleton */}
          <div className="space-y-3 pt-2">
            <LoadingSkeleton className="h-6 w-28 rounded-full" />
            <LoadingSkeleton className="h-9 w-3/4 rounded-lg" />
            <div className="flex items-center gap-4">
              <LoadingSkeleton className="h-4 w-32 rounded" />
              <LoadingSkeleton className="h-4 w-40 rounded" />
            </div>
            <div className="flex gap-2 pt-1">
              <LoadingSkeleton className="h-6 w-28 rounded-full" />
              <LoadingSkeleton className="h-6 w-24 rounded-full" />
              <LoadingSkeleton className="h-6 w-28 rounded-full" />
            </div>
            <LoadingSkeleton className="h-16 w-full rounded-lg" />
          </div>

          {/* Section Nav Skeleton */}
          <LoadingSkeleton className="h-12 w-full rounded-[10px]" />

          {/* Content Card Skeleton (Overview) */}
          <div className="p-6 rounded-[16px] border border-border bg-surface space-y-4">
            <LoadingSkeleton className="h-7 w-36 rounded" />
            <LoadingSkeleton className="h-20 w-full rounded" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <LoadingSkeleton className="h-12 rounded-[10px]" />
              <LoadingSkeleton className="h-12 rounded-[10px]" />
              <LoadingSkeleton className="h-12 rounded-[10px]" />
              <LoadingSkeleton className="h-12 rounded-[10px]" />
            </div>
          </div>

          {/* Content Card Skeleton (Calendar) */}
          <div className="p-6 rounded-[16px] border border-border bg-surface space-y-4">
            <LoadingSkeleton className="h-7 w-48 rounded" />
            <LoadingSkeleton className="h-64 w-full rounded-[12px]" />
          </div>
        </div>

        {/* Right Column (4 cols on desktop): Booking Card Skeleton */}
        <div className="hidden lg:block lg:col-span-4 sticky top-[88px]">
          <div className="w-full max-w-[380px] p-6 rounded-[16px] border border-border bg-surface space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-border">
              <LoadingSkeleton className="h-8 w-28 rounded" />
              <LoadingSkeleton className="h-6 w-20 rounded" />
            </div>
            <div className="space-y-2">
              <LoadingSkeleton className="h-4 w-24 rounded" />
              <div className="grid grid-cols-2 gap-2">
                <LoadingSkeleton className="h-11 rounded-[10px]" />
                <LoadingSkeleton className="h-11 rounded-[10px]" />
              </div>
            </div>
            <div className="space-y-2">
              <LoadingSkeleton className="h-4 w-20 rounded" />
              <LoadingSkeleton className="h-11 rounded-[10px]" />
            </div>
            <LoadingSkeleton className="h-12 w-full rounded-[10px]" />
            <LoadingSkeleton className="h-24 w-full rounded" />
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
