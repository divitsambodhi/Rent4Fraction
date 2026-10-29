import { CloudImage } from '@/components/shared/cloud-image'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Pause,
  Play,
  ShieldCheck,
  Star,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'
import { formatINR } from '@/lib/format'

interface HeroSlide {
  id: string
  categoryBadge: string
  seasonBadge: string
  rating: string
  reviewCount: string
  deliveryBadge: string
  depositBadge: string
  titlePrefix: string
  accentWord: string
  titleSuffix: string
  subtitle: string
  bgImage: string
  primaryCtaText: string
  primaryCtaHref: string
  secondaryCtaText: string
  secondaryCtaHref: string
  startingPrice: number
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'sound-dj',
    categoryBadge: 'SOUND & DJ',
    seasonBadge: 'LIVE SOUND • CONCERTS & FESTIVALS',
    rating: '4.9',
    reviewCount: '142',
    deliveryBadge: 'VENUE DELIVERY',
    depositBadge: 'REFUNDABLE DEPOSIT',
    titlePrefix: 'Concert-grade sound for your next ',
    accentWord: 'event.',
    titleSuffix: '',
    subtitle:
      'Rent high-output line arrays, club-standard DJ consoles, and wireless mic sets. Complete with soundcheck engineers and on-time venue staging.',
    bgImage: '/images/hero/concert-sound.svg',
    primaryCtaText: 'Rent Sound Gear',
    primaryCtaHref: '/equipment?category=1',
    secondaryCtaText: 'How It Works',
    secondaryCtaHref: '/#how-it-works',
    startingPrice: 1500,
  },
  {
    id: 'lighting',
    categoryBadge: 'STAGE LIGHTS',
    seasonBadge: 'STAGE & AMBIENCE • INTELLIGENT FIXTURES',
    rating: '4.8',
    reviewCount: '98',
    deliveryBadge: 'VENUE DELIVERY',
    depositBadge: 'REFUNDABLE DEPOSIT',
    titlePrefix: 'Transform any venue with ',
    accentWord: 'ambient',
    titleSuffix: ' illumination.',
    subtitle:
      'Architectural RGBWA wash pars, automated moving heads, and warm fairy light curtains. Tested for electrical safety and synchronized DMX control.',
    bgImage: '/images/hero/stage-lighting.svg',
    primaryCtaText: 'Browse Lighting',
    primaryCtaHref: '/equipment?category=4',
    secondaryCtaText: 'View Fairy Lights',
    secondaryCtaHref: '/equipment?category=5',
    startingPrice: 600,
  },
  {
    id: 'furniture-tents',
    categoryBadge: 'FURNITURE & TENTS',
    seasonBadge: 'WEDDING & BANQUET • BESPOKE STRUCTURES',
    rating: '4.7',
    reviewCount: '180',
    deliveryBadge: 'VENUE DELIVERY',
    depositBadge: 'REFUNDABLE DEPOSIT',
    titlePrefix: 'Distinguished seating and ',
    accentWord: 'bespoke',
    titleSuffix: ' marquees.',
    subtitle:
      'Champagne velvet banquet chairs, high-top standing cocktail tables, and heavy-duty pagoda canopy tents for wedding celebrations.',
    bgImage: '/images/hero/wedding-marquee.svg',
    primaryCtaText: 'Explore Furniture',
    primaryCtaHref: '/equipment?category=6',
    secondaryCtaText: 'View Canopies',
    secondaryCtaHref: '/equipment?category=8',
    startingPrice: 800,
  },
]

