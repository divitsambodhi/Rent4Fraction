import { useEffect } from 'react'

/**
 * Custom hook to update document title dynamically.
 * Standard format: "<Page Title> | Rent4Fraction"
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prevTitle = document.title
    const fullTitle = title.includes('Rent4Fraction')
      ? title
      : `${title} | Rent4Fraction`

    document.title = fullTitle

    return () => {
      document.title = prevTitle
    }
  }, [title])
}
