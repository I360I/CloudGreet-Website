"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OnboardingBanner from '../components/OnboardingBanner'
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react'

export default function SetupPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [setupStatus, setSetupStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const fetchSetupStatus = async () => {
      if (!session?.user) return

      try {
        setIsLoading(true)
        
        // Fetch user data to check setup status
        const userResponse = await fetch(`/api/get-user-data?userId=e88ae48f-ad45-49c8-a61a-38a79604c45d`)
        const userData = await userResponse.json()
        
        if (userData.user) {
          setSetupStatus({
            onboardingComplete: userData.user.onboarding_status === 'completed',
            retellAgentConfigured: !!userData.user.retell_agent_id,
            phoneNumberAssigned: !!userData.user.retell_phone_number,
            stripeCustomerCreated: !!userData.user.stripe_customer_id,
            stripeSubscriptionActive: !!userData.user.stripe_subscription_id,
            phoneIntegrationActive: !!userData.user.retell_phone_number,
            aiAgentActive: !!userData.user.retell_agent_id
          })

          // If onboarding is complete, redirect to dashboard
          if (userData.user.onboarding_status === 'completed') {
            router.push('/dashboard')
            return
          }
        }
      } catch (error) {
        console.error('Error fetching setup status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSetupStatus()
  }, [session, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-600 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading setup status...</p>
        </div>
      </div>
    )
  }

  if (showOnboarding) {
    return <OnboardingFlow />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to CloudGreet!</h1>
          <p className="text-gray-400">Let's get your AI receptionist set up and running</p>
        </div>

        {/* Setup Status */}
        <div className="bg-gray-800 rounded-xl p-8 shadow-xl border border-gray-700 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Setup Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  setupStatus?.onboardingComplete ? 'bg-green-500' : 'bg-gray-600'
                }`}>
                  {setupStatus?.onboardingComplete ? (
                    <CheckCircle className="h-5 w-5 text-white" />
                  ) : (
                    <span className="text-sm text-gray-300">1</span>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-medium">Business Information</h3>
                  <p className="text-gray-400 text-sm">Company details and services</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                setupStatus?.onboardingComplete 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {setupStatus?.onboardingComplete ? 'Complete' : 'Pending'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  setupStatus?.retellAgentConfigured ? 'bg-green-500' : 'bg-gray-600'
                }`}>
                  {setupStatus?.retellAgentConfigured ? (
                    <CheckCircle className="h-5 w-5 text-white" />
                  ) : (
                    <span className="text-sm text-gray-300">2</span>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-medium">AI Agent</h3>
                  <p className="text-gray-400 text-sm">Configure your AI receptionist</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                setupStatus?.retellAgentConfigured 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {setupStatus?.retellAgentConfigured ? 'Active' : 'Pending'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  setupStatus?.phoneNumberAssigned ? 'bg-green-500' : 'bg-gray-600'
                }`}>
                  {setupStatus?.phoneNumberAssigned ? (
                    <CheckCircle className="h-5 w-5 text-white" />
                  ) : (
                    <span className="text-sm text-gray-300">3</span>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-medium">Phone Number</h3>
                  <p className="text-gray-400 text-sm">Dedicated business line</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                setupStatus?.phoneNumberAssigned 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {setupStatus?.phoneNumberAssigned ? 'Assigned' : 'Pending'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  setupStatus?.stripeSubscriptionActive ? 'bg-green-500' : 'bg-gray-600'
                }`}>
                  {setupStatus?.stripeSubscriptionActive ? (
                    <CheckCircle className="h-5 w-5 text-white" />
                  ) : (
                    <span className="text-sm text-gray-300">4</span>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-medium">Billing</h3>
                  <p className="text-gray-400 text-sm">Subscription and payment</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                setupStatus?.stripeSubscriptionActive 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {setupStatus?.stripeSubscriptionActive ? 'Active' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center">
          {setupStatus?.onboardingComplete ? (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Setup Complete!</h3>
                <p className="text-gray-400 mb-4">
                  Your AI receptionist is active and ready to take calls.
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-2">Ready to Get Started?</h3>
                <p className="text-gray-400 mb-6">
                  Complete the setup process to activate your AI receptionist and start receiving calls.
                </p>
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 mx-auto"
                >
                  <span>Start Setup</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}