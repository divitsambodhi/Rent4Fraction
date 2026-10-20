import React, { useState, useEffect, useCallback, useId } from 'react'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface PriceRangeSliderProps {
  min?: number
  max?: number
  onChange: (range: { min?: number; max?: number }) => void
  minLimit?: number
  maxLimit?: number
  step?: number
  className?: string
}

export function PriceRangeSlider({
  min = 0,
  max = 10000,
  onChange,
  minLimit = 0,
  maxLimit = 10000,
  step = 100,
  className,
}: PriceRangeSliderProps) {
  const minId = useId()
  const maxId = useId()

  const [localMin, setLocalMin] = useState(min)
  const [localMax, setLocalMax] = useState(max)

  // Keep local state in sync when external props change
  useEffect(() => {
    setLocalMin(min)
  }, [min])

  useEffect(() => {
    setLocalMax(max)
  }, [max])

  const commitChanges = useCallback(
    (newMin: number, newMax: number) => {
      const clampedMin = Math.max(minLimit, Math.min(newMin, newMax))
      const clampedMax = Math.min(maxLimit, Math.max(newMin, newMax))
      onChange({
        min: clampedMin > minLimit ? clampedMin : undefined,
        max: clampedMax < maxLimit ? clampedMax : undefined,
      })
    },
    [minLimit, maxLimit, onChange],
  )

  const handleMinSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), localMax - step)
    setLocalMin(val)
  }

  const handleMaxSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), localMin + step)
    setLocalMax(val)
  }

  const handlePointerUp = () => {
    commitChanges(localMin, localMax)
  }

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? minLimit : Number(e.target.value)
    if (!isNaN(val)) {
      setLocalMin(val)
    }
  }

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? maxLimit : Number(e.target.value)
    if (!isNaN(val)) {
      setLocalMax(val)
    }
  }

  const handleInputBlur = () => {
    let nextMin = Math.max(minLimit, localMin)
    let nextMax = Math.min(maxLimit, localMax)
    if (nextMin > nextMax) {
      const temp = nextMin
      nextMin = nextMax
      nextMax = temp
    }
    setLocalMin(nextMin)
    setLocalMax(nextMax)
    commitChanges(nextMin, nextMax)
  }

  // Calculate percentage for active bar
  const minPercent = ((localMin - minLimit) / (maxLimit - minLimit)) * 100
  const maxPercent = ((localMax - minLimit) / (maxLimit - minLimit)) * 100

  return (
    <div className={cn('space-y-4 select-none', className)}>
      {/* Dual Slider Track */}
      <div className="relative h-6 flex items-center">
        {/* Background Track */}
        <div className="absolute w-full h-2 rounded-full bg-border/60" />

        {/* Highlight Range Bar */}
        <div
          className="absolute h-2 rounded-full bg-brand"
          style={{
            left: `${minPercent}%`,
            width: `${Math.max(0, maxPercent - minPercent)}%`,
          }}
        />

        {/* Left Slider Thumb */}
        <input
          type="range"
          id={minId}
          aria-label="Minimum price per day"
          min={minLimit}
          max={maxLimit}
          step={step}
          value={localMin}
          onChange={handleMinSliderChange}
          onPointerUp={handlePointerUp}
          onKeyUp={handlePointerUp}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none z-20 cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-5.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-surface [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand [&::-moz-range-thumb]:shadow-md focus:outline-none"
        />

        {/* Right Slider Thumb */}
        <input
          type="range"
          id={maxId}
          aria-label="Maximum price per day"
          min={minLimit}
          max={maxLimit}
          step={step}
          value={localMax}
          onChange={handleMaxSliderChange}
          onPointerUp={handlePointerUp}
          onKeyUp={handlePointerUp}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none z-20 cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-5.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-surface [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand [&::-moz-range-thumb]:shadow-md focus:outline-none"
        />
      </div>

      {/* Synced Min / Max Numeric Inputs */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex-1">
          <label
            htmlFor={`input-${minId}`}
            className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
          >
            Min Price
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-xs text-muted-foreground pointer-events-none">
              ₹
            </span>
            <input
              type="number"
              id={`input-${minId}`}
              value={localMin}
              onChange={handleMinInputChange}
              onBlur={handleInputBlur}
              min={minLimit}
              max={localMax}
              step={step}
              className="w-full h-9 pl-6 pr-2 rounded-[8px] border border-border bg-background text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
            />
          </div>
        </div>

        <span className="text-muted-foreground text-xs font-medium self-end mb-2.5">
          to
        </span>

        <div className="flex-1">
          <label
            htmlFor={`input-${maxId}`}
            className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1"
          >
            Max Price
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-xs text-muted-foreground pointer-events-none">
              ₹
            </span>
            <input
              type="number"
              id={`input-${maxId}`}
              value={localMax}
              onChange={handleMaxInputChange}
              onBlur={handleInputBlur}
              min={localMin}
              max={maxLimit}
              step={step}
              className="w-full h-9 pl-6 pr-2 rounded-[8px] border border-border bg-background text-xs font-medium text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
            />
          </div>
        </div>
      </div>

      {/* Helper text */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{formatINR(minLimit)}</span>
        <span>{formatINR(maxLimit)}</span>
      </div>
    </div>
  )
}
