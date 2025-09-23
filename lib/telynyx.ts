// Telynyx API integration for CloudGreet
export class TelynyxClient {
  private apiKey: string
  private connectionId: string
  private messagingProfileId: string

  constructor() {
    this.apiKey = process.env.TELYNX_API_KEY || ''
    this.connectionId = process.env.TELYNX_CONNECTION_ID || ''
    this.messagingProfileId = process.env.TELYNX_MESSAGING_PROFILE_ID || ''
  }

  // Send SMS message
  async sendSMS(to: string, message: string, from?: string) {
    try {
      const response = await fetch('https://api.telynx.com/v1/messages', {
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
        throw new Error(`Telynyx API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      // Console error removed for production
      throw error
    }
  }

  // Provision phone number
  async provisionPhoneNumber(areaCode: string) {
    try {
      const response = await fetch('https://api.telynx.com/v1/phone_numbers', {
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
        throw new Error(`Telynyx API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      // Console error removed for production
      throw error
    }
  }

  // Get phone number details
  async getPhoneNumber(phoneNumberId: string) {
    try {
      const response = await fetch(`https://api.telynx.com/v1/phone_numbers/${phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Telynyx API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      // Console error removed for production
      throw error
    }
  }

  // Update AI agent
  async updateAgent(agentId: string, updates: any) {
    try {
      const response = await fetch(`https://api.telynx.com/v1/ai_agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`Telynyx API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      // Console error removed for production
      throw error
    }
  }
}

export const telynyxClient = new TelynyxClient()
