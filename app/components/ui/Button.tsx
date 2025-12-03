'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../../lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-lg",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "px-4 py-2",
        sm: "h-8 rounded-lg px-3 py-1.5 text-xs",
        lg: "h-10 rounded-lg px-6 py-2.5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  success?: boolean
  primaryColor?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading, 
    success, 
    disabled,
    primaryColor,
    icon,
    iconPosition = 'left',
    fullWidth,
    children,
    ...props 
  }, ref) => {
    // Determine if icon-only button (for ARIA label auto-generation)
    const isIconOnly = !children && !!icon
    
    // Auto-generate ARIA label for icon-only buttons if not provided
    const ariaLabel = isIconOnly && !props['aria-label']
      ? props['aria-label'] || 'Button'
      : props['aria-label']
    
    // Apply primaryColor to style if provided
    const style = primaryColor 
      ? { backgroundColor: primaryColor, ...props.style }
      : props.style
    
    // Separate motion props from regular props for type safety when using asChild
    // Extract animation event handlers that conflict with motion props
    const {
      onAnimationStart,
      onAnimationEnd,
      onAnimationIteration,
      ...restProps
    } = props as React.ButtonHTMLAttributes<HTMLButtonElement>
    
    if (asChild) {
      // When asChild is true, use Slot (no motion props)
      // Slot only accepts specific props, so we filter out incompatible ones
      const slotProps = {
        className: cn(
          buttonVariants({ variant, size }),
          fullWidth && 'w-full',
          'min-h-[44px]',
          className
        ),
        style,
        'aria-label': ariaLabel,
        ...(disabled || loading ? { disabled: true } : {}),
      }
      
      return (
        <Slot
          {...slotProps as any}
        >
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mr-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="mr-2"
            >
              ✓
            </motion.div>
          )}
          {icon && iconPosition === 'left' && (
            <span className="mr-2 flex items-center">{icon}</span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="ml-2 flex items-center">{icon}</span>
          )}
        </Slot>
      )
    }
    
    // When asChild is false, use motion.button (with motion props)
    const buttonContent = (
      <motion.button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && 'w-full',
          'min-h-[44px]',
          className
        )}
        style={style}
        aria-label={ariaLabel}
        whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
        disabled={disabled || loading}
        {...(onAnimationStart ? { onAnimationStart: onAnimationStart as any } : {})}
        {...(onAnimationEnd ? { onAnimationEnd: onAnimationEnd as any } : {})}
        {...(onAnimationIteration ? { onAnimationIteration: onAnimationIteration as any } : {})}
        {...(restProps as any)}
      >
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mr-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="mr-2"
          >
            ✓
          </motion.div>
        )}
        {icon && iconPosition === 'left' && (
          <span className="mr-2 flex items-center">{icon}</span>
        )}
        {children}
        {icon && iconPosition === 'right' && (
          <span className="ml-2 flex items-center">{icon}</span>
        )}
      </motion.button>
    )

    return buttonContent
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
