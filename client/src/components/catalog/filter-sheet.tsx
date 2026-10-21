import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { FilterPanel } from './filter-panel'
import { Button } from '@/components/ui/button'
import { useOverlayHistory } from '@/hooks/use-overlay-history'
import type { CategoryTreeGroup, CanonicalVendor } from '@/lib/api'
import type { ParsedCatalogParams } from '@/hooks/use-catalog-params'

export interface FilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  params: ParsedCatalogParams
  categoryTree: CategoryTreeGroup[]
  vendors: CanonicalVendor[]
  totalResults: number
  onUpdateParams: (
    updates: Partial<Record<string, string | number | boolean | null | undefined>>,
  ) => void
  onClearAll: () => void
}

export function FilterSheet({
  open,
  onOpenChange,
  params,
  categoryTree,
  vendors,
  totalResults,
  onUpdateParams,
  onClearAll,
}: FilterSheetProps) {
  // Android Back button handling
  useOverlayHistory({
    isOpen: open,
    onClose: () => onOpenChange(false),
    overlayId: 'catalog-filter-sheet',
    enabled: open,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] h-[92dvh] rounded-t-[20px] p-0 flex flex-col bg-background border-t border-border z-sheet overflow-hidden"
      >
        <SheetHeader className="px-5 py-3 border-b border-border bg-surface shrink-0">
          <SheetTitle className="text-left font-serif text-lg font-semibold flex items-center justify-between">
            <span>Filter Equipment</span>
          </SheetTitle>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <FilterPanel
            params={params}
            categoryTree={categoryTree}
            vendors={vendors}
            onUpdateParams={onUpdateParams}
            onClearAll={onClearAll}
            className="border-0 shadow-none"
          />
        </div>

        {/* Sticky Accessible Footer with Safe Area */}
        <div className="p-4 border-t border-border bg-surface flex items-center gap-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg">
          <Button
            type="button"
            variant="outline"
            onClick={onClearAll}
            className="h-12 min-h-[44px] flex-1 rounded-[10px] font-semibold text-foreground border-border hover:bg-muted/50 cursor-pointer"
          >
            Clear all
          </Button>

          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-12 min-h-[44px] flex-2 rounded-[10px] font-semibold bg-brand text-white hover:bg-brand-hover shadow-xs cursor-pointer"
          >
            Show {totalResults} {totalResults === 1 ? 'result' : 'results'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
