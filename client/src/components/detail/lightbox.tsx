import { useEffect, useState, useRef } from 'react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ProductImage } from '@/components/shared/product-image'
import type { EquipmentImage } from '@/types'
import { cn } from '@/lib/utils'

export interface LightboxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: EquipmentImage[]
  activeIndex: number
  onIndexChange: (index: number) => void
  equipmentName: string
  category?: string
  originRect?: { x: number; y: number; width: number; height: number } | null
}

export function Lightbox({
  open,
  onOpenChange,
  images,
  activeIndex,
  onIndexChange,
  equipmentName,
  category,
  originRect,
}: LightboxProps) {
  const currentImg = images[activeIndex] || images[0]

  const originStyle = originRect
    ? {
        transformOrigin: `${((originRect.x + originRect.width / 2) / (typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 1)) * 100}% ${((originRect.y + originRect.height / 2) / (typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 1)) * 100}%`,
      }
    : { transformOrigin: 'center center' }

  // Zoom & Pan state (task C3)
  const [isZoomed, setIsZoomed] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const initialPan = useRef({ x: 0, y: 0 })

  // Touch swipe support on unzoomed stage
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  // Reset zoom & pan when active image changes or lightbox opens/closes
  const resetZoom = () => {
    setIsZoomed(false)
    setPan({ x: 0, y: 0 })
  }

  useEffect(() => {
    resetZoom()
  }, [activeIndex, open])

  // Keyboard navigation & Esc handling
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        resetZoom()
        onIndexChange((activeIndex + images.length - 1) % images.length)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        resetZoom()
        onIndexChange((activeIndex + 1) % images.length)
      } else if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, activeIndex, images.length, onIndexChange, onOpenChange])

  // Navigation handlers that guarantee zoom reset
  const handleGoTo = (index: number) => {
    resetZoom()
    onIndexChange(index)
  }

  // Toggle 2x zoom on click/tap
  const handleImageClick = () => {
    // If the click was part of a drag movement, don't toggle zoom
    if (Math.abs(pan.x - initialPan.current.x) > 5 || Math.abs(pan.y - initialPan.current.y) > 5) {
      return
    }
    if (isZoomed) {
      resetZoom()
    } else {
      setIsZoomed(true)
      setPan({ x: 0, y: 0 })
    }
  }

  // Drag to pan mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isZoomed) return
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    initialPan.current = { ...pan }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isZoomed || !isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPan({
      x: initialPan.current.x + dx,
      y: initialPan.current.y + dy,
    })
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  // Touch handlers for swipe (unzoomed) and pan (zoomed)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isZoomed) {
      if (e.touches.length === 1) {
        isDragging.current = true
        dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        initialPan.current = { ...pan }
      }
    } else {
      touchStartX.current = e.touches[0].clientX
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isZoomed && isDragging.current && e.touches.length === 1) {
      const dx = e.touches[0].clientX - dragStart.current.x
      const dy = e.touches[0].clientY - dragStart.current.y
      setPan({
        x: initialPan.current.x + dx,
        y: initialPan.current.y + dy,
      })
    } else if (!isZoomed) {
      touchEndX.current = e.touches[0].clientX
    }
  }

  const handleTouchEnd = () => {
    if (isZoomed) {
      isDragging.current = false
    } else {
      if (touchStartX.current !== null && touchEndX.current !== null) {
        const diff = touchStartX.current - touchEndX.current
        if (diff > 40) {
          handleGoTo((activeIndex + 1) % images.length)
        } else if (diff < -40) {
          handleGoTo((activeIndex + images.length - 1) % images.length)
        }
      }
      touchStartX.current = null
      touchEndX.current = null
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Dark neutral backdrop WITHOUT blur per task C3 */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/95 transition-opacity duration-150 motion-reduce:transition-none" />

        <DialogPrimitive.Content
          style={originStyle}
          className="fixed inset-0 z-50 flex flex-col items-center justify-between p-2 sm:p-4 text-white focus:outline-none select-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 motion-reduce:animate-none"
          aria-label={`${equipmentName} image gallery`}
        >
          {/* Top Bar: Title, Counter, 44px Close button */}
          <div className="w-full max-w-7xl flex items-center justify-between z-20 py-2 px-2 sm:px-4">
            <div className="flex items-center gap-3 truncate mr-2">
              <span className="font-semibold text-sm sm:text-base text-white/95 truncate">
                {equipmentName}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/90 tabular-nums shrink-0">
                {activeIndex + 1} / {images.length}
              </span>
            </div>

            <DialogPrimitive.Close
              className="min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer shrink-0"
              aria-label="Close lightbox"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Center Main Stage (at least 92vw by 80dvh on mobile, 80vw by 86dvh on desktop) */}
          <div
            className="relative flex-1 w-full flex items-center justify-center overflow-hidden my-1"
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Previous Button (44px hit area) */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => handleGoTo((activeIndex + images.length - 1) % images.length)}
                className="absolute left-2 sm:left-6 z-20 min-w-[44px] min-h-[44px] size-11 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 text-white border border-white/15 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                aria-label="Previous image"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}

            {/* Viewport container sized per C3 specification */}
            <div
              className="w-[92vw] h-[80dvh] md:w-[80vw] md:h-[86dvh] rounded-md overflow-hidden bg-neutral-900 border border-white/10 flex items-center justify-center relative touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                onClick={handleImageClick}
                style={{
                  transform: isZoomed
                    ? `scale(2) translate(${pan.x / 2}px, ${pan.y / 2}px)`
                    : 'scale(1) translate(0px, 0px)',
                  transition: isDragging.current ? 'none' : 'transform 150ms ease-out',
                }}
                className={cn(
                  'w-full h-full flex items-center justify-center select-none',
                  isZoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
                )}
                title={isZoomed ? 'Click to zoom out' : 'Click to zoom 2x'}
              >
                <ProductImage
                  src={currentImg?.url || undefined}
                  alt={`${equipmentName} view ${activeIndex + 1}`}
                  category={category}
                  aspectRatio="4/3"
                  className="w-full h-full object-contain max-h-full max-w-full"
                />
              </div>

              {/* Zoom hint badge */}
              <div className="absolute bottom-3 left-3 pointer-events-none bg-black/60 text-white/80 text-[11px] px-2 py-0.5 rounded-sm">
                {isZoomed ? '2× Zoom (Drag to pan · Tap to reset)' : 'Tap image to zoom 2×'}
              </div>
            </div>

            {/* Next Button (44px hit area) */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => handleGoTo((activeIndex + 1) % images.length)}
                className="absolute right-2 sm:right-6 z-20 min-w-[44px] min-h-[44px] size-11 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 text-white border border-white/15 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                aria-label="Next image"
              >
                <ArrowRight className="size-5" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          {images.length > 1 && (
            <div className="w-full max-w-4xl flex items-center justify-center gap-2 overflow-x-auto py-2 px-4 scrollbar-none z-20">
              {images.map((img, idx) => (
                <button
                  key={img.image_id || idx}
                  type="button"
                  onClick={() => handleGoTo(idx)}
                  className={cn(
                    'size-14 sm:size-16 rounded-[6px] overflow-hidden border-2 transition-all shrink-0 cursor-pointer',
                    activeIndex === idx
                      ? 'border-brand ring-2 ring-brand/50 scale-105'
                      : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/60',
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
