'use client'

import { useState } from 'react'
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import { CreditCard, Shield, CheckCircle, Star, Sparkles } from 'lucide-react'

interface PaymentFormProps {
  onSuccess: () => void
  onError: (error: string) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  formData: {
    businessName: string
    ownerName: string
    email: string
    phone: string
    industry: string
  }
}

export default function PaymentForm({ onSuccess, onError, isLoading, setIsLoading, formData }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [cardError, setCardError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsLoading(true)
    setCardError(null)

    const cardElement = elements.getElement(CardElement)

    if (!cardElement) {
      setIsLoading(false)
      return
    }

    try {
      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      })

      if (error) {
        setCardError(error.message || 'An error occurred')
        setIsLoading(false)
        return
      }

      // Create subscription using existing API
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          businessName: formData.businessName,
          businessType: formData.industry,
          phoneNumber: formData.phone,
          agentId: `agent_${Date.now()}`, // Generate unique agent ID
        }),
      })

      const result = await response.json()

      if (result.error) {
        setCardError(result.error)
        setIsLoading(false)
        return
      }

      // Confirm payment intent if needed
      if (result.requiresAction) {
        const { error: confirmError } = await stripe.confirmCardPayment(result.clientSecret)
        
        if (confirmError) {
          setCardError(confirmError.message || 'Payment failed')
          setIsLoading(false)
          return
        }
      }

      onSuccess()
    } catch (error: any) {
      setCardError(error.message || 'An unexpected error occurred')
      setIsLoading(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '18px',
        color: '#1f2937',
        fontFamily: 'system-ui, sans-serif',
        '::placeholder': {
          color: '#9ca3af',
        },
      },
      invalid: {
        color: '#ef4444',
      },
    },
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
          <CreditCard className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Secure Payment Setup</h3>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          You're almost ready! Set up secure billing to activate your AI receptionist
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-3xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white">CloudGreet Pro</h4>
            <Star className="w-6 h-6 text-yellow-500 fill-current" />
          </div>
          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            $200<span className="text-xl text-slate-600 dark:text-slate-400">/month</span>
          </div>
          <div className="text-lg text-slate-600 dark:text-slate-400">+ $50 per booked job</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="flex items-center space-x-3 p-4 bg-white dark:bg-slate-800 rounded-2xl">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Dedicated phone number</span>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-white dark:bg-slate-800 rounded-2xl">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">AI receptionist 24/7</span>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-white dark:bg-slate-800 rounded-2xl">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Automatic booking</span>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-white dark:bg-slate-800 rounded-2xl">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">ROI tracking</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700">
            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4">Payment Information</div>
            <div className="space-y-4">
              <div className="p-4 border-2 border-slate-200 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-800">
                <CardElement options={cardElementOptions} />
              </div>
              {cardError && (
                <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  {cardError}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                30-day money-back guarantee • Secure payment processing
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!stripe || isLoading}
            className="w-full mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {isLoading ? 'Processing...' : 'Complete Setup - $200/month'}
          </button>
        </form>
      </div>
    </div>
  )
}
