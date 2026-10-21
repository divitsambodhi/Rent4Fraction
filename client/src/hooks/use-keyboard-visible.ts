import { useEffect, useState } from 'react'

/**
 * Detects if on-screen software keyboard is open on mobile devices.
 * Uses window.visualViewport resize detection and active input element tracking.
 */
export function useKeyboardVisible(): boolean {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return
    }

    const viewport = window.visualViewport
    const originalHeight = window.innerHeight

    const handleResize = () => {
      // When keyboard opens on iOS/Android, visualViewport.height decreases significantly
      const heightDifference = originalHeight - viewport.height
      const isInputActive = Boolean(
        document.activeElement &&
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName),
      )

      if (heightDifference > 140 && isInputActive) {
        setIsKeyboardOpen(true)
        // Scroll active field to center so it's not hidden
        try {
          document.activeElement?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        } catch {
          // Ignore
        }
      } else {
        setIsKeyboardOpen(false)
      }
    }

    viewport.addEventListener('resize', handleResize)
    return () => viewport.removeEventListener('resize', handleResize)
  }, [])

  return isKeyboardOpen
}
