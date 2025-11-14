import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { INTEGRATION_MAP, INTEGRATIONS, IntegrationConfig } from '@/lib/integrations/config'
import { validateIntegrationField } from '@/lib/integrations/validators'
import { encryptSecret } from '@/lib/security/secret-encryption'

type StoredCredential = {
  slug: string
  field_key: string
  value_encrypted: string
  status: string | null
  metadata: Record<string, unknown> | null
  last_verified_at: string | null
  updated_at: string | null
}

type IntegrationFieldPayload = Record<string, string | null | undefined>

const buildLookup = (rows: StoredCredential[]) => {
  const result: Record<string, Record<string, StoredCredential>> = {}
  rows.forEach((row) => {
    if (!result[row.slug]) {
      result[row.slug] = {}
    }
    result[row.slug][row.field_key] = row
  })
  return result
}

const computeIntegrationStatus = (
  config: IntegrationConfig,
  stored: Record<string, StoredCredential> | undefined
) => {
  let hasError = false
  let missingRequired = false

  config.fields.forEach((field) => {
    const record = stored?.[field.key]
    if (!record) {
      if (!field.optional) {
        missingRequired = true
      }
      return
    }

    if (record.status && record.status.toLowerCase() !== 'connected') {
      hasError = true
    }
  })

  if (missingRequired) {
    return 'action_required'
  }
  if (hasError) {
    return 'error'
  }
  if (!stored || Object.keys(stored).length === 0) {
    return 'pending'
  }
  return 'connected'
}

const mapIntegrationsResponse = (rows: StoredCredential[]) => {
  const lookup = buildLookup(rows)

  return INTEGRATIONS.map((integration) => {
    const stored = lookup[integration.slug]
    const status = computeIntegrationStatus(integration, stored)

    return {
      slug: integration.slug,
      name: integration.name,
      description: integration.description,
      category: integration.category,
      icon: integration.icon,
      docsUrl: integration.docsUrl,
      status,
      lastVerifiedAt: stored
        ? Object.values(stored)
            .map((record) => record.last_verified_at)
            .filter(Boolean)
            .sort()
            .pop() ?? null
        : null,
      fields: integration.fields.map((field) => {
        const record = stored?.[field.key]
        const fieldStatus = record?.status ?? (field.optional ? 'optional' : 'pending')
        const metadata = (record?.metadata || {}) as Record<string, unknown>

        return {
          key: field.key,
          label: field.label,
          description: field.description,
          inputType: field.type,
          optional: !!field.optional,
          status: fieldStatus,
          lastVerifiedAt: record?.last_verified_at ?? null,
          hasValue: Boolean(record),
          error: typeof metadata.error === 'string' ? metadata.error : null
        }
      })
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('integration_secret_values')
      .select('*')

    if (error) {
      logger.error('Failed to load integration credentials', { 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          integrations: []
        })
      }
      return NextResponse.json({ error: 'Failed to load integration credentials' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      integrations: mapIntegrationsResponse((data ?? []) as StoredCredential[])
    })
  } catch (error) {
    logger.error('Admin integrations GET failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ error: 'Failed to load integration credentials' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const { slug, fields } = body as {
      slug?: string
      fields?: IntegrationFieldPayload
    }

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Integration slug is required.' }, { status: 400 })
    }

    const integration = INTEGRATION_MAP[slug as IntegrationConfig['slug']]
    if (!integration) {
      return NextResponse.json({ error: 'Unknown integration.' }, { status: 404 })
    }

    if (!fields || typeof fields !== 'object') {
      return NextResponse.json({ error: 'Fields payload is required.' }, { status: 400 })
    }

    const timestamp = new Date().toISOString()
    const results: StoredCredential[] = []

    for (const [fieldKey, rawValue] of Object.entries(fields)) {
      const fieldConfig = integration.fields.find((field) => field.key === fieldKey)
      if (!fieldConfig) {
        return NextResponse.json(
          { error: `Field ${fieldKey} is not supported for ${integration.name}.` },
          { status: 400 }
        )
      }

      const value = typeof rawValue === 'string' ? rawValue.trim() : ''

      if (!value) {
        if (fieldConfig.optional) {
          await supabaseAdmin
            .from('integration_secret_values')
            .delete()
            .eq('slug', integration.slug)
            .eq('field_key', fieldConfig.key)
          continue
        }

        return NextResponse.json(
          { error: `${fieldConfig.label} is required for ${integration.name}.` },
          { status: 422 }
        )
      }

      const validation = await validateIntegrationField(fieldConfig.validator, value)
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.message || `Validation failed for ${fieldConfig.label}.` },
          { status: 422 }
        )
      }

      const encrypted = encryptSecret(value)

      const { data, error } = await supabaseAdmin
        .from('integration_secret_values')
        .upsert(
          {
            slug: integration.slug,
            field_key: fieldConfig.key,
            value_encrypted: encrypted,
            status: 'connected',
            metadata: {},
            last_verified_at: timestamp,
            updated_at: timestamp
          },
          { onConflict: 'slug,field_key' }
        )
        .select('*')

      if (error) {
        logger.error('Failed to store integration credential', {
          slug: integration.slug,
          field: fieldConfig.key,
          error: error.message
        })
        return NextResponse.json(
          { error: `Failed to store ${fieldConfig.label}.` },
          { status: 500 }
        )
      }

      if (data?.[0]) {
        results.push(data[0])
      }
    }

    // Retrieve the latest snapshot for response
    const { data, error } = await supabaseAdmin
      .from('integration_secret_values')
      .select('*')

    if (error) {
      logger.error('Failed to refresh integration credentials', { error: error.message })
      return NextResponse.json(
        { error: 'Saved but failed to refresh integration state.' },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      integrations: mapIntegrationsResponse((data ?? []) as StoredCredential[])
    })
  } catch (error) {
    logger.error('Admin integrations POST failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to update integration credentials' }, { status: 500 })
  }
}


