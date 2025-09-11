import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../../lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    validateUserId(userId)

    // Get user's onboarding progress
    const { data: progress, error: progressError } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (progressError && progressError.code !== 'PGRST116') {
      throw new Error('Failed to fetch onboarding progress')
    }

    // Get user's current data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      throw new Error('Failed to fetch user data')
    }

    const currentProgress = progress || {
      user_id: userId,
      current_step: 'business_info',
      completed_steps: [],
      progress_percentage: 0,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Calculate next steps and recommendations
    const nextSteps = calculateNextSteps(currentProgress, user)
    const recommendations = generateRecommendations(currentProgress, user)

    return createSuccessResponse({
      progress: currentProgress,
      nextSteps,
      recommendations,
      userData: user
    })

  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, step, data, action } = body

    validateUserId(userId)

    if (!step) {
      return NextResponse.json({
        success: false,
        error: 'Step is required'
      }, { status: 400 })
    }

    switch (action) {
      case 'update_step':
        const updatedProgress = await updateOnboardingStep(userId, step, data)
        return createSuccessResponse({ progress: updatedProgress })

      case 'validate_step':
        const validation = await validateOnboardingStep(step, data)
        return createSuccessResponse({ validation })

      case 'complete_step':
        const completedProgress = await completeOnboardingStep(userId, step, data)
        return createSuccessResponse({ progress: completedProgress })

      case 'skip_step':
        const skippedProgress = await skipOnboardingStep(userId, step)
        return createSuccessResponse({ progress: skippedProgress })

      case 'reset_progress':
        const resetProgress = await resetOnboardingProgress(userId)
        return createSuccessResponse({ progress: resetProgress })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }

  } catch (error) {
    return handleApiError(error)
  }
}

async function updateOnboardingStep(userId: string, step: string, data: any) {
  // Validate step data
  const validation = await validateOnboardingStep(step, data)
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
  }

  // Update user data
  const { error: userError } = await supabase
    .from('users')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (userError) {
    throw new Error('Failed to update user data')
  }

  // Update onboarding progress
  const { data: currentProgress, error: progressError } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('user_id', userId)
    .single()

  const progressData = currentProgress || {
    user_id: userId,
    current_step: step,
    completed_steps: [],
    progress_percentage: 0,
    started_at: new Date().toISOString()
  }

  const updatedProgress = {
    ...progressData,
    current_step: step,
    step_data: {
      ...progressData.step_data,
      [step]: data
    },
    updated_at: new Date().toISOString()
  }

  const { data: savedProgress, error: saveError } = await supabase
    .from('onboarding_progress')
    .upsert(updatedProgress, { onConflict: 'user_id' })
    .select()
    .single()

  if (saveError) {
    throw new Error('Failed to update onboarding progress')
  }

  return savedProgress
}

