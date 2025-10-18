/**
 * CloudGreet Voice AI Configuration
 * 
 * Latest OpenAI Realtime API configuration for both demo and production calls
 */

export const VOICE_CONFIG = {
  // Latest OpenAI Realtime API Configuration
  api: {
    model: 'gpt-4o-realtime-preview-2024-12-17',
    version: '2024-12-17',
    baseUrl: 'https://api.openai.com/v1/realtime'
  },

  // Audio Quality Settings
  audio: {
    input_format: 'pcm16',
    output_format: 'pcm16',
    sample_rate: 24000,
    channels: 1,
    bitrate: 128000,
    quality: 'high'
  },

  // Voice Options (Latest OpenAI Voices)
  voices: {
    alloy: {
      name: 'Alloy',
      description: 'Neutral, clear voice',
      gender: 'neutral',
      recommended_for: ['professional', 'general']
    },
    echo: {
      name: 'Echo',
      description: 'Warm, friendly voice',
      gender: 'male',
      recommended_for: ['customer_service', 'receptionist']
    },
    fable: {
      name: 'Fable',
      description: 'Expressive, dynamic voice',
      gender: 'male',
      recommended_for: ['sales', 'engaging']
    },
    onyx: {
      name: 'Onyx',
      description: 'Deep, authoritative voice',
      gender: 'male',
      recommended_for: ['professional', 'authority']
    },
    nova: {
      name: 'Nova',
      description: 'Bright, energetic voice',
      gender: 'female',
      recommended_for: ['friendly', 'enthusiastic']
    },
    shimmer: {
      name: 'Shimmer',
      description: 'Soft, gentle voice',
      gender: 'female',
      recommended_for: ['calm', 'supportive']
    }
  },

  // Turn Detection (Voice Activity Detection)
  turn_detection: {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500
  },

  // Demo-specific settings (more relaxed for testing)
  demo: {
    turn_detection: {
      type: 'server_vad',
      threshold: 0.4,
      prefix_padding_ms: 400,
      silence_duration_ms: 600
    },
    timeout: 30000, // 30 seconds for demo
    max_duration: 300000 // 5 minutes
  },

  // Production phone call settings (optimized for speed)
  production: {
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 200, // Faster response
      silence_duration_ms: 400 // Shorter silence detection
    },
    timeout: 300000, // 5 minutes
    max_duration: 1800000 // 30 minutes
  },

  // Function calling tools for voice interactions
  tools: [
    {
      type: 'function',
      function: {
        name: 'get_business_info',
        description: 'Get information about the business services, hours, and contact details',
        parameters: {
          type: 'object',
          properties: {
            info_type: {
              type: 'string',
              enum: ['services', 'hours', 'contact', 'pricing', 'location'],
              description: 'The type of information requested'
            }
          },
          required: ['info_type']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'schedule_appointment',
        description: 'Schedule an appointment with the customer',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'Customer full name' },
            customer_phone: { type: 'string', description: 'Customer phone number' },
            service_type: { type: 'string', description: 'Type of service requested' },
            preferred_date: { type: 'string', description: 'Preferred appointment date' },
            preferred_time: { type: 'string', description: 'Preferred appointment time' },
            customer_address: { type: 'string', description: 'Service address' },
            notes: { type: 'string', description: 'Additional notes or special requests' }
          },
          required: ['customer_name', 'customer_phone', 'service_type']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'escalate_call',
        description: 'Escalate the call to a human agent or manager',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              enum: ['emergency', 'complaint', 'complex_technical', 'customer_request', 'angry_customer'],
              description: 'Reason for escalation'
            },
            urgency: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Urgency level'
            },
            notes: { type: 'string', description: 'Additional context for the human agent' }
          },
          required: ['reason', 'urgency']
        }
      }
    }
  ],

  // Error handling and fallbacks
  fallbacks: {
    max_retries: 3,
    retry_delay_ms: 500,
    fallback_responses: [
      "I didn't quite catch that. Could you repeat it for me?",
      "Let me make sure I understand - can you tell me more?",
      "I want to help you with that. Can you give me a few more details?",
      "I'm having a little trouble hearing. What was that about?"
    ],
    emergency_response: "I'm having trouble processing that. Let me have someone call you back shortly."
  },

  // Performance monitoring
  monitoring: {
    response_time_target_ms: 200,
    max_response_time_ms: 500,
    audio_quality_threshold: 0.8,
    connection_timeout_ms: 10000
  }
}

export const getVoiceConfig = (mode: 'demo' | 'production' = 'production') => {
  const baseConfig = {
    model: VOICE_CONFIG.api.model,
    voice: VOICE_CONFIG.voices.alloy.name,
    input_audio_format: VOICE_CONFIG.audio.input_format,
    output_audio_format: VOICE_CONFIG.audio.output_format,
    input_audio_transcription: {
      model: 'whisper-1'
    },
    turn_detection: mode === 'demo' ? VOICE_CONFIG.demo.turn_detection : VOICE_CONFIG.production.turn_detection,
    tools: VOICE_CONFIG.tools
  }

  return baseConfig
}

export const getOptimalVoice = (businessType: string, tone: string = 'professional') => {
  const voiceMap: Record<string, string> = {
    'HVAC Services': tone === 'professional' ? 'echo' : 'nova',
    'Painting Services': tone === 'professional' ? 'alloy' : 'shimmer',
    'Roofing Contractor': tone === 'professional' ? 'onyx' : 'echo',
    'Plumbing': tone === 'professional' ? 'echo' : 'alloy',
    'Electrical': tone === 'professional' ? 'onyx' : 'echo',
    'General': tone === 'professional' ? 'alloy' : 'nova'
  }

  return voiceMap[businessType] || 'alloy'
}

export default VOICE_CONFIG

