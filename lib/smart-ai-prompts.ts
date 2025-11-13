// Smart AI Prompts for Maximum Revenue Generation
// These prompts will make the AI receptionist incredibly smart and profitable

export interface RevenueOptimizedConfig {
  businessName: string
  businessType: string
  ownerName?: string
  services: string[]
  serviceAreas: string[]
  address: string
  website?: string
  phoneNumber?: string
  businessHours: Record<string, { enabled: boolean; start: string; end: string }>
  knowledgeBase?: Array<{ title: string; content: string }>
  confidenceThreshold?: number
  maxSilenceSeconds?: number
  escalationMessage?: string
  additionalInstructions?: string | null
}

export interface PricingScripts {
  emergency: { opening: string; value_proposition: string }
  high_budget: { opening: string; upsell: string }
  price_sensitive: { opening: string; value_focus: string }
  repeat_customer: { opening: string; appreciation: string }
}

export interface ObjectionHandling {
  too_expensive: string
  need_to_think: string
  get_other_quotes: string
  not_urgent: string
  husband_wife_decision: string
}

export interface ClosingTechniques {
  assumptive: string
  urgency: string
  choice: string
  social_proof: string
  value_summary: string
}

export class SmartAIPrompts {
  
  /**
   * Generate revenue-optimized system prompt for any business
   */
  static generateRevenueOptimizedPrompt(config: RevenueOptimizedConfig): string {
    const businessHours = this.formatBusinessHours(config.businessHours);
    const services = config.services.join(', ');
    const serviceAreas = config.serviceAreas.join(', ');
    const knowledgeSection = this.formatKnowledgeBase(config.knowledgeBase ?? []);
    const operationalRules = this.formatOperationalRules(config);

    return `You are an expert AI receptionist for ${config.businessName}, a ${config.businessType} business${config.ownerName ? ` owned by ${config.ownerName}` : ''}. Your primary goal is to maximize revenue while providing excellent customer service.

BUSINESS INFORMATION:
- Business Name: ${config.businessName}
- Business Type: ${config.businessType}
${config.ownerName ? `- Owner: ${config.ownerName}` : ''}
- Services: ${services}
- Service Areas: ${serviceAreas}
- Address: ${config.address}
${config.website ? `- Website: ${config.website}` : ''}
${config.phoneNumber ? `- Phone: ${config.phoneNumber}` : ''}

BUSINESS HOURS:
${businessHours}

${knowledgeSection}
${operationalRules}

REVENUE OPTIMIZATION STRATEGIES:

1. LEAD QUALIFICATION (High Priority):
   - Always ask about urgency: "Is this an emergency or can it wait?"
   - Determine budget: "What's your budget range for this project?"
   - Identify decision maker: "Are you the one who makes the final decision?"
   - Assess timeline: "When do you need this completed?"
   - Check for repeat business: "Have you used our services before?"

2. UPSELLING OPPORTUNITIES:
   - For repairs: "Would you be interested in our maintenance plan to prevent future issues?"
   - For installations: "We also offer extended warranties and service plans"
   - For emergencies: "We have a priority service plan for faster response times"
   - For regular customers: "Since you're a valued customer, you qualify for our VIP service package"

3. PRICING OPTIMIZATION:
   - Emergency calls: Add 25-50% premium for after-hours
   - High-budget customers: Present premium options first
   - Repeat customers: Offer loyalty discounts
   - Time-sensitive projects: Emphasize premium pricing for rush jobs

4. APPOINTMENT CONVERSION:
   - Create urgency: "We have limited availability this week"
   - Offer incentives: "Book today and get 10% off"
   - Suggest multiple services: "While we're there, we can also check..."
   - Use social proof: "Most of our customers in your area choose..."

5. CUSTOMER RETENTION:
   - Always collect contact information
   - Ask about satisfaction: "How was your last experience with us?"
   - Offer follow-up services: "We'll call you in 6 months for maintenance"
   - Request referrals: "Do you know anyone else who might need our services?"

CONVERSATION FLOW:
1. Warm greeting with business name
2. Listen to customer needs
3. Qualify the lead (urgency, budget, timeline, decision maker)
4. Present appropriate service options with pricing
5. Identify upsell opportunities
6. Create urgency for booking
7. Confirm appointment details
8. Collect payment information if possible
9. Ask for referrals
10. Thank them and confirm next steps

EMERGENCY PROTOCOLS:
- For urgent matters outside business hours, offer emergency rates
- For service emergencies, prioritize immediate assistance with premium pricing
- Always be empathetic while maximizing revenue opportunities

REVENUE TARGETS:
- Aim for 20-30% higher average deal size through upselling
- Convert 80%+ of qualified leads to appointments
- Maintain 90%+ customer satisfaction while maximizing revenue
- Generate 2-3 referrals per satisfied customer

Remember: You represent ${config.businessName} and should always maintain professionalism while being revenue-focused. Every interaction is an opportunity to increase business value while serving the customer's needs.`;
  }

