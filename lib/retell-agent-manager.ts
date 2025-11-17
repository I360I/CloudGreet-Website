// Dynamic AI Agent Creation and Management System
// Each client gets their own personalized AI agent

import { supabaseAdmin } from './supabase';
import { SmartAIPrompts } from './smart-ai-prompts';
import { logger } from '@/lib/monitoring'
import { normalizePhoneForStorage } from './phone-normalization'
import type { JobDetails, PricingRule, Estimate, Lead, ContactInfo, Appointment, Business, AISettings, AIAgent, WebSocketMessage, SessionData, ValidationResult, QueryResult, RevenueOptimizedConfig, PricingScripts, ObjectionHandling, ClosingTechniques, AgentData, PhoneValidationResult, LeadScoringResult, ContactActivity, ReminderMessage, TestResult, WorkingPromptConfig, AgentConfiguration, ValidationFunction, ErrorDetails, APIError, APISuccess, APIResponse, PaginationParams, PaginatedResponse, FilterParams, SortParams, QueryParams, DatabaseError, SupabaseResponse, RateLimitConfig, SecurityHeaders, LogEntry, HealthCheckResult, ServiceHealth, MonitoringAlert, PerformanceMetrics, BusinessMetrics, CallMetrics, LeadMetrics, RevenueMetrics, DashboardData, ExportOptions, ImportResult, BackupConfig, MigrationResult, FeatureFlag, A_BTest, ComplianceConfig, AuditLog, SystemConfig } from '@/lib/types/common';

