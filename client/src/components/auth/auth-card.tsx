import React from 'react'
import { cn } from '@/lib/utils'

export interface AuthCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function AuthCard({ children, className, ...props }: AuthCardProps) {
  return (
    <div
      className={cn(
        'w-full max-w-[520px] mx-auto rounded-[16px] border border-border/80 bg-surface p-5 sm:p-8 shadow-xs transition-all',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
