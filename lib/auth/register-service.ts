import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { JWTManager } from '@/lib/jwt-manager'
import { logger } from '@/lib/monitoring'

export type NormalizedRegistrationPayload = {
  email: string
  password: string
  business_name: string
  business_type: string
  phone: string
  first_name: string
  last_name: string
  name: string
  address: string
  website: string
}

export type RegistrationResult = {
  token: string
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    name: string
    business_id: string
  }
  business: {
    id: string
    business_name: string
    business_type: string
  }
}

export type SupabaseErrorPayload = {
  message?: string
  details?: string | null
  hint?: string | null
  code?: string | null
}

export class RegistrationError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(message: string, status: number, options?: { code?: string; details?: unknown }) {
    super(message)
    this.status = status
    this.code = options?.code
    this.details = options?.details
  }
}

const sanitizePhone = (raw: string) => {
  const trimmed = raw.trim()
  if (!trimmed) {
    return ''
  }
  const leadingPlus = trimmed.startsWith('+') ? '+' : ''
  const digits = trimmed.replace(/[^0-9]/g, '')
  return leadingPlus + digits
}

export function normalizeRegistrationPayload(body: Record<string, unknown>): NormalizedRegistrationPayload {
  const normalizeBusinessType = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      return 'general'
    }

    const mapping: Record<string, string> = {
      hvac: 'HVAC',
      'hvac services': 'HVAC',
      painting: 'Painting',
      'painting services': 'Painting',
      roofing: 'Roofing',
      'roofing contractor': 'Roofing',
      'general services': 'general',
      general: 'general',
      'general service': 'general'
    }

    const key = trimmed.toLowerCase()
    const mapped = mapping[key]
    return mapped ?? trimmed
  }

  const email =
    (typeof body.email === 'string' && body.email) ||
    (typeof body['Email'] === 'string' && body['Email']) ||
    ''
  const password =
    (typeof body.password === 'string' && body.password) ||
    (typeof body['Password'] === 'string' && body['Password']) ||
    ''
  const businessName =
    (typeof body.business_name === 'string' && body.business_name) ||
    (typeof body['businessName'] === 'string' && body['businessName']) ||
    ''
  const businessTypeRaw =
    (typeof body.business_type === 'string' && body.business_type) ||
    (typeof body['businessType'] === 'string' && body['businessType']) ||
    ''
  const phoneRaw =
    (typeof body.phone === 'string' && body.phone) ||
    (typeof body['phoneNumber'] === 'string' && body['phoneNumber']) ||
    ''
  const firstNameRaw =
    (typeof body.first_name === 'string' && body.first_name) ||
    (typeof body['firstName'] === 'string' && body['firstName']) ||
    ''
  const lastNameRaw =
    (typeof body.last_name === 'string' && body.last_name) ||
    (typeof body['lastName'] === 'string' && body['lastName']) ||
    ''
  const nameFromBody = typeof body.name === 'string' ? body.name : ''
  const address =
    (typeof body.address === 'string' && body.address) ||
    (typeof body['businessAddress'] === 'string' && body['businessAddress']) ||
    ''
  const website =
    (typeof body.website === 'string' && body.website) ||
    (typeof body['websiteUrl'] === 'string' && body['websiteUrl']) ||
    ''

  const business_type = normalizeBusinessType(businessTypeRaw || 'general')
  const first_name = firstNameRaw.trim()
  const last_name = lastNameRaw.trim()
  const derivedName = [first_name, last_name].filter(Boolean).join(' ').trim()
  const name = nameFromBody.trim() || derivedName

  return {
    email: email.trim().toLowerCase(),
    password,
    business_name: businessName.trim(),
    business_type,
    phone: sanitizePhone(phoneRaw),
    first_name,
    last_name,
    name,
    address: address.trim(),
    website: website.trim()
  }
}

export function serializeUnknown(value: unknown) {
  if (value instanceof Error) {
    return {
      message: value.message,
      stack: value.stack,
      name: value.name
    }
  }

  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'object') {
    try {
      return JSON.parse(
        JSON.stringify(value, Object.getOwnPropertyNames(value as Record<string, unknown>))
      )
    } catch (error) {
      return { serializationError: (error as Error)?.message ?? 'unknown', original: String(value) }
    }
  }

  return value
}

function logSupabaseError(message: string, error: unknown, context?: Record<string, unknown>) {
  const supabaseError = (error as SupabaseErrorPayload | null | undefined) ?? null
  const errorMessage =
    supabaseError?.message ?? (error instanceof Error ? error.message : undefined)
  logger.error(message, {
    ...context,
    errorMessage,
    errorCode: supabaseError?.code,
    errorDetails: supabaseError?.details,
    errorHint: supabaseError?.hint,
    rawError: serializeUnknown(error),
    supabaseErrorPayload: serializeUnknown(supabaseError)
  })
}

