import { supabaseAdmin } from '@/lib/supabase'
import { decryptSecret } from '@/lib/security/secret-encryption'

type IntegrationSecretRow = {
  slug: string
  field_key: string
  value_encrypted: string
  status: string | null
}

export async function getIntegrationSecrets(
  slug: string
): Promise<Record<string, string>> {
  const { data, error } = await supabaseAdmin
    .from<IntegrationSecretRow>('integration_secret_values')
    .select('field_key, value_encrypted, status')
    .eq('slug', slug)

  if (error) {
    throw new Error(`Failed to load ${slug} secrets: ${error.message}`)
  }

  const result: Record<string, string> = {}
  ;(data ?? []).forEach((row) => {
    if (row.value_encrypted && row.status !== 'error') {
      result[row.field_key] = decryptSecret(row.value_encrypted)
    }
  })
  return result
}

export async function getIntegrationSecret(
  slug: string,
  field: string
): Promise<string | null> {
  const secrets = await getIntegrationSecrets(slug)
  return secrets[field] ?? null
}


