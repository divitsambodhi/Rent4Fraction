import { useState, useRef, useEffect } from 'react'
import { Icon } from '@/components/ui/icon'
import { ProductImage } from '@/components/shared/product-image'
import { ShareButton } from './share-button'
import { Lightbox } from './lightbox'
import { WishlistButton } from '@/components/shared/wishlist-button'
import type { EquipmentImage } from '@/types'
import { cn } from '@/lib/utils'

interface ImageGalleryProps {
  equipmentId: string
  equipmentName: string
  images: EquipmentImage[]
  category?: string
  readOnly?: boolean
}

export function ImageGallery({
  equipmentId,
  equipmentName,
  images,
  category,
  readOnly = false,
}: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const active = images[activeIndex] || images[0]

  const goToPrev = () => {
    setActiveIndex((prev) => (prev + images.length - 1) % images.length)
  }

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % images.length)
  }

  // Keyboard navigation when gallery container is focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goToPrev()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      goToNext()
    }
  }

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const diff = touchStartX.current - touchEndX.current
    const threshold = 35 // min distance to trigger swipe
    if (diff > threshold) {
      goToNext()
    } else if (diff < -threshold) {
      goToPrev()
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  // Sync index if images list changes
  useEffect(() => {
    if (activeIndex >= images.length) {
      setActiveIndex(0)
    }
  }, [images.length, activeIndex])

  return (
    <section
      className="space-y-3 -mx-4 sm:mx-0"
      aria-label="Equipment image gallery"
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Edge-to-edge on mobile, 4:3 Aspect Main Image Stage */}
      <div
        className="relative group rounded-none sm:rounded-[16px] overflow-hidden border-y sm:border border-border bg-surface select-none aspect-4/3 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          onClick={() => setLightboxOpen(true)}
          className="size-full cursor-zoom-in"
          title="Click to view full screen"
        >
          <ProductImage
            src={active?.url || undefined}
            alt={`${equipmentName} view ${activeIndex + 1}`}
            category={category}
            aspectRatio="4/3"
            fetchPriority="high"
            loading="eager"
            widths={[400, 800, 1200]}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 600px"
            className="size-full object-cover transition-transform duration-300 sm:group-hover:scale-[1.02]"
          />
        </div>

        {/* Counter Chip */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-xs font-semibold tabular-nums shadow-xs pointer-events-none">
          {activeIndex + 1} / {images.length}
        </span>

        {/* Overlays: Heart and Share (44px hit areas) */}
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 flex items-center gap-2 z-10">
          <ShareButton title={equipmentName} />
          {!readOnly && <WishlistButton equipmentId={equipmentId} equipmentName={equipmentName} />}
        </div>

        {/* Expand / Lightbox Trigger Button */}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="Open fullscreen image lightbox"
          className="absolute bottom-3 right-3 min-h-[36px] px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Icon name="maximize" size={14} />
          <span>Expand</span>
        </button>

        {/* Navigation Arrows (44px hit areas) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goToPrev()
              }}
              aria-label="Previous image"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] rounded-full bg-surface/85 hover:bg-surface text-foreground border border-border shadow-md flex items-center justify-center transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Icon name="chevron-left" size={20} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goToNext()
              }}
              aria-label="Next image"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] rounded-full bg-surface/85 hover:bg-surface text-foreground border border-border shadow-md flex items-center justify-center transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Icon name="chevron-right" size={20} />
            </button>
          </>
        )}
      </div>

      {/* Mobile Swipe Dots Indicator (<sm) */}
      {images.length > 1 && (
        <div className="flex sm:hidden items-center justify-center gap-1.5 pt-1">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={cn(
                'min-w-[24px] min-h-[24px] flex items-center justify-center',
              )}
            >
              <span
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  activeIndex === idx ? 'w-6 bg-brand' : 'w-1.5 bg-border',
                )}
              />
            </button>
          ))}
        </div>
      )}

      {/* Thumbnails Strip (Desktop sm:flex) */}
      {images.length > 1 && (
        <div
          className="hidden sm:flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none px-4 sm:px-0"
          role="tablist"
          aria-label="Thumbnail selection"
        >
          {images.map((img, idx) => {
            const isSelected = activeIndex === idx
            return (
              <button
                key={img.image_id || idx}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Thumbnail ${idx + 1}`}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  'h-[72px] aspect-4/3 rounded-[10px] overflow-hidden border-2 transition-all shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  isSelected
                    ? 'border-brand ring-2 ring-brand/30 shadow-xs scale-[1.02]'
                    : 'border-border/70 opacity-70 hover:opacity-100 hover:border-border',
                )}
              >
                <ProductImage
                  src={img.url || undefined}
                  alt=""
                  category={category}
                  aspectRatio="4/3"
                  className="size-full object-cover"
                />
              </button>
            )
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      <Lightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        images={images}
        activeIndex={activeIndex}
        onIndexChange={setActiveIndex}
        equipmentName={equipmentName}
        category={category}
      />
    </section>
  )
}
