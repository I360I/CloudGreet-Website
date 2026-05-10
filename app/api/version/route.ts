import { NextResponse } from 'next/server'

export const dynamic = 'force-static'
export const runtime = 'nodejs'

/**
 * GET /api/version
 *
 * Returns the commit SHA + build timestamp of the currently-deployed
 * version. Hit this to verify a Vercel deploy actually landed - if
 * the SHA doesn't match what's on origin/main, the deploy didn't
 * land (paused integration, build error, cron limit, etc.).
 *
 * Uses Vercel's auto-set VERCEL_GIT_COMMIT_SHA. Falls back to a
 * build-time timestamp so the response is always meaningful.
 */
export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    commit_short: (process.env.VERCEL_GIT_COMMIT_SHA || 'unknown').slice(0, 7),
    branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
    deployed_at: BUILD_TIME,
    deployment_url: process.env.VERCEL_URL || null,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
  })
}

const BUILD_TIME = new Date().toISOString()
