import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    const userId = request.headers.get('x-user-id')
    const businessId = request.headers.get('x-business-id')
    
    if (!userId || !businessId) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    const body = await request.json()
    const { promoCode } = body

    if (!promoCode) {
      return NextResponse.json({
        success: false,
        message: 'Promo code is required'
      }, { status: 400 })
    }

    // Check if business already has an active trial
    const { data: existingBusiness } = await supabase
      .from('businesses')
      .select('promo_code_used, trial_end_date, is_trial_active')
      .eq('id', businessId)
      .single()

    if (existingBusiness?.promo_code_used) {
      return NextResponse.json({
        success: false,
        message: 'Promo code already applied to this business'
      }, { status: 400 })
    }

    // Validate promo code
    const { data: promo, error: promoError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode.toUpperCase())
      .eq('is_active', true)
      .single()

    if (promoError || !promo) {
      return NextResponse.json({
        success: false,
        message: 'Invalid promo code'
      }, { status: 404 })
    }

    // Check if promo code has expired
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return NextResponse.json({
        success: false,
        message: 'Promo code has expired'
      }, { status: 400 })
    }

    // Check if promo code has reached max uses
    if (promo.current_uses >= promo.max_uses) {
      return NextResponse.json({
        success: false,
        message: 'Promo code has reached maximum uses'
      }, { status: 400 })
    }

    // Calculate trial dates
    const now = new Date()
    const trialEndDate = new Date(now.getTime() + (promo.trial_days * 24 * 60 * 60 * 1000))

    // Update business with promo code and trial info
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .update({
        promo_code_used: promo.code,
        trial_start_date: now.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        is_trial_active: true,
        subscription_status: 'trialing',
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .select()
      .single()

    if (businessError) {
      logger.error("Error", businessError, {
        requestId,
        businessId,
        action: 'apply_promo_code_business_update'
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to apply promo code'
      }, { status: 500 })
    }

    // Increment promo code usage
    await supabase
      .from('promo_codes')
      .update({
        current_uses: promo.current_uses + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', promo.id)

    // Log promo code application
    await supabase
      .from('audit_logs')
      .insert({
        action: 'promo_code_applied',
        details: {
          business_id: businessId,
          user_id: userId,
          promo_code: promo.code,
          trial_days: promo.trial_days,
          trial_end_date: trialEndDate.toISOString()
        },
        user_id: userId,
        business_id: businessId,
        created_at: new Date().toISOString()
      })

    await logger.info('Promo code applied successfully', {
      requestId,
      businessId,
      userId,
      promoCode: promo.code,
      trialDays: promo.trial_days,
      trialEndDate: trialEndDate.toISOString(),
      responseTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      message: 'Promo code applied successfully',
      data: {
        promoCode: promo.code,
        trialDays: promo.trial_days,
        trialEndDate: trialEndDate.toISOString(),
        business: {
          id: business.id,
          is_trial_active: business.is_trial_active,
          subscription_status: business.subscription_status
        }
      },
      meta: {
        requestId,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error("Error", error as Error, {
      requestId,
      endpoint: 'apply_promo_code',
      responseTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: false,
      message: 'Failed to apply promo code'
    }, { status: 500 })
  }
}
