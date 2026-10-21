import { useEffect, useRef } from 'react'

/**
 * Hook to manage history stack for mobile overlays (drawer, sheet, modal, full-screen picker).
 * When overlay is opened on mobile/touch devices, pushes a state to history so Android Back
 * or browser Back closes the overlay instead of navigating away.
 */
export function useOverlayHistory({
  isOpen,
  onClose,
  overlayId,
  enabled = true,
}: {
  isOpen: boolean
  onClose: () => void
  overlayId: string
  enabled?: boolean
}) {
  const isPushedRef = useRef(false)
  const isHandlingPopRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const handlePopState = (_event: PopStateEvent) => {
      if (isPushedRef.current) {
        isPushedRef.current = false
        isHandlingPopRef.current = true
        onClose()
        setTimeout(() => {
          isHandlingPopRef.current = false
        }, 50)
      }
    }

    if (isOpen) {
      if (!isPushedRef.current) {
        window.history.pushState({ overlayId }, '')
        isPushedRef.current = true
        window.addEventListener('popstate', handlePopState)
      }
    } else {
      if (isPushedRef.current && !isHandlingPopRef.current) {
        isPushedRef.current = false
        window.history.back()
      }
      window.removeEventListener('popstate', handlePopState)
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (isPushedRef.current && !isHandlingPopRef.current) {
        isPushedRef.current = false
        try {
          window.history.back()
        } catch {
          // Ignore
        }
      }
    }
  }, [isOpen, onClose, overlayId, enabled])
}
