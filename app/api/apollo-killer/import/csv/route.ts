import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { logger } from '@/lib/monitoring'
import { parse } from 'csv-parse/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

/**
 * APOLLO KILLER: CSV Lead Import
 * 
 * Import leads from CSV with duplicate detection and validation
 * Supports multiple CSV formats and automatic field mapping
 */

export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }

    const formData = await request.formData()
    const csvFile = formData.get('csvFile') as File
    const businessType = formData.get('businessType') as string || 'HVAC'
    const skipDuplicates = formData.get('skipDuplicates') === 'true'

    if (!csvFile) {
      return NextResponse.json({
        error: 'CSV file is required'
      }, { status: 400 })
    }

    // Read CSV content
    const csvContent = await csvFile.text()
    
    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json({
        error: 'CSV file is empty'
      }, { status: 400 })
    }

    // Parse CSV
    let records: any[]
    try {
      records = parse(csvContent, {
        columns: true, // Use first row as headers
        skip_empty_lines: true,
        trim: true
      })
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid CSV format',
        details: error instanceof Error ? error.message : 'Unknown parsing error'
      }, { status: 400 })
    }

    if (records.length === 0) {
      return NextResponse.json({
        error: 'CSV contains no data rows'
      }, { status: 400 })
    }

    // Detect CSV format and map fields
    const fieldMapping = detectCSVFormat(records[0])
    
    if (!fieldMapping.businessName) {
      return NextResponse.json({
        error: 'Could not detect business name field. Ensure CSV has columns like: business_name, company, name, or business.'
      }, { status: 400 })
    }

    logger.info('CSV import started', {
      fileName: csvFile.name,
      totalRecords: records.length,
      businessType,
      skipDuplicates,
      fieldMapping
    })

    const importResults = {
      total: records.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      duplicates: 0,
      errorDetails: [] as string[]
    }

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      
      try {
        // Map CSV fields to our schema
        const leadData = mapCSVRecord(record, fieldMapping, businessType)
        
        if (!leadData.business_name) {
          importResults.errors++
          importResults.errorDetails.push(`Row ${i + 2}: Missing business name`)
          continue
        }

        // Check for duplicates if enabled
        if (skipDuplicates) {
          const { data: existingLead } = await supabaseAdmin
            .from('enriched_leads')
            .select('id')
            .or(`business_name.ilike.%${leadData.business_name}%,phone.eq.${leadData.phone},owner_email.eq.${leadData.owner_email}`)
            .limit(1)
            .single()

          if (existingLead) {
            importResults.duplicates++
            importResults.skipped++
            continue
          }
        }

        // Insert lead
        const { data: newLead, error } = await supabaseAdmin
          .from('enriched_leads')
          .insert({
            ...leadData,
            enrichment_status: 'pending',
            enrichment_sources: ['csv_import'],
            created_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (error) {
          importResults.errors++
          importResults.errorDetails.push(`Row ${i + 2}: ${error.message}`)
        } else {
          importResults.imported++
          
          // Queue for enrichment
          await supabaseAdmin
            .from('enrichment_queue')
            .insert({
              lead_id: newLead.id,
              enrichment_tasks: ['website_scrape', 'email_verification', 'linkedin_search', 'ai_analysis'],
              priority: 5,
              status: 'queued'
            })
        }

      } catch (error) {
        importResults.errors++
        importResults.errorDetails.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    logger.info('CSV import completed', {
      fileName: csvFile.name,
      ...importResults
    })

    return NextResponse.json({
      success: true,
      results: importResults,
      message: `Imported ${importResults.imported} leads, skipped ${importResults.skipped} duplicates, ${importResults.errors} errors.`
    })

  } catch (error) {
    logger.error('CSV import error', {
      error: error instanceof Error ? error.message : 'Unknown'
    })

    return NextResponse.json({
      error: 'CSV import failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Detect CSV format and create field mapping
 */
function detectCSVFormat(firstRecord: any): {
  businessName?: string
  address?: string
  phone?: string
  website?: string
  ownerName?: string
  ownerEmail?: string
  city?: string
  state?: string
} {
  const headers = Object.keys(firstRecord).map(h => h.toLowerCase())
  const mapping: any = {}

  // Business name variants
  const businessNameFields = ['business_name', 'company', 'name', 'business', 'company_name', 'business name', 'company name']
  mapping.businessName = headers.find(h => businessNameFields.includes(h))

  // Address variants
  const addressFields = ['address', 'street_address', 'location', 'street address', 'full_address', 'address1']
  mapping.address = headers.find(h => addressFields.includes(h))

  // Phone variants
  const phoneFields = ['phone', 'phone_number', 'telephone', 'tel', 'phone number', 'contact_phone', 'business_phone']
  mapping.phone = headers.find(h => phoneFields.includes(h))

  // Website variants
  const websiteFields = ['website', 'url', 'web', 'site', 'domain', 'website_url', 'web_address']
  mapping.website = headers.find(h => websiteFields.includes(h))

  // Owner name variants
  const ownerNameFields = ['owner', 'owner_name', 'contact_name', 'primary_contact', 'manager', 'owner name', 'contact name']
  mapping.ownerName = headers.find(h => ownerNameFields.includes(h))

  // Owner email variants
  const emailFields = ['email', 'owner_email', 'contact_email', 'primary_email', 'email_address', 'owner email', 'contact email']
  mapping.ownerEmail = headers.find(h => emailFields.includes(h))

  // City variants
  const cityFields = ['city', 'town', 'locality']
  mapping.city = headers.find(h => cityFields.includes(h))

  // State variants
  const stateFields = ['state', 'province', 'region', 'st']
  mapping.state = headers.find(h => stateFields.includes(h))

  return mapping
}

/**
 * Map CSV record to enriched lead schema
 */
function mapCSVRecord(record: any, mapping: any, businessType: string): any {
  const leadData: any = {
    business_type: businessType
  }

  // Map required fields
  if (mapping.businessName && record[mapping.businessName]) {
    leadData.business_name = record[mapping.businessName].toString().trim()
  }

  // Map optional fields
  if (mapping.address && record[mapping.address]) {
    leadData.address = record[mapping.address].toString().trim()
  }

  if (mapping.phone && record[mapping.phone]) {
    leadData.phone = normalizePhoneNumber(record[mapping.phone].toString())
  }

  if (mapping.website && record[mapping.website]) {
    leadData.website = normalizeWebsite(record[mapping.website].toString())
  }

  if (mapping.ownerName && record[mapping.ownerName]) {
    leadData.owner_name = record[mapping.ownerName].toString().trim()
  }

  if (mapping.ownerEmail && record[mapping.ownerEmail]) {
    const email = record[mapping.ownerEmail].toString().trim().toLowerCase()
    if (isValidEmail(email)) {
      leadData.owner_email = email
    }
  }

  if (mapping.city && record[mapping.city]) {
    leadData.city = record[mapping.city].toString().trim()
  }

  if (mapping.state && record[mapping.state]) {
    leadData.state = record[mapping.state].toString().trim().toUpperCase()
  }

  // Generate Google Place ID equivalent (for uniqueness)
  leadData.google_place_id = `csv_${Buffer.from(leadData.business_name + (leadData.address || leadData.phone || leadData.website || '')).toString('base64').substring(0, 20)}`

  return leadData
}

/**
 * Helper functions
 */

function normalizePhoneNumber(phone: string): string {
  // Extract digits and format as (XXX) XXX-XXXX
  const digits = phone.replace(/\D/g, '')
  
  if (digits.length === 10) {
    return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`
  } else if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`
  }
  
  return phone // Return as-is if can't normalize
}

function normalizeWebsite(website: string): string {
  let url = website.trim().toLowerCase()
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  
  return url
}

function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}
