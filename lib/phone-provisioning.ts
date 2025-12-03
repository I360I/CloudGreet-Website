// lib/phone-provisioning.ts
// Centralized phone number provisioning utility
// Handles assignment of toll-free numbers from inventory to businesses

import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { normalizePhoneForStorage } from '@/lib/phone-normalization'
import { retellAgentManager } from '@/lib/retell-agent-manager'

export interface ProvisionPhoneResult {
  success: boolean
  phoneNumber: string | null
  alreadyAssigned?: boolean
  error?: string
  message?: string
}

/**
 * Provision a phone number from inventory to a business
 * 
 * This function:
 * 1. Checks if business already has a number assigned
 * 2. Finds next available toll-free number from inventory
 * 3. Assigns it to the business
 * 4. Normalizes and updates business record
 * 5. Optionally links to existing Retell agent
 * 
 * @param businessId - The business ID to assign the number to
 * @param businessName - The business name (for logging/assignment records)
 * @param linkToAgent - Whether to link the number to an existing Retell agent (default: true)
 * @returns ProvisionPhoneResult with success status and phone number
 */
export async function provisionPhoneFromInventory(
  businessId: string,
  businessName: string,
  linkToAgent: boolean = true
): Promise<ProvisionPhoneResult> {
  try {
    // Check if business already has a toll-free number assigned
    const { data: existingAssignment } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('number, status')
      .eq('assigned_to', businessId)
      .eq('status', 'assigned')
      .single()

    if (existingAssignment) {
      logger.info('Business already has phone number assigned', {
        businessId,
        phoneNumber: existingAssignment.number
      })
      return {
        success: true,
        phoneNumber: existingAssignment.number,
        alreadyAssigned: true,
        message: 'Phone number already assigned'
      }
    }

    // Find next available toll-free number
    const { data: availableNumber, error: numberError } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('id, number')
      .eq('status', 'available')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (numberError || !availableNumber) {
      logger.error('No available phone numbers in inventory', {
        businessId,
        error: numberError?.message
      })
      return {
        success: false,
        phoneNumber: null,
        error: 'No available phone numbers',
        message: 'All phone numbers are currently assigned. Please contact support or wait for a number to become available.'
      }
    }

    // Assign the number to the business
    const { error: assignError } = await supabaseAdmin
      .from('toll_free_numbers')
      .update({
        status: 'assigned',
        assigned_to: businessId,
        business_name: businessName,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', availableNumber.id)

    if (assignError) {
      logger.error('Failed to assign phone number', {
        businessId,
        numberId: availableNumber.id,
        error: assignError.message
      })
      return {
        success: false,
        phoneNumber: null,
        error: 'Failed to assign phone number',
        message: assignError.message
      }
    }

    // Normalize phone number before storing
    const normalizedPhone = normalizePhoneForStorage(availableNumber.number)
    if (!normalizedPhone) {
      logger.error('Failed to normalize phone number during provisioning', {
        businessId,
        originalPhone: availableNumber.number
      })
      // Rollback assignment
      await supabaseAdmin
        .from('toll_free_numbers')
        .update({
          status: 'available',
          assigned_to: null,
          business_name: null,
          assigned_at: null
        })
        .eq('id', availableNumber.id)
      
      return {
        success: false,
        phoneNumber: null,
        error: 'Failed to normalize phone number',
        message: 'Phone number format is invalid'
      }
    }

    // Update business record with normalized phone number
    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        phone_number: normalizedPhone,
        phone: normalizedPhone, // Also update phone field
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    if (updateError) {
      logger.error('Failed to update business with phone number', {
        businessId,
        phoneNumber: normalizedPhone,
        error: updateError.message
      })
      // Try to rollback the assignment
      await supabaseAdmin
        .from('toll_free_numbers')
        .update({
          status: 'available',
          assigned_to: null,
          business_name: null,
          assigned_at: null
        })
        .eq('id', availableNumber.id)
      
      return {
        success: false,
        phoneNumber: null,
        error: 'Failed to update business record',
        message: updateError.message
      }
    }

    // Update toll_free_numbers table with normalized number if different
    if (normalizedPhone !== availableNumber.number) {
      await supabaseAdmin
        .from('toll_free_numbers')
        .update({
          number: normalizedPhone,
          updated_at: new Date().toISOString()
        })
        .eq('id', availableNumber.id)
    }

    // Link phone number to existing Retell agent if present and requested
    if (linkToAgent) {
      try {
        const { data: businessWithAgent } = await supabaseAdmin
          .from('businesses')
          .select('retell_agent_id')
          .eq('id', businessId)
          .single()

        if (businessWithAgent?.retell_agent_id) {
          const agentManager = retellAgentManager()
          const linkSuccess = await agentManager.linkPhoneNumberToAgent(
            businessWithAgent.retell_agent_id,
            normalizedPhone
          )

          if (linkSuccess) {
            logger.info('Phone number linked to existing Retell agent', {
              businessId,
              agentId: businessWithAgent.retell_agent_id,
              phoneNumber: normalizedPhone
            })

            // Update ai_agents table with phone number
            await supabaseAdmin
              .from('ai_agents')
              .update({
                phone_number: normalizedPhone,
                updated_at: new Date().toISOString()
              })
              .eq('retell_agent_id', businessWithAgent.retell_agent_id)
          } else {
            logger.warn('Failed to link phone number to existing Retell agent', {
              businessId,
              agentId: businessWithAgent.retell_agent_id,
              phoneNumber: normalizedPhone
            })
          }
        }
      } catch (linkError) {
        logger.warn('Error linking phone to existing agent (non-blocking)', {
          businessId,
          error: linkError instanceof Error ? linkError.message : 'Unknown error',
          phoneNumber: normalizedPhone
        })
        // Continue - linking can be done manually if needed
      }
    }

    logger.info('Phone number successfully provisioned and normalized', {
      businessId,
      originalPhone: availableNumber.number,
      normalizedPhone
    })

    return {
      success: true,
      phoneNumber: normalizedPhone,
      message: 'Phone number successfully assigned'
    }

  } catch (error) {
    logger.error('Phone provisioning failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      businessId
    })
    return {
      success: false,
      phoneNumber: null,
      error: 'Failed to provision phone number',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}





