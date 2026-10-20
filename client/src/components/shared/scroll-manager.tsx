import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollManager: Handles scroll-to-top on route change and smooth scroll
 * to URL hash fragments (e.g. #how-it-works).
 */
export function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      const element = document.getElementById(id)
      if (element) {
        // slight timeout to ensure page content rendered
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' })
        }, 50)
        return
      }
    }

    // Default: scroll to top on route transition
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])

  return null
}
