import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend('re_F44UCcM1_DLHscTFnsqCgW1emStvjxGj6')

// In a real app, you'd store these in a database
const resetTokens = new Map<string, { email: string; expires: number }>()

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Generate a secure reset token
    const token = crypto.randomUUID()
    const expires = Date.now() + 60 * 60 * 1000 // 1 hour

    // Store the token (in production, store in database)
    resetTokens.set(token, { email, expires })

    // Create reset link
    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    // Send email
    try {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Reset Your CloudGreet Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1f2937; margin-bottom: 10px;">CloudGreet</h1>
              <p style="color: #6b7280; font-size: 14px; margin: 0;">AI RECEPTIONIST</p>
            </div>
            
            <div style="background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #1f2937; margin-bottom: 20px; text-align: center;">Reset Your Password</h2>
              
              <p style="color: #374151; line-height: 1.6; margin-bottom: 30px;">
                You requested a password reset for your CloudGreet account. Click the button below to create a new password.
              </p>
              
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${resetLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              
              <p style="color: #3b82f6; font-size: 14px; word-break: break-all; margin-bottom: 30px;">
                ${resetLink}
              </p>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <p style="color: #374151; font-size: 14px; margin: 0;">
                  <strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request this reset, 
                  please ignore this email and your password will remain unchanged.
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
                Need help? Contact our support team at support@cloudgreet.com
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #9ca3af; font-size: 12px;">
                © 2024 CloudGreet. All rights reserved.
              </p>
            </div>
          </div>
        `
      })

      console.log('✅ Password reset email sent to:', email)
      
      return NextResponse.json(
        { message: 'Password reset email sent successfully' },
        { status: 200 }
      )
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError)
      
      // Remove the token if email fails
      resetTokens.delete(token)
      
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Password reset request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { token, email, newPassword } = await request.json()

    if (!token || !email || !newPassword) {
      return NextResponse.json(
        { error: 'Token, email, and new password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Check if token exists and is valid
    const storedToken = resetTokens.get(token)
    if (!storedToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (Date.now() > storedToken.expires) {
      resetTokens.delete(token)
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Check if email matches
    if (storedToken.email !== email) {
      return NextResponse.json(
        { error: 'Email does not match reset token' },
        { status: 400 }
      )
    }

    // In a real app, you would:
    // 1. Hash the new password
    // 2. Update the user's password in the database
    // 3. Invalidate all existing sessions
    // 4. Log the password change for security

    console.log('✅ Password reset successful for:', email)
    console.log('🔐 New password:', newPassword) // In production, don't log passwords!

    // Remove the used token
    resetTokens.delete(token)

    return NextResponse.json(
      { message: 'Password reset successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Password reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now()
  const tokensToDelete: string[] = []
  resetTokens.forEach((data, token) => {
    if (now > data.expires) {
      tokensToDelete.push(token)
    }
  })
  tokensToDelete.forEach(token => resetTokens.delete(token))
}, 5 * 60 * 1000) // Clean up every 5 minutes