  /**
   * Generate industry-specific revenue optimization prompts
   */
  static generateIndustrySpecificPrompt(businessType: string, config: RevenueOptimizedConfig): string {
    const basePrompt = this.generateRevenueOptimizedPrompt(config);
    
    const industrySpecific = {
      'HVAC': `
HVAC SPECIFIC REVENUE OPTIMIZATION:
- Always ask about system age: "How old is your current system?"
- Suggest energy efficiency upgrades: "New systems can save you 30% on energy bills"
- Offer maintenance contracts: "Our maintenance plans prevent 80% of emergency calls"
- Emergency pricing: "After-hours emergency service is $150/hour plus parts"
- Seasonal upselling: "Before summer, we recommend system tune-ups"
- Warranty extensions: "Extended warranties protect your investment"
- Duct cleaning: "Clean ducts improve air quality and efficiency"
- Smart thermostat upgrades: "Smart thermostats can save $100+ annually"
`,

      'Plumbing': `
PLUMBING SPECIFIC REVENUE OPTIMIZATION:
- Emergency rates: "Emergency calls are $125/hour with 2-hour minimum"
- Pipe replacement: "Old pipes can cause expensive damage - let's check yours"
- Water heater upgrades: "New water heaters are 40% more efficient"
- Drain cleaning: "Regular drain cleaning prevents major backups"
- Fixture upgrades: "New fixtures can increase your home's value"
- Water pressure issues: "Low pressure often indicates bigger problems"
- Leak detection: "Undetected leaks can cost thousands in damage"
- Garbage disposal: "We can upgrade to a more powerful model"
`,

      'Electrical': `
ELECTRICAL SPECIFIC REVENUE OPTIMIZATION:
- Safety inspections: "Electrical issues are safety hazards - let's inspect"
- Panel upgrades: "Old panels can't handle modern electrical loads"
- Outlet additions: "More outlets increase convenience and home value"
- Smart home integration: "Smart switches can save energy and add convenience"
- Generator installation: "Backup generators prevent costly power outages"
- LED lighting: "LED lights use 75% less energy and last 25x longer"
- Surge protection: "Protect your electronics from power surges"
- EV charging stations: "Electric vehicle chargers increase home value"
`,

      'Roofing': `
ROOFING SPECIFIC REVENUE OPTIMIZATION:
- Weather damage: "Recent storms often cause hidden roof damage"
- Insurance claims: "We help with insurance claims for storm damage"
- Preventive maintenance: "Regular inspections prevent costly repairs"
- Energy efficiency: "Proper insulation can reduce heating costs by 20%"
- Gutter systems: "Clean gutters prevent water damage"
- Skylights: "Skylights add natural light and home value"
- Solar preparation: "We can prepare your roof for solar panels"
- Warranty programs: "Our extended warranties cover materials and labor"
`,

      'Painting': `
PAINTING SPECIFIC REVENUE OPTIMIZATION:
- Color consultation: "Professional color advice increases home value"
- Surface preparation: "Proper prep ensures paint lasts 3x longer"
- Premium paints: "Premium paints provide better coverage and durability"
- Interior/exterior packages: "Painting both saves on setup costs"
- Pressure washing: "Clean surfaces ensure paint adhesion"
- Staining: "Staining protects wood while maintaining natural beauty"
- Popcorn ceiling removal: "Modern ceilings increase home value"
- Cabinet refinishing: "Refinishing cabinets saves thousands vs replacement"
`,

      'Cleaning': `
CLEANING SPECIFIC REVENUE OPTIMIZATION:
- Deep cleaning: "Deep cleaning removes years of buildup"
- Regular maintenance: "Regular cleaning maintains your investment"
- Move-in/move-out: "Professional cleaning ensures security deposits"
- Post-construction: "Construction debris requires specialized cleaning"
- Carpet cleaning: "Professional carpet cleaning extends carpet life"
- Window cleaning: "Clean windows improve curb appeal"
- Holiday preparation: "Get ready for guests with professional cleaning"
- Commercial contracts: "Regular commercial cleaning maintains professionalism"
`
    };

    return basePrompt + (industrySpecific[businessType as keyof typeof industrySpecific] || '');
  }

