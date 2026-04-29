#!/usr/bin/env node

/**
 * Seed demo data for CloudGreet
 *
 * Inserts a fully wired demo tenant with:
 * - Owner account
 * - Sample prospects, outreach templates, sequences
 * - Demo sales activities, tasks, commissions
 *
 * Environment requirements:
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional overrides:
 *  - DEMO_BUSINESS_ID
 *  - DEMO_OWNER_EMAIL
 *  - DEMO_OWNER_PASSWORD
 */

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')
const { randomUUID } = require('crypto')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const DEMO_BUSINESS_ID = process.env.DEMO_BUSINESS_ID || randomUUID()
const OWNER_EMAIL = (process.env.DEMO_OWNER_EMAIL || 'demo-owner@cloudgreet.com').toLowerCase()
const OWNER_PASSWORD = process.env.DEMO_OWNER_PASSWORD || 'DemoOwner123!'
const EMPLOYEE_EMAIL = (process.env.DEMO_EMPLOYEE_EMAIL || 'demo-rep@cloudgreet.com').toLowerCase()
const EMPLOYEE_PASSWORD = process.env.DEMO_EMPLOYEE_PASSWORD || 'DemoRep123!'

async function ensureUser(id, email, password, role, businessId, extra = {}) {
  const { data: existingUser } = await supabase
    .from('custom_users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingUser) {
    console.log(`ℹ User ${email} already exists`)
    return existingUser.id
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const userPayload = {
    id,
    email,
    password_hash: passwordHash,
    first_name: extra.first_name || 'Demo',
    last_name: extra.last_name || role === 'sales' ? 'Rep' : 'Owner',
    business_id: businessId,
    is_active: true,
    is_admin: role === 'owner',
    role,
    job_title: extra.job_title || (role === 'sales' ? 'Account Executive' : 'Owner')
  }

  const { error } = await supabase.from('custom_users').insert(userPayload)
  if (error) {
    console.error(`✖ Failed to insert ${role} user`, error)
    process.exit(1)
  }

  console.log(`✔ Created ${role} user ${email}`)
  return id
}

async function seedBusiness(ownerId) {
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', DEMO_BUSINESS_ID)
    .maybeSingle()

  if (existing) {
    console.log('ℹ Demo business already exists')
    return
  }

  const { error } = await supabase.from('businesses').insert({
    id: DEMO_BUSINESS_ID,
    owner_id: ownerId,
    business_name: 'CloudGreet Demo Services',
    business_type: 'HVAC',
    email: OWNER_EMAIL,
    phone: '+1 555 010 2000',
    phone_number: '+1 555 010 2000',
    address: '123 Demo Avenue',
    city: 'Austin',
    state: 'TX',
    zip_code: '78701',
    website: 'https://demo.cloudgreet.com',
    services: ['Residential HVAC install', 'Annual maintenance', 'Emergency repair'],
    service_areas: ['Austin', 'Round Rock', 'San Marcos'],
    business_hours: {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '10:00', end: '14:00', enabled: false },
      sunday: { start: '10:00', end: '14:00', enabled: false }
    },
    timezone: 'America/Chicago',
    onboarding_completed: true,
    onboarding_step: 999,
    stripe_customer_id: null,
    retell_agent_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  if (error) {
    console.error('✖ Failed to seed business', error)
    process.exit(1)
  }

  console.log('✔ Seeded demo business')
}

async function seedProspects() {
  const { data: existing } = await supabase
    .from('prospects')
    .select('id')
    .eq('business_id', DEMO_BUSINESS_ID)
    .limit(1)

  if (existing && existing.length > 0) {
    console.log('ℹ Prospects already seeded')
    return
  }

  const now = new Date().toISOString()
  const sampleProspects = [
    {
      id: randomUUID(),
      external_id: `apollo-${randomUUID()}`,
      provider: 'apollo',
      business_id: DEMO_BUSINESS_ID,
      first_name: 'Jordan',
      last_name: 'Lopez',
      email: 'jordan.lopez@example.com',
      phone: '+1 555 120 3001',
      company_name: 'Austin Luxe Apartments',
      job_title: 'Property Manager',
      industry: 'Real Estate',
      city: 'Austin',
      state: 'TX',
      country: 'USA',
      status: 'in_progress',
      score: 82,
      tags: ['property', 'multi-family'],
      sequence_status: 'running',
      last_outreach_at: now,
      next_touch_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: now,
      updated_at: now
    },
    {
      id: randomUUID(),
      external_id: `apollo-${randomUUID()}`,
      provider: 'apollo',
      business_id: DEMO_BUSINESS_ID,
      first_name: 'Taylor',
      last_name: 'Nguyen',
      email: 'taylor.nguyen@example.com',
      phone: '+1 555 120 3002',
      company_name: 'Hill Country Builders',
      job_title: 'Operations Director',
      industry: 'Construction',
      city: 'Cedar Park',
      state: 'TX',
      country: 'USA',
      status: 'qualified',
      score: 96,
      tags: ['commercial', 'high-value'],
      sequence_status: 'completed',
      last_outreach_at: now,
      next_touch_at: null,
      created_at: now,
      updated_at: now
    },
    {
      id: randomUUID(),
      external_id: `apollo-${randomUUID()}`,
      provider: 'apollo',
      business_id: DEMO_BUSINESS_ID,
      first_name: 'Morgan',
      last_name: 'Patel',
      email: 'morgan.patel@example.com',
      phone: '+1 555 120 3003',
      company_name: 'Central Texas Schools',
      job_title: 'Facilities Supervisor',
      industry: 'Education',
      city: 'San Marcos',
      state: 'TX',
      country: 'USA',
      status: 'new',
      score: 74,
      tags: ['institutional'],
      sequence_status: 'not_started',
      last_outreach_at: null,
      next_touch_at: null,
      created_at: now,
      updated_at: now
    }
  ]

  const { error } = await supabase.from('prospects').insert(sampleProspects)
  if (error) {
    console.error('✖ Failed to seed prospects', error)
    process.exit(1)
  }

  console.log('✔ Seeded demo prospects')
}

async function seedOutreach() {
  const { data: existingTemplate } = await supabase
    .from('outreach_templates')
    .select('id')
    .eq('business_id', DEMO_BUSINESS_ID)
    .maybeSingle()

  if (existingTemplate) {
    console.log('ℹ Outreach templates already exist')
    return
  }

  const emailTemplateId = randomUUID()
  const smsTemplateId = randomUUID()

  const { error: templateError } = await supabase.from('outreach_templates').insert([
    {
      id: emailTemplateId,
      business_id: DEMO_BUSINESS_ID,
      created_by: null,
      name: 'Intro email',
      channel: 'email',
      subject: 'Quick idea for {{company}}',
      body: `Hey {{first_name}},

We help teams like {{company}} keep HVAC performance perfect year round (without the scramble or weekend call-outs).

Would a quick intro call be worth it to see if we can offload your maintenance queue?`,
      compliance_footer: 'Reply STOP to opt out; HELP for help.',
      is_active: true,
      is_default: true,
      metadata: {}
    },
    {
      id: smsTemplateId,
      business_id: DEMO_BUSINESS_ID,
      created_by: null,
      name: 'Day 2 SMS',
      channel: 'sms',
      body: `Hey {{first_name}}, it’s the CloudGreet team. We helped replace 120+ units in Austin last season without downtime. Want the playbook?`,
      compliance_footer: 'Reply STOP to opt out; HELP for help.',
      is_active: true,
      is_default: false,
      metadata: {}
    }
  ])

  if (templateError) {
    console.error('✖ Failed to seed outreach templates', templateError)
    process.exit(1)
  }

  const sequenceId = randomUUID()

  const { error: sequenceError } = await supabase.from('outreach_sequences').insert({
    id: sequenceId,
    business_id: DEMO_BUSINESS_ID,
    created_by: null,
    name: 'Demo HVAC Owners',
    description: 'Three-touch cadence used in demos',
    throttle_per_day: 150,
    send_window_start: '09:00',
    send_window_end: '17:00',
    timezone: 'America/Chicago',
    status: 'active',
    auto_pause_on_reply: true,
    config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  if (sequenceError) {
    console.error('✖ Failed to seed outreach sequence', sequenceError)
    process.exit(1)
  }

  const { error: stepsError } = await supabase.from('outreach_steps').insert([
    {
      id: randomUUID(),
      sequence_id: sequenceId,
      step_order: 1,
      channel: 'email',
      wait_minutes: 0,
      template_id: emailTemplateId,
      metadata: {}
    },
    {
      id: randomUUID(),
      sequence_id: sequenceId,
      step_order: 2,
      channel: 'sms',
      wait_minutes: 1440,
      template_id: smsTemplateId,
      metadata: {}
    },
    {
      id: randomUUID(),
      sequence_id: sequenceId,
      step_order: 3,
      channel: 'call',
      wait_minutes: 2880,
      template_id: null,
      metadata: {}
    }
  ])

  if (stepsError) {
    console.error('✖ Failed to seed outreach steps', stepsError)
    process.exit(1)
  }

  console.log('✔ Seeded outreach templates & sequence')
}

async function seedSalesData(repId) {
  const now = new Date()
  const past = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const future = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

  const { error: activitiesError } = await supabase.from('sales_activities').insert([
    {
      id: randomUUID(),
      business_id: DEMO_BUSINESS_ID,
      prospect_id: null, // updated with real prospect below once seeded
      user_id: repId,
      activity_type: 'call',
      direction: 'outbound',
      outcome: 'Reached facility supervisor, scheduling follow-up',
      notes: 'Needs proposal for 20 rooftop units, wants 72 hour response SLA.',
      logged_at: past,
      follow_up_at: future,
      metadata: {},
      created_at: past,
      updated_at: past
    }
  ])

  if (activitiesError) {
    console.error('✖ Failed to seed sales activities', activitiesError)
    process.exit(1)
  }

  // Link activities & tasks to first prospect
  const { data: demoProspect } = await supabase
    .from('prospects')
    .select('id')
    .eq('business_id', DEMO_BUSINESS_ID)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (demoProspect) {
    await supabase
      .from('sales_activities')
      .update({ prospect_id: demoProspect.id })
      .eq('business_id', DEMO_BUSINESS_ID)

    await supabase.from('sales_tasks').insert({
      id: randomUUID(),
      business_id: DEMO_BUSINESS_ID,
      prospect_id: demoProspect.id,
      assigned_to: repId,
      created_by: repId,
      task_type: 'follow_up',
      status: 'pending',
      priority: 'high',
      due_at: future,
      notes: 'Send maintenance program proposal to Jordan',
      created_at: past,
      updated_at: past
    })

    await supabase.from('sales_commissions').insert({
      id: randomUUID(),
      business_id: DEMO_BUSINESS_ID,
      rep_id: repId,
      prospect_id: demoProspect.id,
      amount: 450.0,
      status: 'pending',
      description: 'Expected commission for HVAC retrofit proposal',
      recorded_at: past,
      created_at: past,
      updated_at: past
    })
  }

  console.log('✔ Seeded sales activities, tasks, commissions')
}

async function main() {
  console.log('🚀 Seeding CloudGreet demo data')

  const ownerId = randomUUID()
  const repId = randomUUID()

  await seedBusiness(ownerId)
  await ensureUser(ownerId, OWNER_EMAIL, OWNER_PASSWORD, 'owner', DEMO_BUSINESS_ID, {
    first_name: 'Alex',
    last_name: 'Rivera'
  })

  await ensureUser(repId, EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD, 'sales', DEMO_BUSINESS_ID, {
    first_name: 'Jamie',
    last_name: 'Chen'
  })

  await seedProspects()
  await seedOutreach()
  await seedSalesData(repId)

  console.log('\n✅ Demo data seeded successfully')
  console.log('   Owner credentials:', OWNER_EMAIL, `(${OWNER_PASSWORD})`)
  console.log('   Sales rep credentials:', EMPLOYEE_EMAIL, `(${EMPLOYEE_PASSWORD})`)
  console.log('   Business ID:', DEMO_BUSINESS_ID)
}

main().catch((error) => {
  console.error('✖ Demo seed failed', error)
  process.exit(1)
})