export async function registerAccount(body: Record<string, unknown>): Promise<RegistrationResult> {
  const payload = normalizeRegistrationPayload(body)

  if (!payload.email || !payload.password || !payload.business_name || !payload.first_name || !payload.last_name) {
    throw new RegistrationError(
      'Missing required fields: email, password, first_name, last_name, business_name',
      400
    )
  }

  if (payload.password.length < 8) {
    throw new RegistrationError('Password must be at least 8 characters long', 400)
  }

  const { data: existingUser } = await supabaseAdmin
    .from('custom_users')
    .select('id, email')
    .eq('email', payload.email.toLowerCase())
    .single()

  if (existingUser) {
    throw new RegistrationError('An account with this email already exists', 409)
  }

  const passwordHash = await bcrypt.hash(payload.password, 12)

  const {
    data: authResult,
    error: authError
  } = await supabaseAdmin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      first_name: payload.first_name,
      last_name: payload.last_name,
      phone: payload.phone
    }
  })

  if (authError || !authResult?.user) {
    logSupabaseError('Failed to create auth user', authError, { email: payload.email })
    throw new RegistrationError('Failed to create user account', 500, {
      code: authError?.code ?? 'auth_create_failed',
      details: serializeUnknown(authError)
    })
  }

  const authUserId = authResult.user.id

  const { data: newUser, error: userError } = await supabaseAdmin
    .from('custom_users')
    .insert({
      id: authUserId,
      email: payload.email.toLowerCase(),
      password_hash: passwordHash,
      first_name: payload.first_name,
      last_name: payload.last_name,
      name: payload.name || `${payload.first_name} ${payload.last_name}`.trim(),
      is_active: true,
      is_admin: false,
      role: 'owner'
    })
    .select()
    .single()

  if (userError || !newUser) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId)
    logSupabaseError('Failed to create user', userError, { email: payload.email })
    throw new RegistrationError('Failed to create user account', 500, {
      code: userError?.code ?? 'user_create_failed',
      details: serializeUnknown(userError)
    })
  }

  const { error: coreUserError } = await supabaseAdmin.from('users').insert({
    id: authUserId,
    email: payload.email.toLowerCase(),
    name: payload.name || `${payload.first_name} ${payload.last_name}`.trim(),
    first_name: payload.first_name,
    last_name: payload.last_name,
    phone: payload.phone || null,
    role: 'owner'
  })

  if (coreUserError) {
    await supabaseAdmin.from('custom_users').delete().eq('id', newUser.id)
    await supabaseAdmin.auth.admin.deleteUser(authUserId)
    logSupabaseError('Failed to mirror user into core users table', coreUserError, {
      email: payload.email,
      user_id: newUser.id
    })
    throw new RegistrationError('Failed to create user account', 500, {
      code: coreUserError.code ?? 'core_user_create_failed',
      details: serializeUnknown(coreUserError)
    })
  }

  const { data: newBusiness, error: businessError } = await supabaseAdmin
    .from('businesses')
    .insert({
      owner_id: newUser.id,
      business_name: payload.business_name,
      business_type: payload.business_type || 'general',
      email: payload.email.toLowerCase(),
      phone: payload.phone || null,
      phone_number: payload.phone || null,
      address: payload.address || null,
      website: payload.website || null
    })
    .select()
    .single()

  if (businessError || !newBusiness) {
    await supabaseAdmin.from('custom_users').delete().eq('id', newUser.id)
    await supabaseAdmin.from('users').delete().eq('id', newUser.id)
    await supabaseAdmin.auth.admin.deleteUser(authUserId)
    logSupabaseError('Failed to create business', businessError, {
      business_name: payload.business_name,
      owner_id: newUser.id
    })
    throw new RegistrationError('Failed to create business', 500, {
      code: businessError?.code ?? 'business_create_failed',
      details: serializeUnknown(businessError)
    })
  }

  const { error: updateCustomUserError } = await supabaseAdmin
    .from('custom_users')
    .update({ business_id: newBusiness.id, role: 'owner' })
    .eq('id', newUser.id)

  if (updateCustomUserError) {
    logSupabaseError('Failed to update custom_user with business_id', updateCustomUserError, {
      user_id: newUser.id,
      business_id: newBusiness.id
    })
    // Non-fatal, continue
  }

  const { error: updateUserError } = await supabaseAdmin
    .from('users')
    .update({ business_id: newBusiness.id })
    .eq('id', newUser.id)

  if (updateUserError) {
    logSupabaseError('Failed to update user with business_id', updateUserError, {
      user_id: newUser.id,
      business_id: newBusiness.id
    })
    // Non-fatal, continue
  }

  const token = JWTManager.createUserToken(newUser.id, newBusiness.id, payload.email.toLowerCase(), 'owner')

  return {
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      name: newUser.name,
      business_id: newBusiness.id
    },
    business: {
      id: newBusiness.id,
      business_name: newBusiness.business_name,
      business_type: newBusiness.business_type
    }
  }
}


