#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function usage(message) {
  if (message) {
    console.error(`✖ ${message}`)
  }
  console.log(`
Usage:
  node scripts/seed-toll-free-numbers.js --numbers "+18885551234,+18885551235"
  node scripts/seed-toll-free-numbers.js --file ./numbers.json

Options:
  --numbers, -n    Comma-separated list of toll-free numbers to seed
  --file, -f       Path to JSON/CSV file containing numbers (array or newline separated)
  --dry-run        Validate input without writing to Supabase
`)
  process.exit(message ? 1 : 0)
}

const args = process.argv.slice(2)
const getArg = (flags) => {
  const idx = args.findIndex((arg) => flags.includes(arg))
  return idx !== -1 ? args[idx + 1] : undefined
}

const numbersArg = getArg(['--numbers', '-n'])
const fileArg = getArg(['--file', '-f'])
const dryRun = args.includes('--dry-run')

function normaliseNumber(raw) {
  if (!raw) return null
  const digits = raw.replace(/[^0-9+]/g, '')
  if (!digits) return null
  if (digits.startsWith('+')) return digits
  // Assume US country code if not provided
  return `+1${digits}`
}

function loadNumbers() {
  const numbers = []

  if (numbersArg) {
    numbers.push(...numbersArg.split(',').map((n) => n.trim()).filter(Boolean))
  }

  if (fileArg) {
    const filePath = path.resolve(process.cwd(), fileArg)
    if (!fs.existsSync(filePath)) {
      usage(`File not found: ${filePath}`)
    }

    const contents = fs.readFileSync(filePath, 'utf8')
    try {
      const parsed = JSON.parse(contents)
      if (Array.isArray(parsed)) {
        numbers.push(...parsed.map((n) => String(n).trim()))
      } else {
        usage('JSON file must contain an array of numbers')
      }
    } catch (error) {
      // Treat as newline separated
      numbers.push(
        ...contents
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      )
    }
  }

  const unique = Array.from(new Set(numbers))
  const normalised = unique
    .map(normaliseNumber)
    .filter(Boolean)

  return Array.from(new Set(normalised))
}

async function main() {
  const numbers = loadNumbers()

  if (numbers.length === 0) {
    usage('Provide at least one toll-free number via --numbers or --file')
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('✖ SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL must be set')
    process.exit(1)
  }

  console.log(`ℹ Preparing to seed ${numbers.length} toll-free number(s)`) 

  if (dryRun) {
    console.log('✔ Dry run complete (no changes applied)')
    console.log(numbers.map((number) => ({ number, status: 'available' })))
    process.exit(0)
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const rows = numbers.map((number) => ({
    number,
    status: 'available',
    assigned_to: null,
    business_name: null,
    assigned_at: null,
    updated_at: new Date().toISOString()
  }))

  const { data, error } = await supabase
    .from('toll_free_numbers')
    .upsert(rows, { onConflict: 'number' })

  if (error) {
    console.error('✖ Failed to seed toll-free numbers', { error: error.message })
    process.exit(1)
  }

  console.log('✔ Toll-free numbers seeded successfully', {
    inserted: data?.length ?? rows.length
  })
}

main().catch((error) => {
  console.error('✖ Unexpected error seeding toll-free numbers', {
    message: error instanceof Error ? error.message : String(error)
  })
  process.exit(1)
})
