import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Dynamic email template automation
export async function POST(request: NextRequest) {
  try {
    // AUTH CHECK: Verify business access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    const decoded = jwt.verify(token, jwtSecret) as any
    const businessId = decoded.businessId
    
    if (!businessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const { leadData, templateType, personalizationLevel } = await request.json()
      
      if (!leadData) {
      return NextResponse.json({
          success: false,
          error: 'Lead data required'
      }, { status: 400 })
      }

      // Generate dynamic email template
    const emailTemplate = await generateDynamicEmailTemplate({
      leadData,
      templateType: templateType || 'initial_contact',
      personalizationLevel: personalizationLevel || 'high'
    })

    return NextResponse.json({
        success: true,
        data: {
          subject: emailTemplate.subject,
          html_content: emailTemplate.htmlContent,
          text_content: emailTemplate.textContent,
          personalization_data: emailTemplate.personalizationData,
          template_metadata: emailTemplate.metadata
        }
      })

    } catch (error) {
    logger.error('Email template generation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'automation/email-templates'
    })
    return NextResponse.json({
        success: false,
        error: 'Email template generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function generateDynamicEmailTemplate(params: {
  leadData: any
  templateType: string
  personalizationLevel: string
}) {
  const { leadData, templateType, personalizationLevel } = params
  
  // Get template base
  const templateBase = getTemplateBase(templateType)
  
  // Generate personalization data
  const personalizationData = await generatePersonalizationData(leadData, personalizationLevel)
  
  // Create dynamic content
  const dynamicContent = await createDynamicContent(leadData, templateType, personalizationData)
  
  // Generate final email
  const emailTemplate = {
    subject: generateDynamicSubject(leadData, templateType, personalizationData),
    htmlContent: generateHTMLContent(templateBase, dynamicContent, personalizationData),
    textContent: generateTextContent(templateBase, dynamicContent, personalizationData),
    personalizationData,
    metadata: {
      templateType,
      personalizationLevel,
      generatedAt: new Date().toISOString(),
      leadScore: leadData.ai_score || 0,
      businessType: leadData.business_type,
      location: leadData.location
    }
  }

  return emailTemplate
}

function getTemplateBase(templateType: string) {
  const templates = {
    initial_contact: {
      structure: 'greeting + value_prop + social_proof + cta',
      tone: 'professional_friendly',
      length: 'medium'
    },
    follow_up_1: {
      structure: 'reference_previous + new_value + urgency + cta',
      tone: 'conversational',
      length: 'short'
    },
    follow_up_2: {
      structure: 'check_in + case_study + objection_handling + cta',
      tone: 'helpful',
      length: 'medium'
    },
    demo_follow_up: {
      structure: 'thank_you + next_steps + value_reinforcement + cta',
      tone: 'professional',
      length: 'short'
    },
    re_engagement: {
      structure: 'new_angle + industry_insights + special_offer + cta',
      tone: 'value_focused',
      length: 'medium'
    },
    closing: {
      structure: 'final_value + urgency + guarantee + cta',
      tone: 'confident',
      length: 'short'
    }
  }
  
  return templates[templateType as keyof typeof templates] || templates.initial_contact
}

async function generatePersonalizationData(leadData: any, personalizationLevel: string) {
  const baseData = {
    business_name: leadData.business_name || leadData.name,
    contact_name: leadData.contact_name || leadData.name,
    business_type: leadData.business_type,
    location: leadData.location,
    rating: leadData.rating,
    review_count: leadData.review_count,
    estimated_revenue: leadData.estimated_revenue
  }

  if (personalizationLevel === 'high') {
    return {
      ...baseData,
      industry_insights: getIndustryInsights(leadData.business_type),
      local_market_data: getLocalMarketData(leadData.location, leadData.business_type),
      competitive_advantages: getCompetitiveAdvantages(leadData),
      pain_points: getPainPoints(leadData.business_type),
      success_metrics: getSuccessMetrics(leadData.business_type),
      roi_calculation: calculateROI(leadData),
      case_study: getRelevantCaseStudy(leadData.business_type),
      urgency_factors: getUrgencyFactors(leadData.business_type),
      objection_handling: getObjectionHandling(leadData.business_type)
    }
  }

  return baseData
}

async function createDynamicContent(leadData: any, templateType: string, personalizationData: any) {
  return {
    greeting: generateGreeting(personalizationData),
    value_proposition: generateValueProposition(leadData, personalizationData),
    social_proof: generateSocialProof(leadData, personalizationData),
    industry_insights: generateIndustryInsights(personalizationData),
    local_relevance: generateLocalRelevance(personalizationData),
    case_study: generateCaseStudy(personalizationData),
    roi_projection: generateROIProjection(personalizationData),
    urgency: generateUrgency(templateType, personalizationData),
    objection_handling: generateObjectionHandling(personalizationData),
    call_to_action: generateCallToAction(templateType, personalizationData)
  }
}

function generateDynamicSubject(leadData: any, templateType: string, personalizationData: any): string {
  const businessName = personalizationData.business_name
  const businessType = personalizationData.business_type
  
  const subjects = {
    initial_contact: [
      `Never Miss Another Call - AI Receptionist for ${businessName}`,
      `Increase Revenue for ${businessName} - AI Customer Service`,
      `Stop Missing Customers - AI Solution for ${businessType} Businesses`,
      `${businessName}: Professional 24/7 Customer Service`
    ],
    follow_up_1: [
      `Quick question about ${businessName}'s customer service`,
      `Following up on AI receptionist for ${businessName}`,
      `Did you see this about ${businessName}?`,
      `One more thing about ${businessName}'s growth...`
    ],
    follow_up_2: [
      `${businessName}: How competitors are growing revenue`,
      `Case study: ${businessType} business increased bookings 60%`,
      `${businessName}: The customer service advantage`,
      `Why ${businessName} needs AI customer service`
    ],
    demo_follow_up: [
      `Thank you for your interest, ${businessName}`,
      `Next steps for ${businessName}'s AI receptionist`,
      `Demo confirmed - ${businessName} growth plan`,
      `Ready to transform ${businessName}'s customer service?`
    ],
    re_engagement: [
      `New opportunity for ${businessName}`,
      `${businessName}: Industry insights you'll want to see`,
      `Special offer for ${businessType} businesses like ${businessName}`,
      `Last chance: AI receptionist for ${businessName}`
    ],
    closing: [
      `Final offer: AI receptionist for ${businessName}`,
      `${businessName}: Don't miss this opportunity`,
      `Last chance to transform ${businessName}'s customer service`,
      `Final proposal: ${businessName} growth plan`
    ]
  }
  
  const templateSubjects = subjects[templateType as keyof typeof subjects] || subjects.initial_contact
  return templateSubjects[Math.floor(Math.random() * templateSubjects.length)]
}

function generateHTMLContent(templateBase: any, dynamicContent: any, personalizationData: any): string {
  const businessName = personalizationData.business_name
  const contactName = personalizationData.contact_name
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Receptionist for ${businessName}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
        .cta { background: #28a745; color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 30px 0; }
        .cta a { color: white; text-decoration: none; font-weight: bold; font-size: 18px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat { text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #667eea; }
        .stat-label { font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Transform ${businessName}'s Customer Service</h1>
        <p>Professional AI Receptionist • 24/7 Availability • Never Miss a Call</p>
    </div>
    
    <div class="content">
        <p>Hi ${contactName},</p>
        
        <p>${dynamicContent.greeting}</p>
        
        <p>${dynamicContent.value_proposition}</p>
        
        <div class="highlight">
            <strong>${dynamicContent.industry_insights}</strong>
        </div>
        
        <p>${dynamicContent.local_relevance}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-number">40-60%</div>
                <div class="stat-label">Increase in Bookings</div>
            </div>
            <div class="stat">
                <div class="stat-number">24/7</div>
                <div class="stat-label">Availability</div>
            </div>
            <div class="stat-number">$${Math.round((personalizationData.estimated_revenue || 250000) * 0.4 / 12).toLocaleString()}</div>
                <div class="stat-label">Monthly Revenue Increase</div>
            </div>
        </div>
        
        <p>${dynamicContent.case_study}</p>
        
        <p>${dynamicContent.roi_projection}</p>
        
        ${dynamicContent.urgency ? `<p><strong>${dynamicContent.urgency}</strong></p>` : ''}
        
        ${dynamicContent.objection_handling ? `<p>${dynamicContent.objection_handling}</p>` : ''}
    </div>
    
    <div class="cta">
        <a href="mailto:demo@cloudgreet.com?subject=Demo Request for ${businessName}">Schedule Your Free Demo</a>
    </div>
    
    <div class="footer">
        <p>CloudGreet AI • Professional AI Receptionist Solutions</p>
        <p>This email was sent to ${personalizationData.business_name} because we believe our AI receptionist can help grow your business.</p>
        <p>Reply STOP to unsubscribe | <a href="https://cloudgreet.com/privacy">Privacy Policy</a></p>
    </div>
</body>
</html>
  `.trim()
}

function generateTextContent(templateBase: any, dynamicContent: any, personalizationData: any): string {
  const businessName = personalizationData.business_name
  const contactName = personalizationData.contact_name
  
  return `
Transform ${businessName}'s Customer Service
Professional AI Receptionist • 24/7 Availability • Never Miss a Call

Hi ${contactName},

${dynamicContent.greeting}

${dynamicContent.value_proposition}

${dynamicContent.industry_insights}

${dynamicContent.local_relevance}

Key Benefits:
• 40-60% Increase in Bookings
• 24/7 Professional Availability
• $${Math.round((personalizationData.estimated_revenue || 250000) * 0.4 / 12).toLocaleString()} Monthly Revenue Increase

${dynamicContent.case_study}

${dynamicContent.roi_projection}

${dynamicContent.urgency ? dynamicContent.urgency : ''}

${dynamicContent.objection_handling ? dynamicContent.objection_handling : ''}

Schedule Your Free Demo: demo@cloudgreet.com

CloudGreet AI • Professional AI Receptionist Solutions
This email was sent to ${personalizationData.business_name} because we believe our AI receptionist can help grow your business.
Reply STOP to unsubscribe | Privacy Policy: https://cloudgreet.com/privacy
  `.trim()
}

// Content generation functions
function generateGreeting(personalizationData: any): string {
  const businessName = personalizationData.business_name
  const rating = personalizationData.rating
  
  const greetings = [
    `I noticed ${businessName} has excellent reviews (${rating}/5 stars) and I have a solution that could help you capture even more customers.`,
    `Congratulations on ${businessName}'s ${rating}-star rating! I have a way to help you turn even more prospects into customers.`,
    `${businessName} clearly delivers great service. I'd like to show you how to capture even more customers with AI.`,
    `Your ${rating}-star rating shows ${businessName} knows how to satisfy customers. Here's how to capture more of them.`
  ]
  
  return greetings[Math.floor(Math.random() * greetings.length)]
}

function generateValueProposition(leadData: any, personalizationData: any): string {
  const businessType = personalizationData.business_type
  
  const valueProps = {
    'HVAC': `Our AI receptionist answers every call 24/7, qualifies leads automatically, and books service appointments directly in your calendar. This means you'll never miss a potential customer again, even during busy seasons.`,
    'Painting': `Our AI receptionist captures every inquiry, schedules estimates, and follows up with prospects automatically. This means you'll never miss a painting job opportunity again.`,
    'Roofing': `Our AI receptionist handles every call professionally, schedules inspections, and manages your lead pipeline automatically. This means you'll never miss a roofing project again.`,
    'Plumbing': `Our AI receptionist answers emergency calls instantly, schedules service appointments, and manages your customer requests 24/7. This means you'll never miss a plumbing job again.`,
    'Electrical': `Our AI receptionist handles every inquiry professionally, schedules estimates, and manages your project pipeline automatically. This means you'll never miss an electrical job again.`,
    'Landscaping': `Our AI receptionist captures every inquiry, schedules consultations, and manages your seasonal workload automatically. This means you'll never miss a landscaping project again.`,
    'Cleaning': `Our AI receptionist handles every call professionally, schedules services, and manages your customer requests 24/7. This means you'll never miss a cleaning job again.`
  }
  
  return valueProps[businessType as keyof typeof valueProps] || 
    `Our AI receptionist answers every call 24/7, qualifies leads automatically, and books appointments directly in your calendar. This means you'll never miss a potential customer again.`
}

function generateSocialProof(leadData: any, personalizationData: any): string {
  const businessType = personalizationData.business_type
  
  const socialProofs = {
    'HVAC': `Many HVAC businesses like yours see a 40-60% increase in bookings within the first month. ABC HVAC in your area increased their monthly revenue by $15,000 after implementing our AI receptionist.`,
    'Painting': `Many painting contractors see a 50-70% increase in estimate requests within the first month. Premier Painting in your area doubled their bookings after implementing our AI receptionist.`,
    'Roofing': `Many roofing contractors see a 45-65% increase in project inquiries within the first month. Reliable Roofing in your area increased their revenue by $25,000 after implementing our AI receptionist.`,
    'Plumbing': `Many plumbing businesses see a 60-80% increase in service calls within the first month. Elite Plumbing in your area increased their monthly revenue by $12,000 after implementing our AI receptionist.`,
    'Electrical': `Many electrical contractors see a 50-70% increase in project requests within the first month. Pro Electric in your area doubled their bookings after implementing our AI receptionist.`,
    'Landscaping': `Many landscaping businesses see a 40-60% increase in consultations within the first month. Green Thumb Landscaping in your area increased their revenue by $18,000 after implementing our AI receptionist.`,
    'Cleaning': `Many cleaning businesses see a 55-75% increase in service requests within the first month. Spotless Cleaning in your area doubled their bookings after implementing our AI receptionist.`
  }
  
  return socialProofs[businessType as keyof typeof socialProofs] || 
    `Many businesses like yours see a 40-60% increase in bookings within the first month. Similar businesses in your area have increased their monthly revenue by $10,000-$20,000 after implementing our AI receptionist.`
}

function generateIndustryInsights(personalizationData: any): string {
  const businessType = personalizationData.business_type
  
  const insights = {
    'HVAC': `The HVAC industry loses an average of 30% of potential customers due to missed calls and poor follow-up. AI receptionists are becoming essential for competitive advantage.`,
    'Painting': `The painting industry loses an average of 25% of potential customers due to missed calls and delayed responses. AI receptionists help capture every opportunity.`,
    'Roofing': `The roofing industry loses an average of 35% of potential customers due to missed calls and poor lead management. AI receptionists are revolutionizing customer capture.`,
    'Plumbing': `The plumbing industry loses an average of 40% of potential customers due to missed emergency calls and poor follow-up. AI receptionists provide 24/7 professional service.`,
    'Electrical': `The electrical industry loses an average of 30% of potential customers due to missed calls and delayed responses. AI receptionists help capture every project opportunity.`,
    'Landscaping': `The landscaping industry loses an average of 25% of potential customers due to missed calls and seasonal demand spikes. AI receptionists provide consistent customer service.`,
    'Cleaning': `The cleaning industry loses an average of 35% of potential customers due to missed calls and poor follow-up. AI receptionists ensure every inquiry is captured.`
  }
  
  return insights[businessType as keyof typeof insights] || 
    `The service industry loses an average of 30% of potential customers due to missed calls and poor follow-up. AI receptionists are becoming essential for competitive advantage.`
}

function generateLocalRelevance(personalizationData: any): string {
  const location = personalizationData.location
  const businessType = personalizationData.business_type
  
  return `In ${location}, ${businessType} businesses face unique challenges with customer service and lead management. Our AI receptionist is specifically designed to help local businesses like yours compete more effectively and capture more customers.`
}

function generateCaseStudy(personalizationData: any): string {
  const businessType = personalizationData.business_type
  
  const caseStudies = {
    'HVAC': `Case Study: ABC HVAC implemented our AI receptionist and saw a 65% increase in service bookings within 3 months. They went from missing 40% of calls to capturing 95% of inquiries, resulting in $18,000 additional monthly revenue.`,
    'Painting': `Case Study: Premier Painting implemented our AI receptionist and saw a 70% increase in estimate requests within 2 months. They went from missing 35% of calls to capturing 90% of inquiries, resulting in $15,000 additional monthly revenue.`,
    'Roofing': `Case Study: Reliable Roofing implemented our AI receptionist and saw a 60% increase in project inquiries within 4 months. They went from missing 45% of calls to capturing 95% of inquiries, resulting in $25,000 additional monthly revenue.`,
    'Plumbing': `Case Study: Elite Plumbing implemented our AI receptionist and saw a 75% increase in service calls within 2 months. They went from missing 50% of calls to capturing 98% of inquiries, resulting in $12,000 additional monthly revenue.`,
    'Electrical': `Case Study: Pro Electric implemented our AI receptionist and saw a 65% increase in project requests within 3 months. They went from missing 40% of calls to capturing 92% of inquiries, resulting in $20,000 additional monthly revenue.`,
    'Landscaping': `Case Study: Green Thumb Landscaping implemented our AI receptionist and saw a 55% increase in consultations within 3 months. They went from missing 30% of calls to capturing 88% of inquiries, resulting in $18,000 additional monthly revenue.`,
    'Cleaning': `Case Study: Spotless Cleaning implemented our AI receptionist and saw a 70% increase in service requests within 2 months. They went from missing 45% of calls to capturing 95% of inquiries, resulting in $14,000 additional monthly revenue.`
  }
  
  return caseStudies[businessType as keyof typeof caseStudies] || 
    `Case Study: A similar business implemented our AI receptionist and saw a 60% increase in bookings within 3 months. They went from missing 40% of calls to capturing 95% of inquiries, resulting in $15,000 additional monthly revenue.`
}

function generateROIProjection(personalizationData: any): string {
  const estimatedRevenue = personalizationData.estimated_revenue || 250000
  const monthlyIncrease = Math.round(estimatedRevenue * 0.4 / 12)
  const annualIncrease = Math.round(monthlyIncrease * 12)
  
  return `Based on your estimated annual revenue of $${estimatedRevenue.toLocaleString()}, our AI receptionist could generate an additional $${monthlyIncrease.toLocaleString()} per month ($${annualIncrease.toLocaleString()} annually). With our $200/month base fee plus $50 per booking, your net profit would be approximately $${Math.round(monthlyIncrease - 50)} per month.`
}

function generateUrgency(templateType: string, personalizationData: any): string {
  const urgencies = {
    initial_contact: '',
    follow_up_1: `This offer is only available for the next 7 days. Don't miss out on transforming your customer service.`,
    follow_up_2: `Limited time: We're offering a special setup discount for the next 5 days.`,
    demo_follow_up: `Your demo is scheduled - this is your opportunity to see the future of customer service.`,
    re_engagement: `Special offer expires in 3 days. This is your last chance to get started with our AI receptionist.`,
    closing: `Final offer: This pricing is only available for the next 48 hours. Don't miss this opportunity to transform your business.`
  }
  
  return urgencies[templateType as keyof typeof urgencies] || ''
}

function generateObjectionHandling(personalizationData: any): string {
  return `Common concerns we address:
• Cost: Our AI receptionist typically pays for itself within 30 days through increased bookings
• Technology: Our system is designed for easy use - no technical knowledge required
• Setup: We handle all setup and training - you'll be up and running in 2-4 weeks
• Support: We provide 24/7 support and ongoing optimization`
}

function generateCallToAction(templateType: string, personalizationData: any): string {
  const ctas = {
    initial_contact: `Would you be interested in a quick 10-minute demo to see exactly how this works for your business?`,
    follow_up_1: `Can we schedule a brief call to discuss how this could work for your business?`,
    follow_up_2: `Would you like to see a live demonstration of our AI receptionist?`,
    demo_follow_up: `Are you ready to move forward with implementing our AI receptionist?`,
    re_engagement: `Would you like to take advantage of our special offer and get started today?`,
    closing: `Are you ready to transform your customer service and start capturing more customers?`
  }
  
  return ctas[templateType as keyof typeof ctas] || ctas.initial_contact
}

// Helper functions for personalization data
function getIndustryInsights(businessType: string): string {
  return `The ${businessType} industry is rapidly adopting AI technology to improve customer service and increase revenue.`
}

function getLocalMarketData(location: string, businessType: string): string {
  return `The ${businessType} market in ${location} is competitive, with businesses using technology to gain an edge.`
}

function getCompetitiveAdvantages(leadData: any): string[] {
  const advantages = []
  if (leadData.rating >= 4.5) advantages.push('High customer satisfaction')
  if (leadData.review_count >= 100) advantages.push('Strong reputation')
  return advantages
}

function getPainPoints(businessType: string): string[] {
  const painPoints = {
    'HVAC': ['Missed emergency calls', 'Seasonal demand spikes', 'Customer service consistency'],
    'Painting': ['Estimate request management', 'Project scheduling', 'Customer follow-up'],
    'Roofing': ['Storm damage response', 'Project coordination', 'Customer communication'],
    'Plumbing': ['Emergency call handling', 'Service scheduling', 'Customer satisfaction'],
    'Electrical': ['Project inquiries', 'Safety compliance', 'Customer education'],
    'Landscaping': ['Seasonal demand', 'Weather dependency', 'Customer retention'],
    'Cleaning': ['Service scheduling', 'Customer communication', 'Quality consistency']
  }
  
  return painPoints[businessType as keyof typeof painPoints] || ['Customer service', 'Lead management', 'Revenue growth']
}

function getSuccessMetrics(businessType: string): string[] {
  return ['Increased bookings', 'Better customer satisfaction', 'Reduced missed calls', 'Higher revenue']
}

function calculateROI(leadData: any): string {
  const estimatedRevenue = leadData.estimated_revenue || 250000
  const monthlyIncrease = Math.round(estimatedRevenue * 0.4 / 12)
  return `$${monthlyIncrease.toLocaleString()} additional monthly revenue`
}

function getRelevantCaseStudy(businessType: string): string {
  return `A ${businessType} business similar to yours increased their monthly revenue by $15,000 after implementing our AI receptionist.`
}

function getUrgencyFactors(businessType: string): string[] {
  return ['Competitive advantage', 'Customer service improvement', 'Revenue growth opportunity']
}

function getObjectionHandling(businessType: string): string[] {
  return ['Cost concerns', 'Technology adoption', 'Implementation timeline', 'Support and training']
}
