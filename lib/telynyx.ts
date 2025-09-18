import axios from 'axios'

const TELYNX_API_KEY = process.env.TELYNX_API_KEY
const TELYNX_BASE_URL = 'https://api.telnyx.com/v2'

export const telynyx = {
  // Purchase a phone number
  async purchasePhoneNumber(areaCode: string, businessName: string) {
    try {
      // First, get available numbers
      const availableResponse = await axios.get(`${TELYNX_BASE_URL}/available_phone_numbers`, {
        headers: { Authorization: `Bearer ${TELYNX_API_KEY}` },
        params: {
          filter: {
            country_code: 'US',
            area_code: areaCode,
            features: ['voice', 'sms']
          }
        }
      })

      if (!availableResponse.data.data || availableResponse.data.data.length === 0) {
        throw new Error(`No phone numbers available for area code ${areaCode}`)
      }

      const phoneNumber = availableResponse.data.data[0].phone_number

      // Purchase the number
      const purchaseResponse = await axios.post(`${TELYNX_BASE_URL}/phone_numbers`, {
        phone_number: phoneNumber,
        friendly_name: `${businessName} - CloudGreet`,
        connection_id: process.env.TELYNX_CONNECTION_ID
      }, {
        headers: { Authorization: `Bearer ${TELYNX_API_KEY}` }
      })

      return {
        success: true,
        phone_number: phoneNumber,
        id: purchaseResponse.data.data.id
      }
    } catch (error) {
      console.error('Telynyx phone purchase error:', error)
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.detail || 'Failed to purchase phone number'
      }
    }
  },

  // Create AI agent
  async createAIAgent(businessData: any) {
    try {
      const response = await axios.post(`${TELYNX_BASE_URL}/ai_agents`, {
        name: `${businessData.business_name} AI Agent`,
        description: `AI receptionist for ${businessData.business_name}`,
        voice: {
          provider: 'openai',
          model: 'gpt-4',
          voice: 'alloy'
        },
        instructions: `You are an AI receptionist for ${businessData.business_name}, a ${businessData.business_type} business. 
        
        Your role:
        - Answer calls professionally and warmly
        - Qualify leads by asking about their needs
        - Schedule appointments when appropriate
        - Provide business information
        - Transfer to human when needed
        
        Business details:
        - Name: ${businessData.business_name}
        - Type: ${businessData.business_type}
        - Services: ${businessData.services?.join(', ') || 'General services'}
        - Hours: ${businessData.business_hours ? JSON.stringify(businessData.business_hours) : 'Monday-Friday 8AM-5PM'}
        - Phone: ${businessData.phone}
        - Address: ${businessData.address}
        
        Always be professional, helpful, and try to convert calls into appointments.`
      }, {
        headers: { Authorization: `Bearer ${TELYNX_API_KEY}` }
      })

      return {
        success: true,
        agent_id: response.data.data.id
      }
    } catch (error) {
      console.error('Telynyx AI agent creation error:', error)
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.detail || 'Failed to create AI agent'
      }
    }
  }
}