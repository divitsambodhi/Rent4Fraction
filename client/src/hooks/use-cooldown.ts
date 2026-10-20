import { useState, useEffect, useCallback } from 'react'

export function useCooldown(initialSeconds = 60) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (secondsLeft <= 0) return

    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [secondsLeft])

  const start = useCallback(
    (seconds = initialSeconds) => {
      setSecondsLeft(seconds)
    },
    [initialSeconds],
  )

  const reset = useCallback(() => {
    setSecondsLeft(0)
  }, [])

  return {
    secondsLeft,
    isActive: secondsLeft > 0,
    start,
    reset,
  }
}
