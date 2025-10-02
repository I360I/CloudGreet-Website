// Dynamic AI Agent Creation and Management System
// Each client gets their own personalized AI agent

import { supabaseAdmin } from './supabase';
import { SmartAIPrompts } from './smart-ai-prompts';

export interface BusinessAgentConfig {
  businessId: string;
  businessName: string;
  businessType: string;
  ownerName?: string;
  services: string[];
  serviceAreas: string[];
  businessHours: Record<string, any>;
  greetingMessage: string;
  tone: 'professional' | 'friendly' | 'casual';
  phoneNumber: string;
  website?: string;
  address: string;
  pricing?: Record<string, number>;
  specialties?: string[];
  emergencyContact?: string;
}

export interface RetellAgent {
  id: string;
  name: string;
  voice: string;
  language: string;
  greeting: string;
  systemPrompt: string;
  maxCallDuration: number;
  interruptionSensitivity: number;
  backgroundNoise: boolean;
}

class RetellAgentManager {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_RETELL_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Retell API key not configured');
    }
  }

  /**
   * Create a personalized AI agent for a specific business
   */
  async createBusinessAgent(config: BusinessAgentConfig): Promise<string> {
    try {
      console.log(`🤖 Creating AI agent for business: ${config.businessName}`);

      // Generate revenue-optimized system prompt
      const systemPrompt = SmartAIPrompts.generateIndustrySpecificPrompt(config.businessType, config);
      
      // Create agent via Retell API
      const agentData = {
        name: `${config.businessName} AI Receptionist`,
        voice_id: this.selectOptimalVoice(config.businessType),
        language: 'en-US',
        greeting: config.greetingMessage,
        system_prompt: systemPrompt,
        response_engine: {
          type: 'custom-llm',
          llm_websocket_url: 'wss://api.retellai.com/llm-websocket'
        }, // Required by Retell API
        max_call_duration_ms: 900000, // 15 minutes
        ambient_sound: 'coffee-shop',
        stt_mode: 'accurate',
        metadata: {
          business_id: config.businessId,
          business_type: config.businessType,
          created_at: new Date().toISOString()
        }
      };

      const response = await fetch('https://api.retellai.com/create-agent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(agentData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create agent: ${response.statusText}`);
      }

      const agent = await response.json();
      const agentId = agent.agent_id;

      // Store agent info in database
      await this.storeAgentInfo(config.businessId, agentId, agentData);

      console.log(`✅ Created AI agent ${agentId} for ${config.businessName}`);
      return agentId;

    } catch (error) {
      console.error('Error creating business agent:', error);
      throw error;
    }
  }

  /**
   * Update an existing agent with new business information
   */
  async updateBusinessAgent(businessId: string, config: Partial<BusinessAgentConfig>): Promise<void> {
    try {
      // Get existing agent ID
      const { data: agentData } = await supabaseAdmin
        .from('ai_agents')
        .select('retell_agent_id')
        .eq('business_id', businessId)
        .single();

      if (!agentData?.retell_agent_id) {
        throw new Error('No existing agent found for business');
      }

      // Generate updated system prompt
      const systemPrompt = this.generateSystemPrompt(config as BusinessAgentConfig);
      
      // Update agent via Retell API
      const updateData = {
        name: config.businessName ? `${config.businessName} AI Receptionist` : undefined,
        greeting: config.greetingMessage,
        system_prompt: systemPrompt,
        voice: config.businessType ? this.selectOptimalVoice(config.businessType) : undefined
      };

      // Remove undefined values
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      const response = await fetch(`https://api.retellai.com/update-agent/${agentData.retell_agent_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanUpdateData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update agent: ${response.statusText}`);
      }

      // Update database
      await supabaseAdmin
        .from('ai_agents')
        .update({
          configuration: config,
          updated_at: new Date().toISOString()
        })
        .eq('business_id', businessId);

      console.log(`✅ Updated AI agent for business ${businessId}`);

    } catch (error) {
      console.error('Error updating business agent:', error);
      throw error;
    }
  }

  /**
   * Generate a comprehensive system prompt tailored to the business
   */
  private generateSystemPrompt(config: BusinessAgentConfig): string {
    const businessHours = this.formatBusinessHours(config.businessHours);
    const services = config.services.join(', ');
    const serviceAreas = config.serviceAreas.join(', ');

    return `You are an expert AI receptionist for ${config.businessName}, a ${config.businessType} business${config.ownerName ? ` owned by ${config.ownerName}` : ''}.

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

YOUR ROLE:
You are a professional, knowledgeable, and helpful AI receptionist. You should:
1. Answer calls with a warm, ${config.tone} greeting
2. Provide accurate information about services and pricing
3. Qualify leads by understanding their needs
4. Schedule appointments during business hours
5. Take detailed messages when needed
6. Handle emergencies professionally
7. Always maintain a ${config.tone} tone

CONVERSATION GUIDELINES:
- Be conversational and natural
- Ask clarifying questions to understand customer needs
- Provide specific information about services
- Offer to schedule appointments or take messages
- If you don't know something, offer to have the owner call back
- Always end calls professionally

EMERGENCY PROTOCOLS:
- For urgent matters outside business hours, offer emergency contact
- For service emergencies, prioritize immediate assistance
- Always be empathetic and understanding

Remember: You represent ${config.businessName} and should always maintain the highest level of professionalism while being helpful and personable.`;
  }

  /**
   * Select optimal voice based on business type
   */
  private selectOptimalVoice(businessType: string): string {
    const voiceMap: Record<string, string> = {
      'HVAC': '11labs-Paul', // Professional and trustworthy
      'Plumbing': '11labs-Josh', // Clear and confident
      'Electrical': '11labs-Daniel', // Authoritative and knowledgeable
      'Roofing': '11labs-Arnold', // Strong and reliable
      'Painting': '11labs-Rachel', // Friendly and approachable
      'Landscaping': '11labs-Adam', // Energetic and enthusiastic
      'Cleaning': '11labs-Sarah', // Professional and clean
      'General': '11labs-Paul' // Default professional voice
    };

    return voiceMap[businessType] || '11labs-Paul';
  }

  /**
   * Format business hours for the system prompt
   */
  private formatBusinessHours(hours: Record<string, any>): string {
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

  /**
   * Store agent information in database
   */
  private async storeAgentInfo(businessId: string, agentId: string, agentData: any): Promise<void> {
    await supabaseAdmin
      .from('ai_agents')
      .upsert({
        business_id: businessId,
        retell_agent_id: agentId,
        name: agentData.name,
        voice: agentData.voice,
        language: agentData.language,
        greeting: agentData.greeting,
        system_prompt: agentData.system_prompt,
        configuration: agentData.metadata,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
  }

  /**
   * Get agent ID for a business
   */
  async getBusinessAgentId(businessId: string): Promise<string | null> {
    const { data } = await supabaseAdmin
      .from('ai_agents')
      .select('retell_agent_id')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single();

    return data?.retell_agent_id || null;
  }

  /**
   * Delete an agent when business is deactivated
   */
  async deleteBusinessAgent(businessId: string): Promise<void> {
    try {
      const { data: agentData } = await supabaseAdmin
        .from('ai_agents')
        .select('retell_agent_id')
        .eq('business_id', businessId)
        .single();

      if (agentData?.retell_agent_id) {
        // Delete from Retell
        await fetch(`https://api.retellai.com/delete-agent/${agentData.retell_agent_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        });

        // Mark as inactive in database
        await supabaseAdmin
          .from('ai_agents')
          .update({ is_active: false })
          .eq('business_id', businessId);

        console.log(`✅ Deleted AI agent for business ${businessId}`);
      }
    } catch (error) {
      console.error('Error deleting business agent:', error);
      throw error;
    }
  }
}

let _retellAgentManager: RetellAgentManager | null = null;

export const retellAgentManager = (): RetellAgentManager => {
  if (!_retellAgentManager) {
    _retellAgentManager = new RetellAgentManager();
  }
  return _retellAgentManager;
};
