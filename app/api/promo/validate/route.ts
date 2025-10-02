import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { promoCode } = body

    if (!promoCode) {
      return NextResponse.json({
        success: false,
        message: 'Promo code is required'
      }, { status: 400 })
    }

    // Check if promo code exists and is valid
    const { data: promo, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode.toUpperCase())
      .eq('is_active', true)
      .single()

    if (error || !promo) {
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

    return NextResponse.json({
      success: true,
      message: 'Valid promo code',
      data: {
        code: promo.code,
        trialDays: promo.trial_days,
        description: promo.description
      }
    })

  } catch (error) {
    logger.error("Error", { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      endpoint: 'validate_promo_code',
      message: 'Promo code validation error'
    })
    return NextResponse.json({
      success: false,
      message: 'Failed to validate promo code'
    }, { status: 500 })
  }
}
