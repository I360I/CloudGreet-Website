import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({
        success: false,
        error: 'Token and password are required'
      }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Password must be at least 8 characters long'
      }, { status: 400 })
    }

    // Check if token exists and is valid
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired reset token'
      }, { status: 400 })
    }

    // Hash the new password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Update user's password
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenData.user_id)

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update password'
      }, { status: 500 })
    }

    // Mark token as used
    const { error: tokenUpdateError } = await supabase
      .from('password_reset_tokens')
      .update({ 
        used: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenData.id)

    if (tokenUpdateError) {
      console.error('Error marking token as used:', tokenUpdateError)
      // Don't fail the request, just log the error
    }

    // Get user information for logging
    const { data: user } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', tokenData.user_id)
      .single()

    // Log the password reset
    await supabase
      .from('audit_logs')
      .insert({
        user_id: tokenData.user_id,
        action: 'password_reset_completed',
        resource_type: 'user',
        resource_id: tokenData.user_id,
        new_values: { password_reset_completed: true },
        created_at: new Date().toISOString()
      })

    // Clean up expired tokens for this user
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', tokenData.user_id)
      .lt('expires_at', new Date().toISOString())

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        email: user?.email
      }
    })

  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
