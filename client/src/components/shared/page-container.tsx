import React from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  size?: 'default' | 'narrow' | 'wide'
}

export function PageContainer({
  children,
  className,
  size = 'default',
  ...props
}: PageContainerProps) {
  const maxWidths = {
    narrow: 'max-w-4xl',
    default: 'max-w-7xl', // 1280px
    wide: 'max-w-[1440px]',
  }

  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        maxWidths[size],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