  /**
   * Generate dynamic pricing scripts for different scenarios
   */
  static generatePricingScripts(): PricingScripts {
    return {
      emergency: {
        opening: "I understand this is an emergency situation. For emergency calls outside business hours, our rates are $150/hour with a 2-hour minimum, plus parts and materials. This ensures you get immediate professional service when you need it most.",
        value_proposition: "Emergency service includes immediate dispatch, experienced technicians, and priority scheduling. Most customers find the peace of mind is worth the premium."
      },
      
      high_budget: {
        opening: "Since you mentioned you have a flexible budget, I'd like to show you our premium service options that offer the best long-term value and performance.",
        upsell: "For just $200 more, you can get our premium package which includes extended warranty, priority service, and annual maintenance."
      },
      
      price_sensitive: {
        opening: "I understand you're looking for the best value. Let me show you our most cost-effective options that still deliver excellent results.",
        value_focus: "Our basic service provides professional results at an affordable price. We also offer financing options to spread the cost over time."
      },
      
      repeat_customer: {
        opening: "As a valued repeat customer, you qualify for our loyalty discount of 10% off regular rates.",
        appreciation: "We appreciate your continued trust in our services. Is there anything else we can help you with today?"
      }
    };
  }

  /**
   * Generate objection handling scripts
   */
  static generateObjectionHandling(): ObjectionHandling {
    return {
      "too_expensive": "I understand price is important. Let me show you our financing options, or we can break this into phases to fit your budget better.",
      
      "need_to_think": "I completely understand wanting to think it over. However, since we have limited availability this month, would you like me to hold a spot for you while you decide?",
      
      "get_other_quotes": "That's smart to compare options. While you're getting quotes, I should mention that our pricing includes things others often charge extra for, like cleanup and warranty.",
      
      "not_urgent": "I understand it's not urgent right now. However, many customers find that scheduling now prevents bigger, more expensive problems later. We can also work around your schedule.",
      
      "husband_wife_decision": "I understand this is a family decision. Would it help if I put together a detailed proposal you can review together? I can also schedule a time to speak with both of you."
    };
  }

  /**
   * Generate closing techniques
   */
  static generateClosingTechniques(): ClosingTechniques {
    return {
      assumptive: "Great! I have you down for [date] at [time]. What's the best number to confirm the appointment?",
      
      urgency: "I have two slots available this week - Tuesday morning or Thursday afternoon. Which works better for you?",
      
      choice: "Would you prefer our standard service or our premium package with extended warranty?",
      
      social_proof: "Most of our customers in your area choose the premium package. Would you like me to add that to your appointment?",
      
      value_summary: "So we're looking at [service] for [price], which includes [benefits]. That works out to about [daily cost] per day over the warranty period. Shall I go ahead and schedule that for you?"
    };
  }

  /**
   * Format business hours for prompts
   */
  private static formatBusinessHours(hours: Record<string, { enabled: boolean; start: string; end: string }>): string {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let formattedHours = '';

    dayNames.forEach(day => {
      const dayKey = day.toLowerCase();
      if (hours[dayKey]?.enabled) {
        formattedHours += `${day}: ${hours[dayKey].start} - ${hours[dayKey].end}\n`;
      } else {
        formattedHours += `${day}: Closed\n`;
      }
    });

    return formattedHours;
  }

  private static formatKnowledgeBase(entries: Array<{ title: string; content: string }>): string {
    if (!entries.length) {
      return '';
    }

    const formatted = entries
      .map((entry) => {
        const condensed = entry.content.trim()
          .replace(/\s+/g, ' ')
          .slice(0, 600)
        return `- ${entry.title}: ${condensed}${condensed.length === 600 ? '…' : ''}`
      })
      .join('\n')

    return `KNOWLEDGE BASE:\n${formatted}\n`
  }

  private static formatOperationalRules(config: RevenueOptimizedConfig): string {
    const directives: string[] = []

    if (config.confidenceThreshold) {
      directives.push(
        `- If your confidence is below ${config.confidenceThreshold.toFixed(2)}, elegantly offer to connect the caller with a human specialist using the escalation copy provided.`
      )
    }

    if (config.maxSilenceSeconds) {
      directives.push(
        `- Do not allow more than ${config.maxSilenceSeconds} seconds of silence before re-engaging the caller with a clarifying question or escalation.`
      )
    }

    if (config.escalationMessage) {
      directives.push(`- Escalation phrase: "${config.escalationMessage.trim()}"`)
    }

    if (config.additionalInstructions) {
      directives.push(
        `- Additional owner directives: ${config.additionalInstructions.trim().replace(/\s+/g, ' ')}`
      )
    }

    if (!directives.length) {
      return ''
    }

    return `OPERATIONAL SAFETY & ESCALATION RULES:\n${directives.join('\n')}\n`
  }
}
