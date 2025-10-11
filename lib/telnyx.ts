// Telnyx API integration for CloudGreet
export class TelnyxClient {
  private apiKey: string
  private connectionId: string
  private messagingProfileId: string

  constructor() {
    this.apiKey = process.env.TELNYX_API_KEY || ''
    this.connectionId = process.env.TELNYX_CONNECTION_ID || ''
    this.messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || ''
  }

  // Send SMS message
  async sendSMS(to: string, message: string, from?: string) {
    try {
      const response = await fetch('https://api.telnyx.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to,
          from: from || this.connectionId,
          body: message,
          messaging_profile_id: this.messagingProfileId
        })
      })

      if (!response.ok) {
        throw new Error(`Telnyx API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      throw error
    }
  }

  // Provision phone number
  async provisionPhoneNumber(areaCode: string) {
    try {
      const response = await fetch('https://api.telnyx.com/v1/phone_numbers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          area_code: areaCode,
          connection_id: this.connectionId
        })
      })

      if (!response.ok) {
        throw new Error(`Telnyx API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      throw error
    }
  }

  // Get phone number details
  async getPhoneNumber(phoneNumberId: string) {
    try {
      const response = await fetch(`https://api.telnyx.com/v1/phone_numbers/${phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Telnyx API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      throw error
    }
  }

  // Update AI agent
  async updateAgent(agentId: string, updates: any) {
    try {
      const response = await fetch(`https://api.telnyx.com/v1/ai_agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`Telnyx API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      throw error
    }
  }

  // Purchase phone number (alias for provisionPhoneNumber)
  async purchasePhoneNumber(areaCode: string, businessName: string) {
    try {
      const result = await this.provisionPhoneNumber(areaCode)
      return {
        success: true,
        phone_number: result.phone_number,
        id: result.id
      }
    } catch (error) {
      return {
        success: false,
        error: error
      }
    }
  }

  // Create AI agent
  async createAIAgent(businessData: any) {
    try {
      const response = await fetch('https://api.telnyx.com/v1/ai_agents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: businessData.business_name || 'AI Agent',
          instructions: businessData.greeting_message || 'Hello, how can I help you today?',
          voice: 'alloy'
        })
      })

      if (!response.ok) {
        throw new Error(`Telnyx API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      throw error
    }
  }
}

export const telnyxClient = new TelnyxClient()

// Backward compatibility aliases
export const telynyxClient = telnyxClient
export const telynyx = telnyxClient

