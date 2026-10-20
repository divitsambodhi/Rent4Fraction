import React from 'react'
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  type LinkProps,
  type NavigateOptions,
  type SetURLSearchParams,
} from 'react-router-dom'

export interface AppLinkProps extends Omit<LinkProps, 'to'> {
  to: string
  activeClassName?: string
  exact?: boolean
  children?: React.ReactNode
}

/**
 * AppLink: Central application link component wrapping react-router-dom.
 * All internal and external links must use this component.
 */
export const AppLink = React.forwardRef<HTMLAnchorElement, AppLinkProps>(
  ({ to, className, activeClassName, children, ...props }, ref) => {
    const isExternal =
      to.startsWith('http://') ||
      to.startsWith('https://') ||
      to.startsWith('mailto:') ||
      to.startsWith('tel:')

    if (isExternal) {
      return (
        <a
          ref={ref}
          href={to}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </a>
      )
    }

    if (activeClassName) {
      return (
        <NavLink
          ref={ref}
          to={to}
          className={({ isActive }) =>
            `${className || ''} ${isActive ? activeClassName : ''}`.trim()
          }
          {...props}
        >
          {children}
        </NavLink>
      )
    }

    return (
      <Link ref={ref} to={to} className={className} {...props}>
        {children}
      </Link>
    )
  },
)

AppLink.displayName = 'AppLink'

/**
 * Custom hook returning navigation function.
 */
export function useAppNavigate() {
  const navigate = useNavigate()
  return (to: string | number, options?: NavigateOptions) => {
    if (typeof to === 'number') {
      navigate(to)
    } else {
      navigate(to, options)
    }
  }
}

/**
 * Custom hook returning current pathname.
 */
export function useAppPathname(): string {
  const location = useLocation()
  return location.pathname
}

/**
 * Custom hook wrapping react-router-dom's useSearchParams.
 * Returns standard [searchParams, setSearchParams] tuple.
 */
export function useAppSearchParams(): [URLSearchParams, SetURLSearchParams] {
  return useSearchParams()
}

/**
 * Custom hook wrapping react-router-dom's useParams.
 */
export function useAppParams<
  ParamsOrKey extends string | Record<string, string | undefined> = string,
>() {
  return useParams<ParamsOrKey>()
}
