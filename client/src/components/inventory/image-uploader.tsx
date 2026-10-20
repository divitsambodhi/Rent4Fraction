import { useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Star,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/account/confirm-dialog'
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
  const [imageToRemove, setImageToRemove] = useState<UploadedImage | null>(null)

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    const files = Array.from(fileList)
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    const newItems: UploadedImage[] = []

    for (const file of files) {
      if (images.length + newItems.length >= maxImages) {
        toast.error(`Maximum ${maxImages} images allowed.`)
        break
      }

      if (!allowed.includes(file.type)) {
        toast.error(`${file.name}: only JPG, PNG, and WebP files are supported.`)
        continue
      }

      // 5MB limit
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds the 5MB file size limit.`)
        continue
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          const item: UploadedImage = {
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            url: e.target.result,
            isPrimary: images.length === 0 && newItems.length === 0,
          }
          newItems.push(item)

          if (newItems.length === files.length || images.length + newItems.length >= maxImages) {
            const combined = [...images, ...newItems]
            // Ensure exactly one primary
            if (!combined.some((img) => img.isPrimary) && combined.length > 0) {
              combined[0].isPrimary = true
            }
            onChange(combined)
            toast.success(`Added ${newItems.length} image(s).`)
          }
        }
      }
      reader.readAsDataURL(file)
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
    // If we removed the primary, promote the first remaining
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
            First image is primary (shown in catalogue cards). Drag or use arrow buttons to reorder.
          </span>
        </div>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {images.length}/{maxImages}
        </span>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer',
          isDragging
            ? 'border-brand bg-brand/5 scale-[1.01]'
            : 'border-border bg-muted/20 hover:border-brand/40 hover:bg-muted/30',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled || images.length >= maxImages}
          onChange={(e) => processFiles(e.target.files)}
          className="hidden"
          id="equipment-image-input"
        />

        <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-2">
          <Upload className="size-5" />
        </div>

        <p className="text-xs sm:text-sm font-semibold text-foreground">
          Click to upload or drag and drop images here
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          JPG, PNG or WebP · Up to 5MB each · Maximum {maxImages} images
        </p>
      </div>

      {/* Uploaded Images Grid with Controls */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {images.map((img, index) => (
            <div
              key={img.id}
              className={cn(
                'rounded-xl border border-border bg-surface overflow-hidden group shadow-xs relative flex flex-col',
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
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-brand text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                    <Star className="size-3 fill-white" />
                    <span>Primary</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(img.id)}
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 hover:bg-brand text-white text-[10px] font-medium transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  >
                    Set as primary
                  </button>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => setImageToRemove(img)}
                  className="absolute top-2 right-2 size-6 rounded-full bg-black/60 hover:bg-danger text-white flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>

              {/* Bottom Reorder Controls */}
              <div className="p-1.5 flex items-center justify-between border-t border-border bg-background text-[11px]">
                <span className="text-muted-foreground px-1 font-medium">#{index + 1}</span>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled || index === 0}
                    onClick={() => handleMoveLeft(index)}
                    className="size-6"
                    aria-label="Move image left"
                  >
                    <ArrowLeft className="size-3" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled || index === images.length - 1}
                    onClick={() => handleMoveRight(index)}
                    className="size-6"
                    aria-label="Move image right"
                  >
                    <ArrowRight className="size-3" />
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
