import crypto from 'crypto'

const AAD = Buffer.from('cloudgreet/integration-secrets', 'utf8')

let cachedKey: Buffer | null = null

const loadKey = (): Buffer => {
  if (cachedKey) {
    return cachedKey
  }

  const rawKey = process.env.SECRETS_ENCRYPTION_KEY
  if (!rawKey) {
    throw new Error(
      'SECRETS_ENCRYPTION_KEY is not set. Generate a 32-byte key (hex or base64) and add it to your environment.'
    )
  }

  const attempts: Buffer[] = []

  try {
    attempts.push(Buffer.from(rawKey, 'base64'))
  } catch {
    // ignore
  }

  try {
    attempts.push(Buffer.from(rawKey, 'hex'))
  } catch {
    // ignore
  }

  // If the raw string itself is already 32 bytes, accept it (useful for random ascii)
  attempts.push(Buffer.from(rawKey))

  const key = attempts.find((candidate) => candidate.length === 32)

  if (!key) {
    throw new Error(
      'SECRETS_ENCRYPTION_KEY must resolve to 32 bytes. Provide a base64 or hex encoded 32 byte key.'
    )
  }

  cachedKey = key
  return key
}

export const encryptSecret = (plaintext: string): string => {
  const key = loadKey()
  const iv = crypto.randomBytes(12) // recommended length for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(AAD)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv.toString('base64'), encrypted.toString('base64'), authTag.toString('base64')].join(':')
}

export const decryptSecret = (payload: string): string => {
  const key = loadKey()
  const segments = payload.split(':')
  if (segments.length !== 3) {
    throw new Error('Invalid encrypted payload format')
  }

  const [ivB64, dataB64, tagB64] = segments
  const iv = Buffer.from(ivB64, 'base64')
  const encrypted = Buffer.from(dataB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAAD(AAD)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

export const maskSecret = (value: string | null): string => {
  if (!value) return ''
  if (value.length <= 8) return '*'.repeat(value.length)
  return `${value.slice(0, 4)}${'*'.repeat(value.length - 8)}${value.slice(-4)}`
}


