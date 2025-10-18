/**
 * Professional Email Templates for Client Acquisition
 * Optimized for different business types with personalization
 */

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  businessType: string[]
  variables: string[]
  followUpDays: number
  priority: 'high' | 'medium' | 'low'
}

export const emailTemplates: EmailTemplate[] = [
  // HVAC Templates
  {
    id: 'hvac_initial',
    name: 'HVAC Initial Outreach',
    subject: 'AI Receptionist for {business_name} - Never Miss Another Call',
    body: `Hi {owner_name},

I noticed {business_name} is a {business_type} company in {city}, {state}. 

I have an AI receptionist that can help you:
• Answer calls 24/7 (even when you're on jobs)
• Schedule appointments automatically
• Qualify leads and take messages
• Never miss another potential customer

Last month, I helped a local HVAC company recover $12,000 in lost revenue from missed calls.

Would you be interested in a 15-minute demo to see how it works?

Best regards,
{your_name}

P.S. This is completely free to try for 30 days - no risk, no commitment.`,
    businessType: ['HVAC', 'Heating', 'Cooling', 'Air Conditioning'],
    variables: ['owner_name', 'business_name', 'business_type', 'city', 'state', 'your_name'],
    followUpDays: 3,
    priority: 'high'
  },

  {
    id: 'hvac_follow_up',
    name: 'HVAC Follow-up',
    subject: 'Quick follow-up - AI Receptionist for {business_name}',
    body: `Hi {owner_name},

Following up on my AI receptionist offer for {business_name}.

I understand you're busy, but this could literally save you thousands in lost revenue.

Quick question: How many calls do you think you miss each week?

Most HVAC companies miss 5-10 calls per week. At $500 per job, that's $2,500-5,000 in lost revenue monthly.

My AI receptionist would have caught every single one of those calls.

Still interested in a quick 15-minute demo?

{your_name}`,
    businessType: ['HVAC', 'Heating', 'Cooling', 'Air Conditioning'],
    variables: ['owner_name', 'business_name', 'your_name'],
    followUpDays: 7,
    priority: 'high'
  },

  // Plumbing Templates
  {
    id: 'plumbing_initial',
    name: 'Plumbing Initial Outreach',
    subject: 'Emergency calls never sleep - but your AI receptionist can',
    body: `Hi {owner_name},

I saw {business_name} provides {business_type} services in {city}, {state}.

Emergency calls don't wait for business hours. But what if you had an AI receptionist that could:
• Answer emergency calls 24/7
• Schedule urgent appointments immediately
• Take detailed service requests
• Never miss an emergency call

Last month, I helped a local plumbing company capture 8 emergency calls they would have missed - that's $4,000+ in additional revenue.

Would you like to see how this works for your business?

{your_name}

P.S. 30-day free trial - no setup fees, no contracts.`,
    businessType: ['Plumbing', 'Emergency Plumbing', 'Pipe Repair'],
    variables: ['owner_name', 'business_name', 'business_type', 'city', 'state', 'your_name'],
    followUpDays: 2,
    priority: 'high'
  },

  // Roofing Templates
  {
    id: 'roofing_initial',
    name: 'Roofing Initial Outreach',
    subject: 'Storm season is coming - don\'t miss those insurance calls',
    body: `Hi {owner_name},

I noticed {business_name} does {business_type} work in {city}, {state}.

Storm season is approaching, and insurance companies are already calling contractors for estimates.

What if you had an AI receptionist that could:
• Answer insurance calls 24/7
• Schedule estimates automatically
• Qualify leads and take detailed information
• Never miss a high-value insurance job

Last storm season, I helped a local roofing company capture 15 insurance jobs they would have missed - that's $75,000+ in additional revenue.

Would you be interested in a quick demo?

{your_name}

P.S. Free 30-day trial - perfect timing for storm season preparation.`,
    businessType: ['Roofing', 'Roof Repair', 'Storm Damage'],
    variables: ['owner_name', 'business_name', 'business_type', 'city', 'state', 'your_name'],
    followUpDays: 1,
    priority: 'high'
  },

  // General Service Business
  {
    id: 'general_initial',
    name: 'General Service Business Outreach',
    subject: 'AI Receptionist for {business_name} - Never Miss Another Customer',
    body: `Hi {owner_name},

I noticed {business_name} provides {business_type} services in {city}, {state}.

I have an AI receptionist that can help you:
• Answer calls 24/7 (even when you're busy)
• Schedule appointments automatically
• Qualify leads and take messages
• Never miss another potential customer

Most service businesses miss 20-30% of their calls. That's thousands in lost revenue every month.

Would you be interested in a 15-minute demo?

{your_name}

P.S. 30-day free trial - no risk, no commitment.`,
    businessType: ['General Services', 'Contractor', 'Service Business'],
    variables: ['owner_name', 'business_name', 'business_type', 'city', 'state', 'your_name'],
    followUpDays: 3,
    priority: 'medium'
  },

  // Demo Invite Template
  {
    id: 'demo_invite',
    name: 'Demo Invitation',
    subject: '15-minute AI Receptionist Demo - {business_name}',
    body: `Hi {owner_name},

Thanks for your interest in the AI receptionist for {business_name}.

I'd love to show you exactly how it works with a quick 15-minute demo.

During the demo, I'll:
• Show you the AI in action
• Set up a test call to your business
• Explain how it can save you time and money
• Answer any questions you have

Available times this week:
• Tuesday 2-4 PM
• Wednesday 10 AM-12 PM
• Thursday 2-4 PM
• Friday 10 AM-12 PM

Just reply with your preferred time, or call me at {your_phone}.

Looking forward to showing you how this can help {business_name}!

{your_name}`,
    businessType: ['All'],
    variables: ['owner_name', 'business_name', 'your_phone', 'your_name'],
    followUpDays: 1,
    priority: 'high'
  },

  // Final Offer Template
  {
    id: 'final_offer',
    name: 'Final Offer',
    subject: 'Last chance - AI Receptionist for {business_name}',
    body: `Hi {owner_name},

This is my final follow-up about the AI receptionist for {business_name}.

I understand you're busy, but I don't want you to miss out on this opportunity.

Here's what I'm offering:
• 30-day free trial
• No setup fees
• No contracts
• Full support and training
• Your own dedicated AI receptionist

If you're not interested, just let me know and I'll stop following up.

But if you want to never miss another call and potentially recover thousands in lost revenue, reply with "YES" and I'll get you set up today.

{your_name}

P.S. This offer expires in 48 hours.`,
    businessType: ['All'],
    variables: ['owner_name', 'business_name', 'your_name'],
    followUpDays: 0,
    priority: 'high'
  }
]

export function getTemplateById(id: string): EmailTemplate | undefined {
  return emailTemplates.find(template => template.id === id)
}

export function getTemplatesByBusinessType(businessType: string): EmailTemplate[] {
  return emailTemplates.filter(template => 
    template.businessType.includes(businessType) || 
    template.businessType.includes('All')
  )
}

export function personalizeTemplate(template: EmailTemplate, variables: Record<string, string>): { subject: string; body: string } {
  let subject = template.subject
  let body = template.body

  // Replace variables in subject and body
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`
    subject = subject.replace(new RegExp(placeholder, 'g'), value)
    body = body.replace(new RegExp(placeholder, 'g'), value)
  })

  return { subject, body }
}

export function getNextTemplateInSequence(currentTemplateId: string, businessType: string): EmailTemplate | null {
  const templates = getTemplatesByBusinessType(businessType)
  const currentIndex = templates.findIndex(t => t.id === currentTemplateId)
  
  if (currentIndex === -1 || currentIndex === templates.length - 1) {
    return null // No more templates in sequence
  }
  
  return templates[currentIndex + 1]
}

