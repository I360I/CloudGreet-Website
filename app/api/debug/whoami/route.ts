import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/debug/whoami
 *
 * Diagnostic - returns exactly why auth is or isn't working without
 * requiring auth itself. Surfaces:
 *   - whether a token was found, where (header vs cookie)
 *   - whether JWT_SECRET is configured server-side
 *   - whether the token verifies, and if so, the payload
 *   - if it fails, the specific error class (expired / invalid sig / malformed)
 *
 * Safe to leave deployed - returns no secrets, just the decoded payload
 * fields that the user already has in their own JWT.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cookieToken = request.cookies.get('token')?.value || null

  let token: string | null = null
  let tokenSource: string = 'none'
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '')
    tokenSource = 'authorization_header'
  } else if (cookieToken) {
    token = cookieToken
    tokenSource = 'cookie'
  }

  const hasJwtSecret = !!process.env.JWT_SECRET

  if (!token) {
    return NextResponse.json({
      ok: false,
      reason: 'no_token',
      detail: 'No Authorization: Bearer header and no `token` cookie present.',
      has_jwt_secret: hasJwtSecret,
      cookies_seen: request.cookies.getAll().map((c) => c.name),
    })
  }

  if (!hasJwtSecret) {
    return NextResponse.json({
      ok: false,
      reason: 'jwt_secret_missing',
      detail: 'Token was sent but JWT_SECRET is not configured server-side.',
      token_source: tokenSource,
      token_length: token.length,
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any

    // Surface exactly what each SMS endpoint would say for this user/env.
    const role = decoded.role || null
    const isAdmin = role === 'admin'
    const hasNotifFrom = !!process.env.CLOUDGREET_NOTIFICATIONS_FROM
    const hasTelnyxKey = !!process.env.TELNYX_API_KEY
    const hasMsgProfile = !!process.env.TELNYX_MESSAGING_PROFILE_ID

    return NextResponse.json({
      ok: true,
      token_source: tokenSource,
      payload: {
        userId: decoded.userId,
        businessId: decoded.businessId,
        role,
        iat: decoded.iat,
        exp: decoded.exp,
        issued_at: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null,
        expires_at: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
        seconds_until_expiry: decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : null,
      },
      // What the SMS endpoints would do for this exact request
      sms_endpoint_predictions: {
        admin_sms_test: isAdmin
          ? (hasNotifFrom && hasTelnyxKey
              ? 'WOULD ATTEMPT SEND'
              : `would 400 - missing env (${[
                  !hasTelnyxKey && 'TELNYX_API_KEY',
                  !hasNotifFrom && 'CLOUDGREET_NOTIFICATIONS_FROM',
                ].filter(Boolean).join(', ')})`)
          : `would 401 - role is "${role}", admin endpoint requires "admin"`,
        dashboard_notifications_test: !decoded.businessId
          ? 'would 401 - token has no businessId'
          : !hasNotifFrom
            ? 'would 503 - CLOUDGREET_NOTIFICATIONS_FROM not set in Vercel env'
            : 'WOULD ATTEMPT SEND (auth + env both ok)',
      },
      env_flags: {
        TELNYX_API_KEY_set: hasTelnyxKey,
        TELNYX_MESSAGING_PROFILE_ID_set: hasMsgProfile,
        CLOUDGREET_NOTIFICATIONS_FROM_set: hasNotifFrom,
      },
    })
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) {
      return NextResponse.json({
        ok: false,
        reason: 'token_expired',
        detail: e.message,
        expired_at: (e as any).expiredAt,
        token_source: tokenSource,
      })
    }
    if (e instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({
        ok: false,
        reason: 'jwt_invalid',
        detail: e.message,
        token_source: tokenSource,
        token_length: token.length,
        // helps spot JWT_SECRET mismatch (signature invalid) vs malformed token
        likely_cause:
          e.message.includes('signature')
            ? 'JWT_SECRET on server does not match the secret used to sign this token (env mismatch between login and verify, or two different JWT_SECRETs across deploys)'
            : e.message,
      })
    }
    return NextResponse.json({
      ok: false,
      reason: 'unknown',
      detail: e instanceof Error ? e.message : String(e),
      token_source: tokenSource,
    })
  }
}
