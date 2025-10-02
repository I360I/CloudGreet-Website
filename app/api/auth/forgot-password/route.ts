import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required'
      }, { status: 400 })
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email.toLowerCase())
      .single()

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'No account found with this email address'
      }, { status: 404 })
    }

    // Generate a secure reset token
    const resetToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 3600000) // 1 hour from now

    // Store the reset token in the database
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .upsert({
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })

    if (tokenError) {
      console.error('Error storing reset token:', tokenError)
      return NextResponse.json({
        success: false,
        error: 'Failed to generate reset token'
      }, { status: 500 })
    }

    // Create reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/reset-password?token=${resetToken}`

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Email service not configured. Please contact support.'
      }, { status: 503 })
    }

    // Send email with reset link using Resend
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CloudGreet <noreply@cloudgreet.com>',
          to: [user.email],
          subject: 'Reset Your CloudGreet Password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; font-weight: 800; margin: 0;">CloudGreet</h1>
                  <p style="color: #6B7280; margin: 8px 0 0 0; font-size: 16px;">AI Receptionist Platform</p>
                </div>
                
                <div style="background: #F9FAFB; padding: 30px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #3B82F6;">
                  <h2 style="color: #1F2937; margin-top: 0; font-size: 24px;">Reset Your Password</h2>
                  <p style="color: #4B5563; line-height: 1.6; font-size: 16px;">
                    Hi ${user.name},
                  </p>
                  <p style="color: #4B5563; line-height: 1.6; font-size: 16px;">
                    We received a request to reset your CloudGreet password. Click the button below to create a new password:
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" 
                       style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); 
                              color: white; 
                              text-decoration: none; 
                              padding: 16px 32px; 
                              border-radius: 12px; 
                              font-weight: 600;
                              font-size: 16px;
                              display: inline-block;
                              box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
                              transition: all 0.3s ease;">
                      🔐 Reset Password
                    </a>
                  </div>
                  
                  <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="color: #92400E; font-size: 14px; margin: 0;">
                      ⏰ <strong>Security Notice:</strong> This link will expire in 1 hour for your security.
                    </p>
                  </div>
                  
                  <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">
                    If you didn't request this password reset, please ignore this email. Your account remains secure.
                  </p>
                </div>
                
                <div style="text-align: center; color: #9CA3AF; font-size: 12px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                  <p style="margin: 0;">© 2024 CloudGreet. All rights reserved.</p>
                  <p style="margin: 5px 0 0 0;">This email was sent to ${user.email}</p>
                </div>
              </div>
            </div>
          `
        })
      })

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text()
        console.error('Resend error:', errorText)
        // Don't fail the request if email fails, just log it
      } else {
        const result = await emailResponse.json()
        console.log(`Password reset email sent successfully to ${user.email}. Email ID: ${result.id}`)
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      // Don't fail the request if email fails
    }

    // Log the reset request
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'password_reset_requested',
        resource_type: 'user',
        resource_id: user.id,
        new_values: { reset_token_created: true },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Password reset link sent to your email',
      data: {
        email: user.email,
        // Don't send the actual reset link in production
        resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
      }
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
