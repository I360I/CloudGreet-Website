"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Loader2, Phone, Database, Shield, Zap } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'purple' | 'green' | 'white'
  text?: string
}

export function LoadingSpinner({ size = 'md', color = 'blue', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const colorClasses = {
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    green: 'text-green-500',
    white: 'text-white'
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <motion.div
        className={`${sizeClasses[size]} ${colorClasses[color]}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="w-full h-full" />
      </motion.div>
      {text && <span className="text-gray-300">{text}</span>}
    </div>
  )
}

interface LoadingCardProps {
  title: string
  description: string
  icon: React.ReactNode
  progress?: number
}

export function LoadingCard({ title, description, icon, progress }: LoadingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-blue-500/20 rounded-xl">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-gray-300">{description}</p>
        </div>
      </div>
      
      {progress !== undefined && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}
      
      <LoadingSpinner size="sm" color="blue" />
    </motion.div>
  )
}

interface LoadingOverlayProps {
  message: string
  submessage?: string
}

export function LoadingOverlay({ message, submessage }: LoadingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 max-w-md w-full mx-4">
        <div className="text-center">
          <motion.div
            className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <h2 className="text-xl font-bold text-white mb-2">{message}</h2>
          {submessage && <p className="text-gray-300">{submessage}</p>}
        </div>
      </div>
    </motion.div>
  )
}

interface PhoneProvisioningLoaderProps {
  step: number
  totalSteps: number
}

export function PhoneProvisioningLoader({ step, totalSteps }: PhoneProvisioningLoaderProps) {
  const steps = [
    { icon: <Shield className="w-6 h-6 text-blue-400" />, title: "Validating Security", description: "Verifying authentication and permissions" },
    { icon: <Database className="w-6 h-6 text-green-400" />, title: "Checking Database", description: "Connecting to secure database" },
    { icon: <Phone className="w-6 h-6 text-purple-400" />, title: "Provisioning Number", description: "Acquiring your dedicated phone number" },
    { icon: <Zap className="w-6 h-6 text-yellow-400" />, title: "Activating AI Agent", description: "Setting up your AI receptionist" }
  ]

  const progress = (step / totalSteps) * 100

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-black/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Setting Up Your AI Receptionist</h2>
        <p className="text-gray-300">Please wait while we configure your phone system</p>
      </div>

      <div className="space-y-4 mb-8">
        {steps.map((stepData, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
              index < step 
                ? 'bg-green-500/10 border border-green-500/30' 
                : index === step - 1 
                ? 'bg-blue-500/10 border border-blue-500/30' 
                : 'bg-gray-800/30 border border-gray-700/30'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              index < step 
                ? 'bg-green-500/20' 
                : index === step - 1 
                ? 'bg-blue-500/20' 
                : 'bg-gray-700/20'
            }`}>
              {stepData.icon}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${
                index < step 
                  ? 'text-green-400' 
                  : index === step - 1 
                  ? 'text-blue-400' 
                  : 'text-gray-400'
              }`}>
                {stepData.title}
              </h3>
              <p className="text-gray-300 text-sm">{stepData.description}</p>
            </div>
            {index < step && (
              <div className="text-green-400">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  ✓
                </motion.div>
              </div>
            )}
            {index === step - 1 && (
              <motion.div
                className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            )}
          </motion.div>
        ))}
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Overall Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  )
}

interface SkeletonLoaderProps {
  lines?: number
  className?: string
}

export function SkeletonLoader({ lines = 3, className = "" }: SkeletonLoaderProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 mb-4">
          <div className="rounded-full bg-gray-700 h-10 w-10"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  )
}
