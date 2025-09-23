'use client'

import React from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  variant?: 'default' | 'filled' | 'outlined'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    helperText, 
    icon, 
    iconPosition = 'left',
    variant = 'default',
    className = '', 
    type = 'text',
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type

    const baseClasses = 'w-full transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      default: 'bg-slate-800/50 border border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-4 py-3 backdrop-blur-sm',
      filled: 'bg-slate-700/50 border-0 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-4 py-3 backdrop-blur-sm',
      outlined: 'bg-transparent border-2 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-4 py-3'
    }

    const iconClasses = icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : ''
    const passwordClasses = isPassword ? 'pr-10' : ''
    
    const classes = `${baseClasses} ${variants[variant]} ${iconClasses} ${passwordClasses} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} ${className}`

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-slate-200">
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-slate-400">{icon}</span>
            </div>
          )}
          
          <input
            ref={ref}
            type={inputType}
            className={classes}
            {...props}
          />
          
          {icon && iconPosition === 'right' && !isPassword && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-slate-400">{icon}</span>
            </div>
          )}
          
          {isPassword && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-300" />
              ) : (
                <Eye className="h-4 w-4 text-slate-400 hover:text-slate-300" />
              )}
            </button>
          )}
        </div>
        
        {error && (
          <div className="flex items-center space-x-1 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        
        {helperText && !error && (
          <p className="text-slate-400 text-sm">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
