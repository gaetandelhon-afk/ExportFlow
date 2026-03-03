"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg'
}

const variantClasses: Record<string, string> = {
  default: 'bg-[var(--color-brand-primary)] text-white hover:opacity-90',
  outline: 'border border-[#d2d2d7] bg-white text-[#1d1d1f] hover:bg-[#f5f5f7]',
  ghost: 'bg-transparent text-[#1d1d1f] hover:bg-[#f5f5f7]',
  destructive: 'bg-[#ff3b30] text-white hover:opacity-90',
}

const sizeClasses: Record<string, string> = {
  default: 'h-9 px-4 py-2 text-[14px]',
  sm: 'h-7 px-3 text-[12px]',
  lg: 'h-11 px-6 text-[16px]',
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all disabled:opacity-50 disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
