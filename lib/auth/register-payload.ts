export type RegistrationFormData = {
  firstName: string
  lastName: string
  businessName: string
  businessType: string
  email: string
  password: string
  phone: string
  address: string
}

/**
 * Coerces a phone number into an E.164-friendly format while keeping leading "+" if present.
 * We only strip formatting characters client-side so backend validation can enforce final shape.
 */
function sanitizePhone(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) {
    return ''
  }
  const leadingPlus = trimmed.startsWith('+') ? '+' : ''
  const digits = trimmed.replace(/[^0-9]/g, '')
  return leadingPlus + digits
}

const BUSINESS_TYPE_MAPPING: Record<string, string> = {
  hvac: 'HVAC',
  'hvac services': 'HVAC',
  painting: 'Painting',
  'painting services': 'Painting',
  roofing: 'Roofing',
  'roofing contractor': 'Roofing',
  general: 'general',
  'general services': 'general',
  'general service': 'general'
}

/**
 * Maps the registration form data collected on the marketing site into the payload
 * the API expects. This keeps the UI declarative while ensuring we never send a
 * shape that triggers 400s in production.
 */
export function buildRegistrationPayload(formData: RegistrationFormData) {
  const normalizedEmail = formData.email.trim().toLowerCase()
  const normalizedBusinessName = formData.businessName.trim()
  const normalizedBusinessType =
    BUSINESS_TYPE_MAPPING[formData.businessType.trim().toLowerCase()] ?? 'general'
  const normalizedFirstName = formData.firstName.trim()
  const normalizedLastName = formData.lastName.trim()
  const fullName = [normalizedFirstName, normalizedLastName].filter(Boolean).join(' ').trim()

  return {
    email: normalizedEmail,
    password: formData.password,
    business_name: normalizedBusinessName,
    business_type: normalizedBusinessType,
    phone: sanitizePhone(formData.phone),
    address: formData.address.trim(),
    first_name: normalizedFirstName,
    last_name: normalizedLastName,
    name: fullName
  }
}


