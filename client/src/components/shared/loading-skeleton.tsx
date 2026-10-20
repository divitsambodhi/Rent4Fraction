import { cn } from '@/lib/utils'

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[10px] bg-muted/70 dark:bg-muted/40',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton as LoadingSkeleton }

export function EquipmentCardSkeleton() {
  return (
    <div className="flex flex-col rounded-[12px] border border-border bg-surface overflow-hidden shadow-xs">
      <Skeleton className="aspect-4/3 w-full rounded-none" />
      <div className="p-4 flex flex-col flex-1 gap-2.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  )
}

export function CategoryStripSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center p-3 rounded-[12px] border border-border bg-surface gap-2"
        >
          <Skeleton className="size-14 rounded-[10px]" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  )
}

export function VendorCardSkeleton() {
  return (
    <div className="flex items-center gap-3.5 p-4 rounded-[12px] border border-border bg-surface">
      <Skeleton className="size-12 rounded-[10px]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}
