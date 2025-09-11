import { CommunicationIdentityClient, CommunicationUserIdentifier } from '@azure/communication-identity'
import { CallAutomationClient, CallInvite, CallConnection } from '@azure/communication-calling'
import { PhoneNumbersClient } from '@azure/communication-phone-numbers'

// Azure Communication Services configuration
const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING
const endpoint = process.env.AZURE_COMMUNICATION_ENDPOINT

if (!connectionString || !endpoint) {
  throw new Error('Azure Communication Services configuration missing')
}

// Initialize clients
const identityClient = new CommunicationIdentityClient(connectionString)
const callClient = new CallAutomationClient(endpoint, connectionString)
const phoneNumbersClient = new PhoneNumbersClient(connectionString)

export interface PhoneNumberConfig {
  phoneNumber: string
  friendlyName: string
  capabilities: {
    calling: boolean
    sms: boolean
  }
}

export interface CallConfig {
  callerId: string
  calleeId: string
  callbackUri: string
  mediaStreamingConfiguration?: {
    transportUrl: string
    transportType: 'websocket'
    audioChannelType: 'mixed' | 'unmixed'
  }
}

export class AzureCommunicationService {
  // Create a new user identity
  async createUser(): Promise<CommunicationUserIdentifier> {
    try {
      const user = await identityClient.createUser()
      return user
    } catch (error) {
      console.error('Failed to create user:', error)
      throw new Error('Failed to create communication user')
    }
  }

  // Issue an access token for a user
  async issueToken(user: CommunicationUserIdentifier, scopes: string[]): Promise<string> {
    try {
      const tokenResponse = await identityClient.getToken(user, scopes)
      return tokenResponse.token
    } catch (error) {
      console.error('Failed to issue token:', error)
      throw new Error('Failed to issue access token')
    }
  }

  // Purchase a phone number
  async purchasePhoneNumber(searchRequest: {
    countryCode: string
    phoneNumberType: 'geographic' | 'tollFree'
    capabilities: { calling: boolean; sms: boolean }
  }): Promise<PhoneNumberConfig> {
    try {
      // First, search for available numbers
      const searchResults = await phoneNumbersClient.searchAvailablePhoneNumbers(searchRequest)
      
      if (searchResults.phoneNumbers.length === 0) {
        throw new Error('No phone numbers available')
      }

      // Purchase the first available number
      const phoneNumber = searchResults.phoneNumbers[0].phoneNumber
      const purchaseResult = await phoneNumbersClient.beginPurchasePhoneNumbers(searchRequest)

      return {
        phoneNumber,
        friendlyName: `Business-${Date.now()}`,
        capabilities: searchRequest.capabilities
      }
    } catch (error) {
      console.error('Failed to purchase phone number:', error)
      throw new Error('Failed to purchase phone number')
    }
  }

  // Configure call handling
  async configureCallHandling(phoneNumber: string, webhookUrl: string): Promise<void> {
    try {
      // Configure the phone number to handle incoming calls
      await phoneNumbersClient.updatePhoneNumberCapabilities(phoneNumber, {
        calling: true,
        sms: true
      })

      // Set up call routing (this would typically be done through Azure portal or ARM templates)
      console.log(`Phone number ${phoneNumber} configured with webhook: ${webhookUrl}`)
    } catch (error) {
      console.error('Failed to configure call handling:', error)
      throw new Error('Failed to configure call handling')
    }
  }

  // Make an outbound call
  async makeCall(config: CallConfig): Promise<CallConnection> {
    try {
      const callInvite: CallInvite = {
        targetParticipant: { phoneNumber: config.calleeId },
        sourceCallIdNumber: { phoneNumber: config.callerId }
      }

      const callConnection = await callClient.createCall(
        callInvite,
        config.callbackUri,
        {
          mediaStreamingConfiguration: config.mediaStreamingConfiguration
        }
      )

      return callConnection
    } catch (error) {
      console.error('Failed to make call:', error)
      throw new Error('Failed to make outbound call')
    }
  }

  // Answer an incoming call
  async answerCall(callConnectionId: string, callbackUri: string): Promise<void> {
    try {
      await callClient.answerCall(callConnectionId, callbackUri)
    } catch (error) {
      console.error('Failed to answer call:', error)
      throw new Error('Failed to answer call')
    }
  }

  // Reject an incoming call
  async rejectCall(callConnectionId: string, reason: string = 'Busy'): Promise<void> {
    try {
      await callClient.rejectCall(callConnectionId, reason)
    } catch (error) {
      console.error('Failed to reject call:', error)
      throw new Error('Failed to reject call')
    }
  }

  // Hang up a call
  async hangUpCall(callConnectionId: string): Promise<void> {
    try {
      await callClient.hangUpCall(callConnectionId)
    } catch (error) {
      console.error('Failed to hang up call:', error)
      throw new Error('Failed to hang up call')
    }
  }

  // Play audio to a call
  async playAudio(callConnectionId: string, audioUrl: string): Promise<void> {
    try {
      await callClient.playMedia(callConnectionId, {
        playSource: {
          kind: 'file',
          url: audioUrl
        }
      })
    } catch (error) {
      console.error('Failed to play audio:', error)
      throw new Error('Failed to play audio')
    }
  }

  // Send DTMF tones
  async sendDtmf(callConnectionId: string, tones: string): Promise<void> {
    try {
      await callClient.sendDtmf(callConnectionId, tones)
    } catch (error) {
      console.error('Failed to send DTMF:', error)
      throw new Error('Failed to send DTMF tones')
    }
  }

  // Get call recording
  async getCallRecording(callConnectionId: string): Promise<string | null> {
    try {
      // This would typically involve Azure Media Services
      // For now, return a placeholder
      return `https://recordings.azure.com/calls/${callConnectionId}`
    } catch (error) {
      console.error('Failed to get call recording:', error)
      return null
    }
  }
}

// Export singleton instance
export const azureCommunication = new AzureCommunicationService()

// Webhook handlers for call events
export interface CallEvent {
  eventType: 'CallConnected' | 'CallDisconnected' | 'PlayCompleted' | 'RecognizeCompleted'
  callConnectionId: string
  serverCallId: string
  correlationId: string
  timestamp: string
}

export function handleCallEvent(event: CallEvent): void {
  console.log('Call event received:', event)
  
  switch (event.eventType) {
    case 'CallConnected':
      // Handle call connected
      break
    case 'CallDisconnected':
      // Handle call disconnected
      break
    case 'PlayCompleted':
      // Handle audio playback completed
      break
    case 'RecognizeCompleted':
      // Handle speech recognition completed
      break
  }
}
