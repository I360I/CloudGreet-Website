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
  voiceId?: string | null;
  voiceSpeed?: number | null;
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

      // Step 1: create a Retell-managed LLM with the prompt + greeting.
      // This was previously a custom-llm pointed at a placeholder URL
      // — which meant Retell had no LLM to update and every greeting
      // change silently failed. Using retell-llm from creation lets
      // /dashboard/settings actually drive the live agent.
      const createLlmRes = await fetch('https://api.retellai.com/create-retell-llm', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          general_prompt: systemPrompt,
          begin_message: mergedConfig.greetingMessage || 'Hello, how can I help you today?',
          model: 'gpt-4o-mini',
        }),
      })
      if (!createLlmRes.ok) {
        const text = await createLlmRes.text().catch(() => createLlmRes.statusText)
        throw new Error(`Failed to create Retell LLM: ${createLlmRes.status} ${text.slice(0, 200)}`)
      }
      const llm = await createLlmRes.json()
      const llmId = llm?.llm_id
      if (!llmId) throw new Error('create-retell-llm returned no llm_id')

      // Step 2: create the agent that points at the LLM.
      const agentData = {
        agent_name: `${mergedConfig.businessName} AI Receptionist`,
        voice_id: this.selectOptimalVoice(mergedConfig.businessType),
        language: 'en-US',
        response_engine: { type: 'retell-llm', llm_id: llmId },
        max_call_duration_ms: 900000, // 15 minutes
        webhook_url: webhookUrl,
      };

      const response = await fetch('https://api.retellai.com/create-agent', {
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
          name: agentData.agent_name,
          voice_id: agentData.voice_id,
          language: agentData.language,
          greeting: mergedConfig.greetingMessage,
          system_prompt: systemPrompt,
          agent_id: agentId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
        mergedConfig.phoneNumber,
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
  async updateBusinessAgent(
    businessId: string,
    config: Partial<BusinessAgentConfig>,
    trace: string[] = [],
  ): Promise<void> {
    const t = (msg: string) => { trace.push(msg) }
    try {
      // Get existing agent ID. Try ai_agents first; fall back to
      // businesses.retell_agent_id for clients created via the admin
      // path (which doesn't always seed ai_agents).
      const { data: aiAgentRow } = await supabaseAdmin
        .from('ai_agents')
        .select('retell_agent_id')
        .eq('business_id', businessId)
        .maybeSingle();
      let retellAgentId = aiAgentRow?.retell_agent_id as string | null
      if (retellAgentId) {
        t(`agent id from ai_agents: ${retellAgentId}`)
      } else {
        const { data: bizRow } = await supabaseAdmin
          .from('businesses')
          .select('retell_agent_id')
          .eq('id', businessId)
          .maybeSingle()
        retellAgentId = (bizRow as any)?.retell_agent_id || null
        if (retellAgentId) t(`agent id from businesses: ${retellAgentId}`)
      }
      const agentData = retellAgentId ? { retell_agent_id: retellAgentId } : null

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
        t('no agent id in ai_agents or businesses — nothing to update')
        throw new Error('No Retell agent linked to this business. Set the agent in /admin/clients/[id] first.')
      }

      const mergedConfig = await this.mergeBusinessConfig(businessId, config)
      // NOTE: We deliberately do NOT regenerate or push general_prompt
      // here. The contractor's prompt is hand-tuned in Retell and a
      // settings save (greeting/voice/speed) must never overwrite it.
      // Only begin_message + agent-level fields get touched below.
      
      const resolvedVoice =
        mergedConfig.voiceId ||
        (mergedConfig.businessType ? this.selectOptimalVoice(mergedConfig.businessType) : undefined)

      // Retell v2 splits configuration: voice/name/speed live on the
      // *agent*, while greeting (begin_message) + system prompt
      // (general_prompt) live on the *retell-llm* resource the agent
      // references. Updating only the agent (the previous behavior)
      // silently ignored greeting + prompt — that's why callers kept
      // hearing the old greeting after a save.

      // 1) Inspect the agent so we can find its LLM id.
      const getAgentRes = await fetch(
        `https://api.retellai.com/get-agent/${agentData.retell_agent_id}`,
        { headers: { Authorization: `Bearer ${this.apiKey}` } },
      )
      let llmId: string | null = null
      let responseEngineType: string | null = null
      if (getAgentRes.ok) {
        const agent = await getAgentRes.json().catch(() => ({}))
        responseEngineType = agent?.response_engine?.type ?? null
        if (responseEngineType === 'retell-llm') {
          llmId = agent?.response_engine?.llm_id ?? null
        }
        t(`get-agent ok: response_engine.type=${responseEngineType ?? '∅'} llm_id=${llmId ?? '∅'}`)
      } else {
        const txt = await getAgentRes.text().catch(() => getAgentRes.statusText)
        t(`get-agent ${getAgentRes.status}: ${txt.slice(0, 120)}`)
        throw new Error(`Retell get-agent ${getAgentRes.status}: ${txt.slice(0, 120)}`)
      }

      // No auto-migration. If the agent has no Retell-managed LLM, the
      // contractor's prompt must already live in their custom backend —
      // we wouldn't be able to safely create one without overwriting
      // their tuning. Skip the LLM patch with a clear message.
      if (!llmId && responseEngineType !== 'retell-llm') {
        t(`agent uses ${responseEngineType ?? 'unknown'} engine — greeting can't be updated via Retell API`)
      }

      // 2) Patch ONLY begin_message on the LLM. We never touch
      //    general_prompt — it's hand-tuned per business and we won't
      //    risk clobbering it. If the contractor cleared the greeting
      //    we still send the empty string (Retell accepts it) so they
      //    can reset to default through the UI.
      if (llmId) {
        const newGreeting = mergedConfig.greetingMessage ?? ''
        // Skip the patch entirely if there's nothing meaningful to set.
        // (Empty string IS meaningful — it lets a user clear a greeting.)
        if (typeof newGreeting === 'string') {
          const llmRes = await fetch(`https://api.retellai.com/update-retell-llm/${llmId}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ begin_message: newGreeting }),
          })
          if (!llmRes.ok) {
            const text = await llmRes.text().catch(() => llmRes.statusText)
            t(`update-retell-llm ${llmRes.status}: ${text.slice(0, 120)}`)
            throw new Error(`Failed to update Retell LLM: ${llmRes.status} ${text.slice(0, 200)}`)
          }
          t(`update-retell-llm ok: begin_message="${newGreeting.slice(0, 40)}${newGreeting.length > 40 ? '…' : ''}"`)
        }
      }

      // 3) Patch the agent for voice/voice_speed/name.
      const agentPatch: Record<string, unknown> = {
        agent_name: config.businessName ? `${config.businessName} AI Receptionist` : undefined,
        voice_id: resolvedVoice,
      }
      if (mergedConfig.voiceSpeed != null) {
        agentPatch.voice_speed = Math.max(0.5, Math.min(2.0, mergedConfig.voiceSpeed))
      }
      const cleanAgentPatch = Object.fromEntries(
        Object.entries(agentPatch).filter(([_, v]) => v !== undefined),
      )

      const response = await fetch(
        `https://api.retellai.com/update-agent/${agentData.retell_agent_id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cleanAgentPatch),
        },
      );

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
        const text = await response.text().catch(() => response.statusText)
        t(`update-agent ${response.status}: ${text.slice(0, 120)}`)
        throw new Error(`Failed to update agent: ${response.status} ${text.slice(0, 200)}`);
      }
      t(`update-agent ok: ${Object.keys(cleanAgentPatch).join(', ') || '(no fields)'}`)

      // Verification step: re-read the agent from Retell after our PATCH
      // and look up which phone number(s) it's bound to. If our agent
      // isn't actually attached to a phone number in Retell, the
      // contractor's calls land on a *different* agent and our updates
      // are invisible — the trace makes that mismatch obvious.
      try {
        const verifyAgentRes = await fetch(
          `https://api.retellai.com/get-agent/${agentData.retell_agent_id}`,
          { headers: { Authorization: `Bearer ${this.apiKey}` } },
        )
        if (verifyAgentRes.ok) {
          const verified = await verifyAgentRes.json().catch(() => ({}))
          t(`verify agent: voice_id=${verified?.voice_id ?? '∅'} voice_speed=${verified?.voice_speed ?? '∅'}`)
        }
        const phoneListRes = await fetch('https://api.retellai.com/list-phone-numbers', {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        })
        if (phoneListRes.ok) {
          const phones = await phoneListRes.json().catch(() => []) as any[]
          const bound = (Array.isArray(phones) ? phones : []).filter(
            (p) =>
              p?.inbound_agent_id === agentData.retell_agent_id ||
              p?.outbound_agent_id === agentData.retell_agent_id ||
              p?.agent_id === agentData.retell_agent_id,
          )
          if (bound.length === 0) {
            t('⚠ no Retell phone numbers route to this agent — calls hit a different agent')
          } else {
            t(`bound to ${bound.length} number(s): ${bound.map((p) => p.phone_number || p.phone_number_pretty || '?').join(', ')}`)
          }
        }
      } catch (verifyErr) {
        t(`verify step failed: ${verifyErr instanceof Error ? verifyErr.message : 'unknown'}`)
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
    // Use select('*') so a missing optional column (voice_id, voice_speed,
    // ai_* — all from later migrations the operator may not have applied
    // yet) doesn't blow up the entire merge. Any field below that's
    // absent simply reads as undefined and falls through to defaults.
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .maybeSingle()

    if (error || !data) {
      throw new Error(
        `Unable to load business configuration for prompt generation${error ? `: ${error.message}` : ''}`,
      )
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
        incoming.aiAdditionalInstructions ?? (data.ai_additional_instructions as string | null) ?? null,
      voiceId: incoming.voiceId ?? (data.voice_id as string | null) ?? null,
      voiceSpeed: incoming.voiceSpeed ?? (data.voice_speed as number | null) ?? null
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
