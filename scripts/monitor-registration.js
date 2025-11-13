#!/usr/bin/env node

const { env, exit } = process

const args = process.argv.slice(2)
const baseUrlArgIndex = args.findIndex((arg) => arg === '--base-url' || arg === '-b')
const baseUrl =
  (baseUrlArgIndex !== -1 && args[baseUrlArgIndex + 1]) ||
  env.REGISTRATION_BASE_URL ||
  'https://cloud-greet-website-eickstufs-i360is-projects.vercel.app'

if (!baseUrl) {
  console.error('✖ Missing base URL. Provide via --base-url or REGISTRATION_BASE_URL.')
  exit(2)
}

const fetchImpl =
  globalThis.fetch || ((...params) => import('node-fetch').then(({ default: fetch }) => fetch(...params)))

async function runRegistration(email, password) {
  const payload = {
    firstName: 'Synthetic',
    lastName: 'Monitor',
    businessName: 'Synthetic Monitor LLC',
    businessType: 'HVAC',
    email,
    password,
    phone: '+1 (555) 000-0000',
    address: '123 Reliability Ave, Monitoring City, USA'
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/auth/register-simple`
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const body = await response.json()
  const vercelId = response.headers?.get?.('x-vercel-id') ?? null

  if (!response.ok || !body?.success) {
    throw new Error(
      `registration_failed status=${response.status} vercelId=${vercelId || 'n/a'} message=${body?.message || 'unknown'}`
    )
  }

  console.log('✔ Registration synthetic succeeded', {
    status: response.status,
    email,
    businessId: body.data?.business?.id,
    userId: body.data?.user?.id,
    vercelId
  })

  return { email, password }
}

async function runLogin(email, password) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/auth/login-simple`
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const body = await response.json()
  const vercelId = response.headers?.get?.('x-vercel-id') ?? null

  if (!response.ok || !body?.success) {
    throw new Error(
      `login_failed status=${response.status} vercelId=${vercelId || 'n/a'} message=${body?.message || 'unknown'}`
    )
  }

  console.log('✔ Login synthetic succeeded', {
    status: response.status,
    vercelId,
    userId: body.data?.user?.id,
    businessId: body.data?.business?.id
  })

  return body.data?.token ?? null
}

async function runDashboardHealth(token) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/health`
  const response = await fetchImpl(url, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : undefined
  })

  const body = await response.json()
  const vercelId = response.headers?.get?.('x-vercel-id') ?? null

  if (!response.ok || body?.ok !== true) {
    throw new Error(
      `health_failed status=${response.status} vercelId=${vercelId || 'n/a'} ok=${body?.ok}`
    )
  }

  console.log('✔ Dashboard health synthetic succeeded', {
    status: response.status,
    vercelId,
    checks: body.checks
  })
}

async function main() {
  const email = `synthetic+${Date.now()}@cloudgreet.com`
  const password = 'SyntheticPass123!'

  try {
    await runRegistration(email, password)
    const token = await runLogin(email, password)
    await runDashboardHealth(token)
    console.log('✔ Synthetic monitor sequence completed successfully')
  } catch (error) {
    console.error('✖ Synthetic monitor failure', {
      message: error instanceof Error ? error.message : String(error)
    })
    exit(1)
  }
}

main()