export interface BusinessAgentConfig {
  businessId: string;
  businessName: string;
  businessType: string;
  ownerName?: string;
  services: string[];
  serviceAreas: string[];
  businessHours: Record<string, { enabled: boolean; start: string; end: string }>;
  greetingMessage: string;
  tone: 'professional' | 'friendly' | 'casual';
  phoneNumber: string;
  website?: string;
  address: string;
  pricing?: Record<string, number>;
  specialties?: string[];
  emergencyContact?: string;
  aiConfidenceThreshold?: number;
  aiMaxSilenceSeconds?: number;
  aiEscalationMessage?: string;
  aiAdditionalInstructions?: string | null;
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
    // Try both env var names for compatibility
    this.apiKey = process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Retell API key not configured. Set RETELL_API_KEY in environment variables.');
    }
  }

  /**
   * Create a personalized AI agent for a specific business
   */
  async createBusinessAgent(config: BusinessAgentConfig): Promise<string> {
    try {
      const mergedConfig = await this.mergeBusinessConfig(config.businessId, config)
      const promptConfig = await this.buildPromptConfig(mergedConfig)

      // Generate revenue-optimized system prompt
      const systemPrompt = SmartAIPrompts.generateIndustrySpecificPrompt(mergedConfig.businessType, promptConfig);
      
      // Get webhook URL for Retell events
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'
      const webhookUrl = `${appUrl}/api/retell/voice-webhook`

      // Create agent via Retell API
      const agentData = {
        name: `${mergedConfig.businessName} AI Receptionist`,
        voice_id: this.selectOptimalVoice(mergedConfig.businessType),
        language: 'en-US',
        greeting: mergedConfig.greetingMessage,
        system_prompt: systemPrompt,
        response_engine: {
          type: 'custom-llm',
          llm_websocket_url: 'wss://api.retellai.com/llm-websocket'
        }, // Required by Retell API
        max_call_duration_ms: 900000, // 15 minutes
        ambient_sound: 'coffee-shop',
        stt_mode: 'accurate',
        webhook_url: webhookUrl, // Configure webhook for receiving events
        webhook_url_method: 'POST',
        metadata: {
          business_id: mergedConfig.businessId,
          business_type: mergedConfig.businessType,
          created_at: new Date().toISOString(),
          ai_confidence_threshold: mergedConfig.aiConfidenceThreshold ?? null,
          ai_max_silence_seconds: mergedConfig.aiMaxSilenceSeconds ?? null,
          ai_escalation_message: mergedConfig.aiEscalationMessage ?? null
        }
      };

      // Retell AI API v2 endpoint
      const response = await fetch('https://api.retellai.com/v2/create-agent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(agentData)
      });

      /**


       * if - Add description here


       * 


       * @param {...any} args - Method parameters


       * @returns {Promise<any>} Method return value


       * @throws {Error} When operation fails


       * 


       * @example


       * ```typescript


       * await this.if(param1, param2)


       * ```


       */


      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        logger.error('Retell agent creation failed', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          businessId: mergedConfig.businessId
        })
        throw new Error(`Failed to create agent: ${response.status} ${response.statusText}`);
      }

      const agent = await response.json();
      const agentId = agent.agent_id || agent.id;

      if (!agentId) {
        logger.error('No agent ID in Retell response', { response: agent })
        throw new Error('Invalid response from Retell API: missing agent ID')
      }

      // Store agent info in database with phone number
      await this.storeAgentInfo(
        mergedConfig.businessId, 
        agentId, 
        {
          ...agentData,
          agent_id: agentId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        mergedConfig.phoneNumber // Include phone number in storage
      );

      
      return agentId;

    } catch (error) {
      logger.error('Error creating business agent:', { error: error instanceof Error ? error.message : 'Unknown error' });
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

      /**


       * if - Add description here


       * 


       * @param {...any} args - Method parameters


       * @returns {Promise<any>} Method return value


       * @throws {Error} When operation fails


       * 


       * @example


       * ```typescript


       * await this.if(param1, param2)


       * ```


       */


      if (!agentData?.retell_agent_id) {
        throw new Error('No existing agent found for business');
      }

      // Generate updated system prompt
      const mergedConfig = await this.mergeBusinessConfig(businessId, config)
      const promptConfig = await this.buildPromptConfig(mergedConfig)
      const systemPrompt = SmartAIPrompts.generateIndustrySpecificPrompt(
        mergedConfig.businessType,
        promptConfig
      );
      
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

      // Retell AI API v2 endpoint
      const response = await fetch(`https://api.retellai.com/v2/update-agent/${agentData.retell_agent_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanUpdateData)
      });

      /**


       * if - Add description here


       * 


       * @param {...any} args - Method parameters


       * @returns {Promise<any>} Method return value


       * @throws {Error} When operation fails


       * 


       * @example


       * ```typescript


       * await this.if(param1, param2)


       * ```


       */


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

      

    } catch (error) {
      logger.error('Error updating business agent:', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Generate a comprehensive system prompt tailored to the business
   */
  private generateSystemPrompt(config: BusinessAgentConfig): string {
    // Fallback for legacy calls – build prompt with knowledge base
    const promptConfig = {
      businessName: config.businessName,
      businessType: config.businessType,
      ownerName: config.ownerName,
      services: config.services,
      serviceAreas: config.serviceAreas,
      address: config.address,
      website: config.website,
      phoneNumber: config.phoneNumber,
      businessHours: config.businessHours
    }

    const prompt = SmartAIPrompts.generateIndustrySpecificPrompt(config.businessType, promptConfig)
    return prompt
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
  private formatBusinessHours(hours: Record<string, unknown>): string {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let formattedHours = '';

    dayNames.forEach(day => {
      const dayKey = day.toLowerCase();
      /**

       * if - Add description here

       * 

       * @param {...any} args - Method parameters

       * @returns {Promise<any>} Method return value

       * @throws {Error} When operation fails

       * 

       * @example

       * ```typescript

       * await this.if(param1, param2)

       * ```

       */

      const dayHours = hours[dayKey] as { enabled?: boolean; start?: string; end?: string } | undefined;
      if (dayHours?.enabled) {
        formattedHours += `${day}: ${dayHours.start} - ${dayHours.end}\n`;
      } else {
        formattedHours += `${day}: Closed\n`;
      }
    });

    return formattedHours;
  }

  /**
   * Link phone number to Retell agent
   * 
   * Note: Retell may require manual linking in their dashboard.
   * This function attempts API linking and stores metadata for reference.
   * 
   * @param agentId - Retell agent ID
   * @param phoneNumber - Phone number to link (will be normalized)
   * @returns true if linking succeeded or was logged, false on error
   */
  async linkPhoneNumberToAgent(agentId: string, phoneNumber: string | null | undefined): Promise<boolean> {
    if (!phoneNumber || !agentId) {
      logger.warn('Cannot link phone to agent - missing parameters', {
        agentId,
        hasPhoneNumber: !!phoneNumber
      })
      return false
    }

    try {
      // Normalize phone number
      const normalizedPhone = normalizePhoneForStorage(phoneNumber)
      if (!normalizedPhone) {
        logger.error('Failed to normalize phone number for Retell linking', {
          agentId,
          originalPhone: phoneNumber
        })
        return false
      }

      // Attempt to link via Retell API
      // Note: Retell API may not have a direct phone linking endpoint
      // If endpoint doesn't exist, we'll store metadata and log for manual linking
      try {
        // Try Retell API endpoint (may not exist)
        const response = await fetch('https://api.retellai.com/v2/link-phone-number', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            agent_id: agentId,
            phone_number: normalizedPhone
          })
        })

        if (response.ok) {
          logger.info('Successfully linked phone number to Retell agent via API', {
            agentId,
            phoneNumber: normalizedPhone
          })
          return true
        } else if (response.status === 404) {
          // Endpoint doesn't exist - this is expected
          logger.info('Retell phone linking API endpoint not available - manual linking required', {
            agentId,
            phoneNumber: normalizedPhone,
            status: response.status
          })
          // Continue to store metadata
        } else {
          const errorText = await response.text().catch(() => 'Unknown error')
          logger.warn('Retell phone linking API returned error', {
            agentId,
            phoneNumber: normalizedPhone,
            status: response.status,
            error: errorText
          })
          // Continue to store metadata even if API call failed
        }
      } catch (apiError) {
        // API endpoint may not exist - this is okay
        logger.info('Retell phone linking API call failed (endpoint may not exist)', {
          agentId,
          phoneNumber: normalizedPhone,
          error: apiError instanceof Error ? apiError.message : 'Unknown error'
        })
        // Continue to store metadata
      }

      // Store phone number in agent metadata for reference
      // This ensures we have the association even if API linking isn't available
      await supabaseAdmin
        .from('ai_agents')
        .update({
          phone_number: normalizedPhone,
          updated_at: new Date().toISOString()
        })
        .eq('retell_agent_id', agentId)

      logger.info('Phone number stored in agent metadata for Retell linking', {
        agentId,
        phoneNumber: normalizedPhone,
        note: 'Manual linking may be required in Retell dashboard'
      })

      return true
    } catch (error) {
      logger.error('Error linking phone number to Retell agent', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId,
        phoneNumber
      })
      return false
    }
  }

  /**
   * Store agent information in database
   * 
   * @param businessId - Business ID
   * @param agentId - Retell agent ID
   * @param agentData - Agent configuration data
   * @param phoneNumber - Optional phone number to store with agent
   */
  private async storeAgentInfo(
    businessId: string, 
    agentId: string, 
    agentData: AgentData,
    phoneNumber?: string | null
  ): Promise<void> {
    try {
      // Normalize phone number if provided
      const normalizedPhone = phoneNumber ? normalizePhoneForStorage(phoneNumber) : null

      const upsertData: any = {
        business_id: businessId,
        retell_agent_id: agentId,
        name: agentData.name,
        voice: agentData.voice_id,
        language: agentData.language,
        greeting: (agentData as any).greeting,
        system_prompt: (agentData as any).system_prompt,
        configuration: (agentData as any).metadata,
        is_active: true,
        updated_at: new Date().toISOString()
      }

      // Add phone number if provided
      if (normalizedPhone) {
        upsertData.phone_number = normalizedPhone
      }

      // Only set created_at if this is a new record
      const { data: existing } = await supabaseAdmin
        .from('ai_agents')
        .select('id')
        .eq('retell_agent_id', agentId)
        .single()

      if (!existing) {
        upsertData.created_at = new Date().toISOString()
      }

      await supabaseAdmin
        .from('ai_agents')
        .upsert(upsertData, {
          onConflict: 'retell_agent_id'
        })

      logger.info('Agent info stored in database', {
        businessId,
        agentId,
        hasPhoneNumber: !!normalizedPhone,
        phoneNumber: normalizedPhone
      })
    } catch (error) {
      logger.error('Error storing agent info', {
        error: error instanceof Error ? error.message : 'Unknown error',
        businessId,
        agentId
      })
      throw error
    }
  }

  private async fetchKnowledgeEntries(businessId: string): Promise<Array<{ title: string; content: string }>> {
    const { data, error } = await supabaseAdmin
      .from('business_knowledge_entries')
      .select('title, content')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false })

    if (error) {
      logger.warn('Failed to load knowledge entries for prompt', {
        businessId,
        error: error.message
      })
      return []
    }

    return (data ?? []).map((entry) => ({
      title: entry.title,
      content: entry.content
    }))
  }

  private async buildPromptConfig(config: BusinessAgentConfig) {
    const knowledgeBase = await this.fetchKnowledgeEntries(config.businessId)
    return {
      businessName: config.businessName,
      businessType: config.businessType,
      ownerName: config.ownerName,
      services: config.services,
      serviceAreas: config.serviceAreas,
      address: config.address,
      website: config.website,
      phoneNumber: config.phoneNumber,
      businessHours: config.businessHours,
      knowledgeBase,
      confidenceThreshold: config.aiConfidenceThreshold,
      maxSilenceSeconds: config.aiMaxSilenceSeconds,
      escalationMessage: config.aiEscalationMessage,
      additionalInstructions: config.aiAdditionalInstructions ?? undefined
    }
  }

  private async mergeBusinessConfig(
    businessId: string,
    incoming: Partial<BusinessAgentConfig>
  ): Promise<BusinessAgentConfig> {
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select(
        'business_name, business_type, business_hours, services, service_areas, greeting_message, tone, phone_number, phone, address, city, state, zip_code, website, owner_id, ai_confidence_threshold, ai_max_silence_seconds, ai_escalation_message, ai_additional_instructions'
      )
      .eq('id', businessId)
      .maybeSingle()

    if (error || !data) {
      throw new Error('Unable to load business configuration for prompt generation')
    }

    const address =
      incoming.address ??
      data.address ??
      [data.city, data.state, data.zip_code].filter(Boolean).join(', ')

    return {
      businessId,
      businessName: incoming.businessName ?? data.business_name,
      businessType: incoming.businessType ?? data.business_type,
      ownerName: incoming.ownerName,
      services: incoming.services ?? (data.services as string[]) ?? [],
      serviceAreas: incoming.serviceAreas ?? (data.service_areas as string[]) ?? [],
      businessHours: incoming.businessHours ?? (data.business_hours as Record<string, any>) ?? {},
      greetingMessage: incoming.greetingMessage ?? data.greeting_message ?? 'Hello! How can I help you today?',
      tone: incoming.tone ?? (data.tone as 'professional' | 'friendly' | 'casual') ?? 'professional',
      phoneNumber: incoming.phoneNumber ?? data.phone_number ?? data.phone ?? '',
      website: incoming.website ?? data.website ?? undefined,
      address,
      specialties: incoming.specialties,
      pricing: incoming.pricing,
      emergencyContact: incoming.emergencyContact,
      aiConfidenceThreshold:
        incoming.aiConfidenceThreshold ?? (data.ai_confidence_threshold as number | null) ?? undefined,
      aiMaxSilenceSeconds:
        incoming.aiMaxSilenceSeconds ?? (data.ai_max_silence_seconds as number | null) ?? undefined,
      aiEscalationMessage:
        incoming.aiEscalationMessage ??
        (data.ai_escalation_message as string | null) ??
        "I'm going to connect you with a teammate who can help further.",
      aiAdditionalInstructions:
        incoming.aiAdditionalInstructions ?? (data.ai_additional_instructions as string | null) ?? null
    }
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

      /**


       * if - Add description here


       * 


       * @param {...any} args - Method parameters


       * @returns {Promise<any>} Method return value


       * @throws {Error} When operation fails


       * 


       * @example


       * ```typescript


       * await this.if(param1, param2)


       * ```


       */


      if (agentData?.retell_agent_id) {
        // Delete from Retell
        await fetch(`https://api.retellai.com/v2/delete-agent/${agentData.retell_agent_id}`, {
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

        
      }
    } catch (error) {
      logger.error('Error deleting business agent:', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }
}

let _retellAgentManager: RetellAgentManager | null = null;

export const retellAgentManager = (): RetellAgentManager => {
  /**

   * if - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.if(param1, param2)

   * ```

   */

  if (!_retellAgentManager) {
    _retellAgentManager = new RetellAgentManager();
  }
  return _retellAgentManager;
};
