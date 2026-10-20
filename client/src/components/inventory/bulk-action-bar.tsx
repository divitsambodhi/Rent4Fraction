import { useState } from 'react'
import { Archive, CheckCircle, PowerOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/account/confirm-dialog'

interface BulkActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkActivate: () => Promise<void>
  onBulkDeactivate: () => Promise<void>
  onBulkArchive: () => Promise<void>
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkActivate,
  onBulkDeactivate,
  onBulkArchive,
}: BulkActionBarProps) {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  if (selectedCount === 0) return null

  const handleArchiveConfirm = async () => {
    setLoading(true)
    try {
      await onBulkArchive()
      setShowArchiveDialog(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-foreground text-background dark:bg-surface dark:text-foreground px-4 sm:px-6 py-3 rounded-2xl shadow-xl border border-border flex items-center gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-[90vw]">
        <div className="flex items-center gap-2 pr-3 border-r border-background/20 dark:border-border text-xs sm:text-sm font-semibold whitespace-nowrap">
          <span>{selectedCount} item{selectedCount > 1 ? 's' : ''} selected</span>
          <button
            type="button"
            onClick={onClearSelection}
            className="text-muted-foreground hover:text-background dark:hover:text-foreground cursor-pointer"
            aria-label="Clear selection"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onBulkActivate}
            className="text-xs h-8 px-2.5 gap-1.5 hover:bg-background/20 dark:hover:bg-muted"
          >
            <CheckCircle className="size-3.5 text-success" />
            <span className="hidden sm:inline">Activate</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onBulkDeactivate}
            className="text-xs h-8 px-2.5 gap-1.5 hover:bg-background/20 dark:hover:bg-muted"
          >
            <PowerOff className="size-3.5 text-warning" />
            <span className="hidden sm:inline">Deactivate</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowArchiveDialog(true)}
            className="text-xs h-8 px-2.5 gap-1.5 hover:bg-background/20 dark:hover:bg-muted text-danger hover:text-danger"
          >
            <Archive className="size-3.5" />
            <span>Archive</span>
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        title={`Archive ${selectedCount} selected item${selectedCount > 1 ? 's' : ''}?`}
        description="Archiving removes equipment listings permanently from search results and storefronts. Items with active or upcoming bookings cannot be archived."
        confirmLabel="Archive equipment"
        cancelLabel="Cancel"
        variant="danger"
        loading={loading}
        onConfirm={handleArchiveConfirm}
      />
    </>
  )
}
