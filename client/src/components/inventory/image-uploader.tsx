import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { ConfirmDialog } from '@/components/account/confirm-dialog'
import { processImageUpload } from '@/lib/image-processing'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface UploadedImage {
  id: string
  url: string
  isPrimary: boolean
  alt?: string
}

interface ImageUploaderProps {
  images: UploadedImage[]
  onChange: (images: UploadedImage[]) => void
  disabled?: boolean
  maxImages?: number
}

export function ImageUploader({
  images,
  onChange,
  disabled = false,
  maxImages = 8,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [imageToRemove, setImageToRemove] = useState<UploadedImage | null>(null)

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    const files = Array.from(fileList)
    setIsProcessing(true)
    const newItems: UploadedImage[] = []

    try {
      for (const file of files) {
        if (images.length + newItems.length >= maxImages) {
          toast.error(`Maximum ${maxImages} images allowed.`)
          break
        }

        try {
          const processed = await processImageUpload(file, 1600, 0.8)
          const item: UploadedImage = {
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            url: processed.dataUrl,
            isPrimary: images.length === 0 && newItems.length === 0,
          }
          newItems.push(item)
        } catch (err) {
          toast.error(`${file.name}: ${err instanceof Error ? err.message : 'Processing failed'}`)
        }
      }

      if (newItems.length > 0) {
        const combined = [...images, ...newItems]
        if (!combined.some((img) => img.isPrimary) && combined.length > 0) {
          combined[0].isPrimary = true
        }
        onChange(combined)
        toast.success(`Processed & added ${newItems.length} image(s).`)
      }
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    processFiles(e.dataTransfer.files)
  }

  const handleSetPrimary = (id: string) => {
    const updated = images.map((img) => ({
      ...img,
      isPrimary: img.id === id,
    }))
    onChange(updated)
  }

  const handleMoveLeft = (index: number) => {
    if (index === 0) return
    const updated = [...images]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    onChange(updated)
  }

  const handleMoveRight = (index: number) => {
    if (index === images.length - 1) return
    const updated = [...images]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    onChange(updated)
  }

  const handleConfirmRemove = () => {
    if (!imageToRemove) return
    const filtered = images.filter((img) => img.id !== imageToRemove.id)
    if (imageToRemove.isPrimary && filtered.length > 0) {
      filtered[0].isPrimary = true
    }
    onChange(filtered)
    setImageToRemove(null)
    toast.success('Image removed from listing.')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-semibold text-foreground block">
            Equipment photography
          </label>
          <span className="text-[11px] text-muted-foreground">
            First image is primary. Auto-downscaled and EXIF-corrected.
          </span>
        </div>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {images.length}/{maxImages}
        </span>
      </div>

      {/* Drag & Drop / Mobile Tap Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer min-h-[120px]',
          isDragging
            ? 'border-brand bg-brand/5 scale-[1.01]'
            : 'border-border bg-muted/20 hover:border-brand/40 hover:bg-muted/30',
          (disabled || isProcessing) && 'opacity-60 cursor-not-allowed',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          disabled={disabled || isProcessing || images.length >= maxImages}
          onChange={(e) => processFiles(e.target.files)}
          className="hidden"
          id="equipment-image-input"
        />

        <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-2">
          {isProcessing ? (
            <Icon name="loader" size={20} className="animate-spin" />
          ) : (
            <Icon name="camera" size={20} />
          )}
        </div>

        <p className="text-xs sm:text-sm font-semibold text-foreground">
          {isProcessing ? 'Optimizing photo...' : 'Tap to capture / upload images'}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Automatic EXIF orientation & 1600px optimization
        </p>
      </div>

      {/* Uploaded Images Grid with Touch-Friendly Controls */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {images.map((img, index) => (
            <div
              key={img.id}
              className={cn(
                'rounded-xl border border-border bg-surface overflow-hidden shadow-xs relative flex flex-col',
                img.isPrimary && 'ring-2 ring-brand',
              )}
            >
              {/* Image Preview Thumbnail */}
              <div className="aspect-4/3 w-full bg-muted/50 overflow-hidden relative">
                <img
                  src={img.url}
                  alt={`Equipment preview ${index + 1}`}
                  className="size-full object-cover"
                />

                {/* Primary Tag Indicator */}
                {img.isPrimary ? (
                  <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-brand text-white text-[11px] font-bold shadow-xs flex items-center gap-1">
                    <Icon name="check" size={12} />
                    <span>Primary</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(img.id)}
                    className="absolute top-2 left-2 min-h-[36px] px-2.5 py-1 rounded-full bg-black/70 hover:bg-brand text-white text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Set as primary
                  </button>
                )}

                {/* 44px Hit Area Remove button */}
                <button
                  type="button"
                  onClick={() => setImageToRemove(img)}
                  className="absolute top-2 right-2 min-w-[44px] min-h-[44px] rounded-full bg-black/70 hover:bg-danger text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Remove image"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>

              {/* Bottom Reorder Controls with 44px Hit Areas */}
              <div className="p-2 flex items-center justify-between border-t border-border bg-background text-xs">
                <span className="text-muted-foreground px-2 font-medium">#{index + 1}</span>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={disabled || index === 0}
                    onClick={() => handleMoveLeft(index)}
                    className="min-w-[44px] min-h-[44px] p-2 inline-flex items-center justify-center cursor-pointer"
                    aria-label="Move image left"
                  >
                    <Icon name="chevron-left" size={16} />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    disabled={disabled || index === images.length - 1}
                    onClick={() => handleMoveRight(index)}
                    className="min-w-[44px] min-h-[44px] p-2 inline-flex items-center justify-center cursor-pointer"
                    aria-label="Move image right"
                  >
                    <Icon name="chevron-right" size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog for Image Deletion */}
      <ConfirmDialog
        open={Boolean(imageToRemove)}
        onOpenChange={(open) => !open && setImageToRemove(null)}
        title="Remove image from equipment listing?"
        description="This image will be detached from the equipment listing. If this was the primary image, another image will be designated as primary."
        confirmLabel="Remove image"
        cancelLabel="Keep image"
        variant="danger"
        onConfirm={handleConfirmRemove}
      />
    </div>
  )
}