export function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const slideCount = HERO_SLIDES.length

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slideCount)
  }, [slideCount])

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slideCount) % slideCount)
  }, [slideCount])

  // Autoplay 6s
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      nextSlide()
    }, 6000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, nextSlide])

  // Pause on hidden document tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsPaused(true)
      } else {
        setIsPaused(false)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const minSwipeDistance = 50
    if (distance > minSwipeDistance) {
      nextSlide()
    } else if (distance < -minSwipeDistance) {
      prevSlide()
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      nextSlide()
    } else if (e.key === 'ArrowLeft') {
      prevSlide()
    }
  }

  const slide = HERO_SLIDES[current]

  return (
    <section
      ref={containerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Event Equipment Highlights"
      className="relative outline-none pt-4 sm:pt-6"
    >
      {/* Screen Reader Announcement */}
      <div className="sr-only" aria-live="polite">
        Slide {current + 1} of {slideCount}: {slide.categoryBadge}. {slide.titlePrefix}{slide.accentWord}
      </div>

      {/* Cinematic Showcase Container */}
      <div className="relative overflow-hidden rounded-[20px] sm:rounded-[24px] border border-border/80 bg-neutral-950 min-h-[480px] sm:min-h-[520px] md:min-h-[560px] flex flex-col justify-between shadow-xl">
        {/* Atmospheric Artwork Background with Transition */}
        <div className="absolute inset-0 z-0">
          <CloudImage
            src={slide.bgImage}
            alt={slide.categoryBadge}
            preset="hero"
            aspectRatio="auto"
            priority={current === 0}
            className="w-full h-full"
            imgClassName="w-full h-full object-cover object-center transition-all duration-700 ease-out"
          />
          {/* Neutral dark scrim over photo for crisp text legibility */}
          <div
            className="absolute inset-0 bg-black/65 pointer-events-none"
            aria-hidden="true"
          />
        </div>

        {/* TOP ROW: Pill Badge + Navigation Controls (Inspired by Reference Banner) */}
        <div className="relative z-10 p-4 sm:p-6 md:p-8 flex items-center justify-between gap-3">
          {/* Top-Left: Status / Season Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white/95 text-xs font-medium border border-white/15 shadow-sm">
            <Clock className="size-3.5 text-amber-300 shrink-0" />
            <span className="font-semibold tracking-wide uppercase text-[11px]">
              {slide.seasonBadge}
            </span>
          </div>

          {/* Top-Right: Clean Index & Chevron Pill */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/15 text-xs font-semibold shadow-sm">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous slide"
                className="size-6 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="px-1.5 tabular-nums text-white/90 font-mono text-[12px]">
                {current + 1} / {slideCount}
              </span>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next slide"
                className="size-6 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Pause/Play Toggle Button */}
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              aria-label={isPaused ? 'Resume autoplay' : 'Pause autoplay'}
              className="size-8 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white/80 hover:text-white flex items-center justify-center shadow-sm transition-colors"
            >
              {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* BOTTOM AREA: Meta Badges + Glowing Headline + Synopsis + Action Pills */}
        <div className="relative z-10 p-5 sm:p-8 md:p-10 lg:p-12 max-w-3xl">
          {/* Row of Micro-Badges (Inspired by Reference Banner Metadata) */}
          <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-white text-[11px] font-bold tracking-wider uppercase border border-white/25">
              {slide.categoryBadge}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-black/50 backdrop-blur-md text-amber-300 text-[11px] font-semibold border border-white/15">
              <Star className="size-3 fill-amber-300 stroke-amber-300" />
              <span className="tabular-nums">{slide.rating}</span>
              <span className="text-white/60">({slide.reviewCount})</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-black/50 backdrop-blur-md text-white/90 text-[11px] font-medium border border-white/15">
              <Truck className="size-3 text-emerald-400" />
              <span>{slide.deliveryBadge}</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-black/50 backdrop-blur-md text-white/90 text-[11px] font-medium border border-white/15">
              <ShieldCheck className="size-3 text-emerald-400" />
              <span>{slide.depositBadge}</span>
            </span>
          </div>

          {/* Editorial Headline */}
          <h1 className="font-sans text-3xl sm:text-5xl lg:text-5xl font-bold tracking-tight text-white leading-[1.08] mb-3">
            {slide.titlePrefix}
            <em className="italic font-normal text-amber-200">
              {slide.accentWord}
            </em>
            {slide.titleSuffix}
          </h1>

          {/* Clean 2-Line Synopsis */}
          <p className="text-white/85 text-sm sm:text-base leading-relaxed max-w-2xl mb-6 line-clamp-2 sm:line-clamp-3">
            {slide.subtitle}
          </p>

          {/* Action Buttons: Tactile 10px Radius with High Contrast */}
          <div className="flex flex-wrap items-center gap-3">
            <AppLink to={slide.primaryCtaHref}>
              <Button
                size="lg"
                className="h-11 sm:h-12 px-6 rounded-[10px] bg-brand text-white hover:bg-brand-hover font-semibold gap-2 shadow-sm border-0 transition-all active:scale-[0.98]"
              >
                <span>{slide.primaryCtaText}</span>
              </Button>
            </AppLink>

            <AppLink to={slide.secondaryCtaHref}>
              <Button
                variant="outline"
                size="lg"
                className="h-11 sm:h-12 px-5 rounded-[10px] bg-white/10 hover:bg-white/20 text-white border-white/20 font-semibold gap-2 transition-all active:scale-[0.98]"
              >
                <Info className="size-4" />
                <span>{slide.secondaryCtaText}</span>
              </Button>
            </AppLink>

            <span className="text-xs text-white/70 ml-2 font-mono tabular-nums hidden sm:inline-block">
              From {formatINR(slide.startingPrice)}/day
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