async function validateOnboardingStep(step: string, data: any) {
  const validationRules = {
    business_info: {
      required: ['business_name', 'business_type', 'phone_number'],
      validation: {
        business_name: { minLength: 2, maxLength: 100 },
        phone_number: { pattern: /^\+?[\d\s\-\(\)]+$/ },
        email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
      }
    },
    services: {
      required: ['services'],
      validation: {
        services: { minItems: 1, maxItems: 10 }
      }
    },
    voice_agent: {
      required: ['voice_personality', 'business_hours'],
      validation: {
        business_hours: { 
          start_time: { pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
          end_time: { pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
        }
      }
    },
    phone_integration: {
      required: ['phone_number'],
      validation: {
        phone_number: { pattern: /^\+?[\d\s\-\(\)]+$/ }
      }
    },
    calendar_integration: {
      required: ['calendar_provider'],
      validation: {
        calendar_provider: { enum: ['google', 'outlook', 'apple'] }
      }
    },
    billing: {
      required: ['payment_method'],
      validation: {
        payment_method: { enum: ['card', 'bank_transfer'] }
      }
    }
  }

  const rule = validationRules[step as keyof typeof validationRules]
  if (!rule) {
    return { valid: false, error: 'Invalid step' }
  }

  const errors = []
  const warnings = []

  // Check required fields
  for (const field of rule.required) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push(`${field} is required`)
    }
  }

  // Validate field formats
  if (rule.validation) {
    for (const [field, rules] of Object.entries(rule.validation)) {
      const value = data[field]
      if (!value) continue

      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`)
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be no more than ${rules.maxLength} characters`)
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`)
      }
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`)
      }
      if (rules.minItems && Array.isArray(value) && value.length < rules.minItems) {
        errors.push(`${field} must have at least ${rules.minItems} items`)
      }
      if (rules.maxItems && Array.isArray(value) && value.length > rules.maxItems) {
        errors.push(`${field} must have no more than ${rules.maxItems} items`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

async function completeOnboardingStep(userId: string, step: string, data: any) {
  // Update user data
  await updateOnboardingStep(userId, step, data)

  // Mark step as completed
  const { data: currentProgress, error: progressError } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('user_id', userId)
    .single()

  const completedSteps = currentProgress?.completed_steps || []
  if (!completedSteps.includes(step)) {
    completedSteps.push(step)
  }

  const progressPercentage = calculateProgressPercentage(completedSteps)
  const nextStep = getNextStep(completedSteps)

  const updatedProgress = {
    ...currentProgress,
    completed_steps: completedSteps,
    current_step: nextStep,
    progress_percentage: progressPercentage,
    updated_at: new Date().toISOString()
  }

  const { data: savedProgress, error: saveError } = await supabase
    .from('onboarding_progress')
    .upsert(updatedProgress, { onConflict: 'user_id' })
    .select()
    .single()

  if (saveError) {
    throw new Error('Failed to complete onboarding step')
  }

  // Trigger next step actions if applicable
  await triggerStepActions(userId, step, data)

  return savedProgress
}

async function skipOnboardingStep(userId: string, step: string) {
  const { data: currentProgress, error: progressError } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('user_id', userId)
    .single()

  const skippedSteps = currentProgress?.skipped_steps || []
  if (!skippedSteps.includes(step)) {
    skippedSteps.push(step)
  }

  const completedSteps = currentProgress?.completed_steps || []
  const progressPercentage = calculateProgressPercentage([...completedSteps, ...skippedSteps])
  const nextStep = getNextStep([...completedSteps, ...skippedSteps])

  const updatedProgress = {
    ...currentProgress,
    skipped_steps: skippedSteps,
    current_step: nextStep,
    progress_percentage: progressPercentage,
    updated_at: new Date().toISOString()
  }

  const { data: savedProgress, error: saveError } = await supabase
    .from('onboarding_progress')
    .upsert(updatedProgress, { onConflict: 'user_id' })
    .select()
    .single()

  if (saveError) {
    throw new Error('Failed to skip onboarding step')
  }

  return savedProgress
}

async function resetOnboardingProgress(userId: string) {
  const { error } = await supabase
    .from('onboarding_progress')
    .delete()
    .eq('user_id', userId)

  if (error) {
    throw new Error('Failed to reset onboarding progress')
  }

  return {
    user_id: userId,
    current_step: 'business_info',
    completed_steps: [],
    progress_percentage: 0,
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

async function triggerStepActions(userId: string, step: string, data: any) {
  switch (step) {
    case 'voice_agent':
      // Create voice agent
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/create-azure-voice-agent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            businessData: data
          })
        })
        if (!response.ok) {
          console.error('Failed to create voice agent')
        }
      } catch (error) {
        console.error('Error creating voice agent:', error)
      }
      break

    case 'phone_integration':
      // Purchase phone number
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/purchase-phone-number`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            phoneNumber: data.phone_number
          })
        })
        if (!response.ok) {
          console.error('Failed to purchase phone number')
        }
      } catch (error) {
        console.error('Error purchasing phone number:', error)
      }
      break

    case 'calendar_integration':
      // Setup calendar integration
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/calendar/universal-calendar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            provider: data.calendar_provider,
            credentials: data.credentials
          })
        })
        if (!response.ok) {
          console.error('Failed to setup calendar integration')
        }
      } catch (error) {
        console.error('Error setting up calendar:', error)
      }
      break

    case 'billing':
      // Create subscription
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/create-subscription`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            paymentMethod: data.payment_method
          })
        })
        if (!response.ok) {
          console.error('Failed to create subscription')
        }
      } catch (error) {
        console.error('Error creating subscription:', error)
      }
      break
  }
}

