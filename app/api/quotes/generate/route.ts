import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { z } from 'zod'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const jobDetailsSchema = z.object({
  service_type: z.enum(['hvac', 'roofing', 'painting']),
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().min(1, 'Customer phone is required'),
  customer_email: z.string().email('Invalid email').optional(),
  job_details: z.object({
    square_footage: z.number().min(1, 'Square footage is required').optional(),
    system_type: z.string().optional(),
    issue_description: z.string().min(1, 'Issue description is required'),
    urgency: z.enum(['low', 'medium', 'high', 'emergency']).default('medium'),
    location: z.string().optional(),
    additional_notes: z.string().optional()
  }),
  business_id: z.string().min(1, 'Business ID is required')
})

export async function POST(request: NextRequest) {
  try {
    // AUTH CHECK: Verify business access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    const jwt = (await import('jsonwebtoken')).default
    const decoded = jwt.verify(token, jwtSecret) as any
    const userBusinessId = decoded.businessId
    
    if (!userBusinessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const body = await request.json()
    const validatedData = jobDetailsSchema.parse(body)
    
    // Verify user owns this business
    if (userBusinessId !== validatedData.business_id) {
      return NextResponse.json({ error: 'Unauthorized - Access denied' }, { status: 403 })
    }

    // Get pricing rules for this service type
    const { data: pricingRules, error: rulesError } = await supabaseAdmin
      .from('pricing_rules')
      .select('*')
      .eq('business_id', validatedData.business_id)
      .eq('service_type', validatedData.service_type)
      .eq('is_active', true)

    if (rulesError) {
      logger.error('Error fetching pricing rules', { 
        error: rulesError,  
        businessId: validatedData.business_id,
        serviceType: validatedData.service_type
      })
      return NextResponse.json({ error: 'Failed to fetch pricing rules' }, { status: 500 })
    }

    // Calculate estimate using pricing rules
    const estimate = calculateEstimate(validatedData.job_details, pricingRules || [])

    // Generate detailed quote using AI
    const aiQuote = await generateAIQuote(validatedData, estimate, pricingRules || [])

    // Save quote to database
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .insert({
        business_id: validatedData.business_id,
        customer_name: validatedData.customer_name,
        customer_phone: validatedData.customer_phone,
        customer_email: validatedData.customer_email,
        service_type: validatedData.service_type,
        job_details: validatedData.job_details,
        estimated_price: estimate.totalPrice,
        pricing_breakdown: estimate.breakdown,
        ai_generated_description: aiQuote.description,
        ai_recommendations: aiQuote.recommendations,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (quoteError) {
      logger.error('Error saving quote', { 
        error: quoteError,  
        businessId: validatedData.business_id,
        customerPhone: validatedData.customer_phone
      })
      return NextResponse.json({ error: 'Failed to save quote' }, { status: 500 })
    }

    // Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'quote_generated',
        details: {
          business_id: validatedData.business_id,
          quote_id: quote.id,
          service_type: validatedData.service_type,
          estimated_price: estimate.totalPrice,
          customer_phone: validatedData.customer_phone
        },
        business_id: validatedData.business_id,
        created_at: new Date().toISOString()
      })

    logger.info('Quote generated successfully', {
      businessId: validatedData.business_id,
      quoteId: quote.id,
      serviceType: validatedData.service_type,
      estimatedPrice: estimate.totalPrice
    })

    return NextResponse.json({
      quote: {
        ...quote,
        ai_description: aiQuote.description,
        ai_recommendations: aiQuote.recommendations
      },
      estimate
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    logger.error('Quote generation API error', { 
      error: error instanceof Error ? error.message : 'Unknown error',  
      endpoint: 'quotes/generate',
      method: 'POST'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateEstimate(jobDetails: any, pricingRules: any[]) {
  let totalPrice = 0
  const breakdown: any[] = []

  for (const rule of pricingRules) {
    let rulePrice = rule.base_price || 0

    // Apply unit pricing if applicable
    if (rule.unit_type === 'per_sqft' && jobDetails.square_footage) {
      rulePrice = (rule.unit_price || 0) * jobDetails.square_footage
    } else if (rule.unit_type === 'per_hour') {
      // Default to 2 hours for most jobs
      const hours = jobDetails.urgency === 'emergency' ? 4 : 
                   jobDetails.urgency === 'high' ? 3 : 2
      rulePrice = (rule.unit_price || 0) * hours
    }

    // Apply conditions and multipliers
    if (rule.conditions) {
      for (const condition of rule.conditions) {
        if (evaluateCondition(jobDetails, condition)) {
          if (condition.multiplier) {
            rulePrice *= condition.multiplier
          }
        }
      }
    }

    // Apply min/max constraints
    if (rule.min_price && rulePrice < rule.min_price) {
      rulePrice = rule.min_price
    }
    if (rule.max_price && rulePrice > rule.max_price) {
      rulePrice = rule.max_price
    }

    if (rulePrice > 0) {
      totalPrice += rulePrice
      breakdown.push({
        rule_name: rule.name,
        description: rule.description,
        price: rulePrice,
        unit_type: rule.unit_type
      })
    }
  }

  // Add urgency multiplier
  const urgencyMultiplier = {
    low: 0.9,
    medium: 1.0,
    high: 1.2,
    emergency: 1.5
  }[jobDetails.urgency] || 1.0

  totalPrice *= urgencyMultiplier

  return {
    totalPrice: Math.round(totalPrice),
    breakdown,
    urgencyMultiplier
  }
}

function evaluateCondition(jobDetails: any, condition: any): boolean {
  const value = jobDetails[condition.field]
  
  switch (condition.operator) {
    case 'equals':
      return value === condition.value
    case 'greater_than':
      return parseFloat(value) > parseFloat(condition.value)
    case 'less_than':
      return parseFloat(value) < parseFloat(condition.value)
    case 'contains':
      return value && value.toLowerCase().includes(condition.value.toLowerCase())
    default:
      return false
  }
}

async function generateAIQuote(jobDetails: any, estimate: any, pricingRules: any[]) {
  try {
    const prompt = `You are a professional AI receptionist for a service business. Generate a detailed quote description and recommendations based on the following job details:

Service Type: ${jobDetails.service_type}
Customer: ${jobDetails.customer_name}
Issue: ${jobDetails.job_details.issue_description}
Square Footage: ${jobDetails.job_details.square_footage || 'Not specified'}
Urgency: ${jobDetails.job_details.urgency}
Location: ${jobDetails.job_details.location || 'Not specified'}
Additional Notes: ${jobDetails.job_details.additional_notes || 'None'}

Estimated Price: $${estimate.totalPrice}

Pricing Rules Applied:
${estimate.breakdown.map((item: any) => `- ${item.rule_name}: $${item.price}`).join('\n')}

Please provide:
1. A professional, detailed description of the work to be performed
2. Specific recommendations for the customer
3. Timeline expectations
4. Any additional services that might be beneficial

Keep the tone professional but friendly, and be specific about what the estimate includes.`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional AI receptionist for service businesses (HVAC, roofing, painting). Generate detailed, professional quotes that build trust and clearly explain the work to be performed."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    })

    const response = completion.choices[0]?.message?.content || ''
    
    // Split response into description and recommendations
    const parts = response.split('\n\n')
    const description = parts[0] || response
    const recommendations = parts.slice(1).join('\n\n') || 'Please contact us for personalized recommendations.'

    return {
      description: description.trim(),
      recommendations: recommendations.trim()
    }

  } catch (error) {
    logger.error('AI quote generation error', { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      serviceType: jobDetails.service_type,
      customerPhone: jobDetails.customer_phone
    })
    // Fallback to generic response
    return {
      description: `Based on the information provided, we can perform ${jobDetails.service_type} services for your property. Our estimate includes professional service and quality materials.`,
      recommendations: 'We recommend scheduling a consultation to discuss your specific needs and provide a more detailed assessment.'
    }
  }
}
