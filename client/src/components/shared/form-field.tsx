import React, { useId } from 'react'
import { cn } from '@/lib/utils'

export interface FormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  optional?: boolean
  hint?: string
  error?: string
  className?: string
  children: React.ReactNode | ((props: { id: string; errorId?: string; hintId?: string }) => React.ReactNode)
}

export function FormField({
  label,
  htmlFor,
  required,
  optional,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId()
  const id = htmlFor || generatedId
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint ? `${id}-hint` : undefined

  return (
    <div className={cn('space-y-1.5 text-left', className)}>
      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
        <label htmlFor={id} className="cursor-pointer">
          {label}{' '}
          {required && <span className="text-danger" aria-hidden="true">*</span>}
          {optional && (
            <span className="text-muted-foreground font-normal text-[11px]">
              (optional)
            </span>
          )}
        </label>
        {hint && !error && (
          <span id={hintId} className="text-[11px] font-normal text-muted-foreground">
            {hint}
          </span>
        )}
      </div>

      <div className="relative">
        {typeof children === 'function'
          ? children({ id, errorId, hintId })
          : children}
      </div>

      {/* Error message with minimum height reservation to prevent layout jump */}
      <div className="min-h-[18px]">
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="text-xs text-danger font-medium leading-none animate-in fade-in-0 duration-150 pt-0.5"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