function calculateNextSteps(progress: any, user: any) {
  const allSteps = [
    'business_info',
    'services',
    'voice_agent',
    'phone_integration',
    'calendar_integration',
    'billing',
    'testing',
    'completion'
  ]

  const completedSteps = progress.completed_steps || []
  const skippedSteps = progress.skipped_steps || []
  const remainingSteps = allSteps.filter(step => 
    !completedSteps.includes(step) && !skippedSteps.includes(step)
  )

  return remainingSteps.map(step => ({
    step,
    title: getStepTitle(step),
    description: getStepDescription(step),
    required: isStepRequired(step),
    estimatedTime: getStepEstimatedTime(step)
  }))
}

function generateRecommendations(progress: any, user: any) {
  const recommendations = []

  if (!user.business_type) {
    recommendations.push({
      type: 'business_type',
      message: 'Select your business type to get personalized recommendations',
      priority: 'high'
    })
  }

  if (!user.services || user.services.length === 0) {
    recommendations.push({
      type: 'services',
      message: 'Add your services to help the AI agent understand your business',
      priority: 'medium'
    })
  }

  if (progress.progress_percentage < 50) {
    recommendations.push({
      type: 'completion',
      message: 'Complete the onboarding process to start receiving calls',
      priority: 'high'
    })
  }

  return recommendations
}

function calculateProgressPercentage(completedSteps: string[]): number {
  const totalSteps = 8 // Total number of onboarding steps
  return Math.round((completedSteps.length / totalSteps) * 100)
}

function getNextStep(completedSteps: string[]): string {
  const allSteps = [
    'business_info',
    'services',
    'voice_agent',
    'phone_integration',
    'calendar_integration',
    'billing',
    'testing',
    'completion'
  ]

  return allSteps.find(step => !completedSteps.includes(step)) || 'completion'
}

function getStepTitle(step: string): string {
  const titles = {
    business_info: 'Business Information',
    services: 'Services & Pricing',
    voice_agent: 'AI Voice Agent Setup',
    phone_integration: 'Phone Number Setup',
    calendar_integration: 'Calendar Integration',
    billing: 'Billing & Subscription',
    testing: 'Test Your Setup',
    completion: 'Onboarding Complete'
  }
  return titles[step as keyof typeof titles] || step
}

function getStepDescription(step: string): string {
  const descriptions = {
    business_info: 'Tell us about your business',
    services: 'Define your services and pricing',
    voice_agent: 'Configure your AI voice assistant',
    phone_integration: 'Get your business phone number',
    calendar_integration: 'Connect your calendar',
    billing: 'Set up billing and subscription',
    testing: 'Test your AI voice assistant',
    completion: 'You\'re all set to start receiving calls'
  }
  return descriptions[step as keyof typeof descriptions] || ''
}

function isStepRequired(step: string): boolean {
  const requiredSteps = ['business_info', 'voice_agent', 'phone_integration', 'billing']
  return requiredSteps.includes(step)
}

function getStepEstimatedTime(step: string): string {
  const times = {
    business_info: '2 minutes',
    services: '3 minutes',
    voice_agent: '5 minutes',
    phone_integration: '2 minutes',
    calendar_integration: '3 minutes',
    billing: '2 minutes',
    testing: '5 minutes',
    completion: '1 minute'
  }
  return times[step as keyof typeof times] || '2 minutes'
}