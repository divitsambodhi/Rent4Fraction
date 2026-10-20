import { useEffect } from 'react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ProductImage } from '@/components/shared/product-image'
import type { EquipmentImage } from '@/types'
import { cn } from '@/lib/utils'

interface LightboxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: EquipmentImage[]
  activeIndex: number
  onIndexChange: (index: number) => void
  equipmentName: string
  category?: string
}

export function Lightbox({
  open,
  onOpenChange,
  images,
  activeIndex,
  onIndexChange,
  equipmentName,
  category,
}: LightboxProps) {
  const currentImg = images[activeIndex] || images[0]

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onIndexChange((activeIndex + images.length - 1) % images.length)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onIndexChange((activeIndex + 1) % images.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, activeIndex, images.length, onIndexChange])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 sm:p-6 text-white focus:outline-none"
          aria-label={`${equipmentName} lightbox gallery`}
        >
          {/* Top Bar */}
          <div className="w-full max-w-6xl flex items-center justify-between z-10 py-2">
            <div className="flex items-center gap-3">
              <span className="font-serif text-lg font-bold text-white/90 truncate max-w-xs sm:max-w-md">
                {equipmentName}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/80 tabular-nums">
                {activeIndex + 1} / {images.length}
              </span>
            </div>

            <DialogPrimitive.Close
              className="size-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
              aria-label="Close lightbox"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Center Main Stage */}
          <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-2 select-none">
            {images.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  onIndexChange((activeIndex + images.length - 1) % images.length)
                }
                className="absolute left-2 sm:left-4 z-10 size-12 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                aria-label="Previous image"
              >
                <ArrowLeft className="size-5 stroke-[2]" />
              </button>
            )}

            <div className="max-h-[70vh] max-w-full rounded-[16px] overflow-hidden shadow-2xl border border-white/10 bg-black/30 flex items-center justify-center">
              <ProductImage
                src={currentImg?.url || undefined}
                alt={`${equipmentName} full photo ${activeIndex + 1}`}
                category={category}
                aspectRatio="4/3"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>

            {images.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  onIndexChange((activeIndex + 1) % images.length)
                }
                className="absolute right-2 sm:right-4 z-10 size-12 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                aria-label="Next image"
              >
                <ArrowRight className="size-5 stroke-[2]" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Row */}
          {images.length > 1 && (
            <div className="w-full max-w-3xl flex items-center justify-center gap-2 overflow-x-auto py-2 px-4 scrollbar-none">
              {images.map((img, idx) => (
                <button
                  key={img.image_id || idx}
                  type="button"
                  onClick={() => onIndexChange(idx)}
                  className={cn(
                    'size-16 sm:size-18 rounded-[10px] overflow-hidden border-2 transition-all shrink-0 cursor-pointer',
                    activeIndex === idx
                      ? 'border-brand ring-2 ring-brand/50 scale-105'
                      : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/50',
                  )}
                  aria-label={`View photo ${idx + 1}`}
                  aria-current={activeIndex === idx ? 'true' : undefined}
                >
                  <ProductImage
                    src={img.url || undefined}
                    alt=""
                    category={category}
                    aspectRatio="1/1"
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
