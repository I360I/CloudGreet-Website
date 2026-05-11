// Dynamic AI Agent Creation and Management System
// Each client gets their own personalized AI agent

import { supabaseAdmin } from './supabase';
import { SmartAIPrompts, spliceEdgeCasesIntoPrompt, spliceReturningCallerIntoPrompt } from './smart-ai-prompts';
import { logger } from '@/lib/monitoring'
import { normalizePhoneForStorage } from './phone-normalization'
import { getRetellGeneralTools } from './retell-tools'
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
  /** Rep-managed edge cases - appended as SPECIAL HANDLING in the prompt. */
  agentEdgeCases?: Array<{ label?: string; instruction: string }> | null;
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

      // Pull escalation phone for transfer_call destination, if set. We
      // only attach transfer_call when this exists - otherwise the
      // agent would offer to transfer to a number that isn't there.
      let escalationPhone: string | null = null
      try {
        const { data: biz } = await supabaseAdmin
          .from('businesses')
          .select('escalation_phone')
          .eq('id', mergedConfig.businessId)
          .maybeSingle()
        escalationPhone = (biz as any)?.escalation_phone || null
      } catch { /* optional column, ignore */ }

      // Step 1: create a Retell-managed LLM with the prompt + greeting.
      // This was previously a custom-llm pointed at a placeholder URL
      // - which meant Retell had no LLM to update and every greeting
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
          // Attach the standard CloudGreet tool set so the agent can
          // book, look up availability, send confirmation SMS, end the
          // call, and transfer to the owner without any per-client
          // wiring in Retell's dashboard. The custom-tool webhook
          // resolves the calling business from the signed agent_id, so
          // the same URL works for every client; the transfer
          // destination is pulled from the business's escalation_phone.
          general_tools: getRetellGeneralTools(webhookUrl, { escalationPhone }),
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
  /**
   * Makes the latest agent edits live on every bound phone number.
   * Retell keeps API edits as a new agent version; phone numbers
   * pinned to a specific version stay on the old one until re-bound.
   * We do both:
   *   1. POST /publish-agent/{id} (best-effort - may be a no-op)
   *   2. For each phone bound to this agent, PATCH the phone with
   *      inbound_agent_id set to the same id and version cleared.
   *      That nudges Retell to point at the latest version.
   */
  private async maybePublish(retellAgentId: string, t: (m: string) => void): Promise<void> {
    try {
      const pubRes = await fetch(
        `https://api.retellai.com/publish-agent/${retellAgentId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      )
      if (pubRes.ok) {
        const pub = await pubRes.json().catch(() => ({}))
        t(`publish-agent ok${pub?.version != null ? `: version ${pub.version}` : ''}`)
      } else {
        const text = await pubRes.text().catch(() => pubRes.statusText)
        t(`publish-agent ${pubRes.status}: ${text.slice(0, 80)}`)
      }
    } catch (pubErr) {
      t(`publish-agent failed: ${pubErr instanceof Error ? pubErr.message : 'unknown'}`)
    }

    // Re-bind any phones serving this agent so they pick up the latest
    // version. Without this, phones pinned to a specific version_id
    // keep playing the old config no matter how many times we PATCH.
    try {
      const phonesRes = await fetch('https://api.retellai.com/list-phone-numbers', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        cache: 'no-store',
      })
      if (!phonesRes.ok) {
        t(`list-phone-numbers ${phonesRes.status} - couldn't refresh phone bindings`)
        return
      }
      const phones = (await phonesRes.json().catch(() => [])) as any[]
      const bound = (Array.isArray(phones) ? phones : []).filter(
        (p) =>
          p?.inbound_agent_id === retellAgentId ||
          p?.outbound_agent_id === retellAgentId ||
          p?.agent_id === retellAgentId,
      )
      if (bound.length === 0) {
        t('no phone numbers route to this agent - re-bind skipped')
        return
      }
      for (const p of bound) {
        const phoneNumber = p.phone_number || p.phone_number_pretty
        if (!phoneNumber) continue
        const patch: Record<string, unknown> = {}
        // Send the agent id back unchanged with version cleared so Retell
        // re-resolves to the latest published version.
        if (p.inbound_agent_id === retellAgentId) {
          patch.inbound_agent_id = retellAgentId
          patch.inbound_agent_version = null
        }
        if (p.outbound_agent_id === retellAgentId) {
          patch.outbound_agent_id = retellAgentId
          patch.outbound_agent_version = null
        }
        if (Object.keys(patch).length === 0) continue
        const rebindRes = await fetch(
          `https://api.retellai.com/update-phone-number/${encodeURIComponent(phoneNumber)}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(patch),
          },
        )
        if (rebindRes.ok) {
          t(`rebind ${phoneNumber} → latest version: ok`)
        } else {
          const text = await rebindRes.text().catch(() => rebindRes.statusText)
          t(`rebind ${phoneNumber}: ${rebindRes.status} ${text.slice(0, 80)}`)
        }
      }
    } catch (e) {
      t(`phone rebind failed: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

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
        t('no agent id in ai_agents or businesses - nothing to update')
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
      // silently ignored greeting + prompt - that's why callers kept
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
      // contractor's prompt must already live in their custom backend -
      // we wouldn't be able to safely create one without overwriting
      // their tuning. Skip the LLM patch with a clear message.
      if (!llmId && responseEngineType !== 'retell-llm') {
        t(`agent uses ${responseEngineType ?? 'unknown'} engine - greeting can't be updated via Retell API`)
      }

      // 2a) Only patch general_prompt when the caller explicitly
      //     supplied edge cases. Reps editing the rep-portal edge-case
      //     list passes agentEdgeCases - that's when we regenerate the
      //     prompt + push to Retell. Voice/greeting/name saves never
      //     trigger this branch, preserving any hand-tuning the
      //     contractor may have done in Retell directly.
      const edgeCasesProvided = Object.prototype.hasOwnProperty.call(config, 'agentEdgeCases')
      if (llmId && edgeCasesProvided) {
        try {
          // Append-only update path:
          //   1. GET the current general_prompt from Retell
          //   2. Splice the SPECIAL HANDLING block between the
          //      sentinels (or strip a legacy unsentineled block and
          //      append a sentineled one)
          //   3. PATCH back
          //
          // This preserves any hand-tuning admin did in the Retell
          // UI - only the rep-managed block changes. If the GET fails
          // (404, network, etc) we fall back to the safe-but-clobbery
          // full regenerate so a rep edit is never silently dropped.
          let newPrompt: string | null = null
          try {
            const llmRes = await fetch(`https://api.retellai.com/get-retell-llm/${llmId}`, {
              headers: { Authorization: `Bearer ${this.apiKey}` },
            })
            if (llmRes.ok) {
              const llmJson = await llmRes.json().catch(() => null) as any
              const currentPrompt: string = llmJson?.general_prompt || ''
              if (currentPrompt) {
                newPrompt = spliceEdgeCasesIntoPrompt(
                  currentPrompt,
                  mergedConfig.agentEdgeCases || [],
                )
                newPrompt = spliceReturningCallerIntoPrompt(newPrompt)
                t(`splice ok: based on existing ${currentPrompt.length}-char prompt`)
              }
            } else {
              t(`get-retell-llm ${llmRes.status} - falling back to full regen`)
            }
          } catch (e) {
            t(`get-retell-llm threw - falling back to full regen: ${e instanceof Error ? e.message : 'Unknown'}`)
          }

          if (!newPrompt) {
            const promptConfig = await this.buildPromptConfig(mergedConfig)
            newPrompt = SmartAIPrompts.generateIndustrySpecificPrompt(
              mergedConfig.businessType, promptConfig,
            )
            newPrompt = spliceReturningCallerIntoPrompt(newPrompt)
          }

          const promptRes = await fetch(`https://api.retellai.com/update-retell-llm/${llmId}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ general_prompt: newPrompt }),
          })
          if (!promptRes.ok) {
            const text = await promptRes.text().catch(() => promptRes.statusText)
            t(`update-retell-llm prompt ${promptRes.status}: ${text.slice(0, 120)}`)
            throw new Error(`Failed to push prompt: ${promptRes.status} ${text.slice(0, 200)}`)
          }
          t(`update-retell-llm prompt ok: ${(mergedConfig.agentEdgeCases || []).length} edge case(s)`)
        } catch (e) {
          // Surface the error but don't abort the rest of the agent
          // sync - voice/greeting changes still apply.
          t(`prompt push threw: ${e instanceof Error ? e.message : 'Unknown'}`)
          // Re-throw so the API route's saveAndSync surfaces a
          // retell_warning to the rep instead of silently swallowing.
          throw e
        }
      }

      // 2b) Only patch begin_message when the caller explicitly provided
      //     a new greeting. Sending begin_message="" on every save (e.g.
      //     a voice-only save where the DB greeting is null) flips
      //     Retell into dynamic-greeting mode and wipes the static one
      //     we set previously.
      const greetingProvided = Object.prototype.hasOwnProperty.call(config, 'greetingMessage')
      if (llmId && greetingProvided) {
        const newGreeting = (config.greetingMessage ?? '').toString()
        if (newGreeting.length === 0) {
          t('skipping LLM patch: greeting is empty (would switch agent to dynamic mode)')
        } else {
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

      // 3) Patch the agent only with fields the caller explicitly
      //    passed. Same reasoning as begin_message: we never want a
      //    voice-only save to also reset agent_name, or a name-only
      //    save to overwrite voice_id with our auto-pick. Each edit
      //    touches its own field, period.
      const agentPatch: Record<string, unknown> = {}
      if (Object.prototype.hasOwnProperty.call(config, 'businessName') && config.businessName) {
        agentPatch.agent_name = `${config.businessName} AI Receptionist`
      }
      if (Object.prototype.hasOwnProperty.call(config, 'voiceId')) {
        // voiceId === null means "use the auto-picked default"
        agentPatch.voice_id = config.voiceId || this.selectOptimalVoice(mergedConfig.businessType)
      }
      if (Object.prototype.hasOwnProperty.call(config, 'voiceSpeed') && config.voiceSpeed != null) {
        agentPatch.voice_speed = Math.max(0.5, Math.min(2.0, config.voiceSpeed))
      }

      // If nothing's to patch, skip the call entirely.
      if (Object.keys(agentPatch).length === 0) {
        t('update-agent: skipped (no agent fields in this save)')
        // Still attempt publish so prior edits go live.
        await this.maybePublish(agentData.retell_agent_id, t)
        await supabaseAdmin
          .from('ai_agents')
          .update({ configuration: config, updated_at: new Date().toISOString() })
          .eq('business_id', businessId)
        return
      }

      const cleanAgentPatch = agentPatch

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

      await this.maybePublish(agentData.retell_agent_id, t)

      // Verification step: re-read the agent from Retell after our PATCH
      // and look up which phone number(s) it's bound to. If our agent
      // isn't actually attached to a phone number in Retell, the
      // contractor's calls land on a *different* agent and our updates
      // are invisible - the trace makes that mismatch obvious.
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
            t('⚠ no Retell phone numbers route to this agent - calls hit a different agent')
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
      additionalInstructions: config.aiAdditionalInstructions ?? undefined,
      edgeCases: Array.isArray(config.agentEdgeCases)
        ? config.agentEdgeCases
            .filter((e: any) => e && typeof e.instruction === 'string')
            .map((e: any) => ({
              label: typeof e.label === 'string' ? e.label : '',
              instruction: e.instruction,
            }))
        : undefined,
    }
  }

  private async mergeBusinessConfig(
    businessId: string,
    incoming: Partial<BusinessAgentConfig>
  ): Promise<BusinessAgentConfig> {
    // Use select('*') so a missing optional column (voice_id, voice_speed,
    // ai_* - all from later migrations the operator may not have applied
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
      voiceSpeed: incoming.voiceSpeed ?? (data.voice_speed as number | null) ?? null,
      agentEdgeCases:
        incoming.agentEdgeCases
        ?? (Array.isArray((data as any).agent_edge_cases)
          ? ((data as any).agent_edge_cases as Array<{ label?: string; instruction: string }>)
          : null),
    }
  }

  /**
   * Attach (or refresh) the three webhook-backed tools on an existing
   * agent's Retell-managed LLM. Used to retrofit agents that were
   * created before tools were wired programmatically. Idempotent -
   * Retell replaces general_tools wholesale on PATCH, so calling this
   * twice is harmless.
   *
   * Returns a trace array describing what happened.
   */
  async ensureLLMToolsForBusiness(businessId: string): Promise<string[]> {
    const trace: string[] = []
    const t = (m: string) => trace.push(m)

    // 1) Find the Retell agent for this business (ai_agents → businesses fallback).
    let retellAgentId: string | null = null
    const { data: aiAgent } = await supabaseAdmin
      .from('ai_agents')
      .select('retell_agent_id')
      .eq('business_id', businessId)
      .maybeSingle()
    retellAgentId = (aiAgent as any)?.retell_agent_id || null
    if (!retellAgentId) {
      const { data: biz } = await supabaseAdmin
        .from('businesses')
        .select('retell_agent_id')
        .eq('id', businessId)
        .maybeSingle()
      retellAgentId = (biz as any)?.retell_agent_id || null
    }
    if (!retellAgentId) {
      t('no Retell agent linked to this business - nothing to wire')
      throw new Error('No Retell agent linked to this business')
    }
    t(`agent ${retellAgentId}`)

    // 2) Find the LLM behind the agent.
    const agentRes = await fetch(
      `https://api.retellai.com/get-agent/${retellAgentId}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    )
    if (!agentRes.ok) {
      const txt = await agentRes.text().catch(() => agentRes.statusText)
      t(`get-agent ${agentRes.status}: ${txt.slice(0, 120)}`)
      throw new Error(`Retell get-agent failed: ${agentRes.status}`)
    }
    const agent = await agentRes.json().catch(() => ({}))
    const engineType = agent?.response_engine?.type
    const llmId = agent?.response_engine?.llm_id
    if (engineType !== 'retell-llm' || !llmId) {
      t(`agent uses '${engineType ?? 'unknown'}' engine - can't patch general_tools via Retell API`)
      throw new Error('Agent is not on a Retell-managed LLM; tools must be wired in Retell dashboard')
    }
    t(`llm ${llmId}`)

    // 3) Patch general_tools with our standard set. Pull
    // escalation_phone so transfer_call gets the right destination
    // (when set); skipped otherwise to avoid offering broken transfers.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'
    const webhookUrl = `${appUrl}/api/retell/voice-webhook`
    let escalationPhone: string | null = null
    try {
      const { data: biz } = await supabaseAdmin
        .from('businesses')
        .select('escalation_phone')
        .eq('id', businessId)
        .maybeSingle()
      escalationPhone = (biz as any)?.escalation_phone || null
    } catch { /* optional column, ignore */ }
    const tools = getRetellGeneralTools(webhookUrl, { escalationPhone })

    const patchRes = await fetch(`https://api.retellai.com/update-retell-llm/${llmId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ general_tools: tools }),
    })
    if (!patchRes.ok) {
      const txt = await patchRes.text().catch(() => patchRes.statusText)
      t(`update-retell-llm ${patchRes.status}: ${txt.slice(0, 200)}`)
      throw new Error(`Failed to attach tools: ${patchRes.status}`)
    }
    t(`wired ${tools.length} tools: ${tools.map(x => x.name).join(', ')}`)

    // 4) Re-publish + re-bind phones so the new tools go live immediately.
    await this.maybePublish(retellAgentId, t)
    return trace
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
