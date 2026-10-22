import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'

const SESSION_STORAGE_KEY = 'r4f_event_dates_v1'

export interface EventDates {
  from?: string
  to?: string
}

function parseStoredDates(): EventDates {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return {
        from: typeof parsed.from === 'string' ? parsed.from : undefined,
        to: typeof parsed.to === 'string' ? parsed.to : undefined,
      }
    }
  } catch {
    // ignore corrupted session storage
  }
  return {}
}

export function formatEventDateRange(from?: string, to?: string): string {
  if (!from && !to) return 'Add dates'
  if (from && !to) {
    try {
      return format(parseISO(from), 'd MMM')
    } catch {
      return 'Add dates'
    }
  }
  if (!from && to) {
    try {
      return format(parseISO(to), 'd MMM')
    } catch {
      return 'Add dates'
    }
  }
  try {
    const fromStr = format(parseISO(from!), 'd MMM')
    const toStr = format(parseISO(to!), 'd MMM')
    return `${fromStr} to ${toStr}`
  } catch {
    return 'Add dates'
  }
}

export function useEventDates() {
  const [searchParams, setSearchParams] = useSearchParams()

  const urlFrom = searchParams.get('from') || undefined
  const urlTo = searchParams.get('to') || undefined

  const [storedDates, setStoredDates] = useState<EventDates>(() => parseStoredDates())

  // Keep sessionStorage in sync whenever URL has dates
  useEffect(() => {
    if (urlFrom || urlTo) {
      const datesToStore = { from: urlFrom, to: urlTo }
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(datesToStore))
      setStoredDates(datesToStore)
    }
  }, [urlFrom, urlTo])

  // Resolve effective dates: prefer URL, fallback to sessionStorage
  const from = urlFrom || storedDates.from
  const to = urlTo || storedDates.to
  const hasDates = Boolean(from && to)

  const setDates = useCallback(
    (newDates: EventDates, options?: { updateUrl?: boolean }) => {
      const { from: newFrom, to: newTo } = newDates

      // Update sessionStorage
      if (newFrom || newTo) {
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({ from: newFrom, to: newTo })
        )
        setStoredDates({ from: newFrom, to: newTo })
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
        setStoredDates({})
      }

      // Update URL if requested (default true)
      if (options?.updateUrl !== false) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          if (newFrom) {
            next.set('from', newFrom)
          } else {
            next.delete('from')
          }
          if (newTo) {
            next.set('to', newTo)
          } else {
            next.delete('to')
          }
          next.set('page', '1')
          return next
        })
      }
    },
    [setSearchParams]
  )

  const clearDates = useCallback(
    (options?: { updateUrl?: boolean }) => {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
      setStoredDates({})

      if (options?.updateUrl !== false) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete('from')
          next.delete('to')
          next.set('page', '1')
          return next
        })
      }
    },
    [setSearchParams]
  )

  const formattedRange = formatEventDateRange(from, to)

  return {
    from,
    to,
    hasDates,
    formattedRange,
    setDates,
    clearDates,
  }
}
