#!/usr/bin/env node

/**
 * Synthetic monitor for sales workspace health.
 *
 * Logs in with a dedicated sales rep credential and requests the lead inbox.
 * Requires:
 *  - SYNTHETIC_MONITOR_BASE_URL (or NEXT_PUBLIC_APP_URL fallback)
 *  - MONITOR_EMPLOYEE_EMAIL
 *  - MONITOR_EMPLOYEE_PASSWORD
 */

const baseUrl =
  process.env.SYNTHETIC_MONITOR_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  'https://cloudgreet.com'

const email = process.env.MONITOR_EMPLOYEE_EMAIL
const password = process.env.MONITOR_EMPLOYEE_PASSWORD

if (!email || !password) {
  console.error('✖ Missing MONITOR_EMPLOYEE_EMAIL or MONITOR_EMPLOYEE_PASSWORD; skipping sales monitor.')
  process.exit(2)
}

const fetchImpl =
  globalThis.fetch ||
  ((...params) => import('node-fetch').then(({ default: fetch }) => fetch(...params)))

async function login() {
  const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/api/auth/login-simple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok || body?.success !== true || !body?.data?.token) {
    throw new Error(
      `login_failed status=${response.status} message=${body?.message || 'unknown'}`
    )
  }

  return body.data.token
}

async function fetchLeads(token) {
  const response = await fetchImpl(
    `${baseUrl.replace(/\/$/, '')}/api/employee/leads?scope=self&limit=5`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )

  const body = await response.json().catch(() => ({}))

  if (!response.ok || body?.success !== true) {
    throw new Error(
      `leads_failed status=${response.status} message=${body?.error || 'unknown'}`
    )
  }

  if (!Array.isArray(body.leads)) {
    throw new Error('leads_response_missing')
  }

  return body.leads.length
}

async function main() {
  try {
    const token = await login()
    const count = await fetchLeads(token)

    console.log('✔ Sales workspace synthetic succeeded', {
      leadsReturned: count,
      email
    })
  } catch (error) {
    console.error('✖ Sales workspace monitor failed', {
      message: error instanceof Error ? error.message : String(error)
    })
    process.exit(1)
  }
}

main()


