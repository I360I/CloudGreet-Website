import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// In-memory storage for active calls (in production, use Redis or similar)
let activeCalls = new Map()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    return NextResponse.json({
      success: true,
      data: {
        status: 'ready',
        activeCalls: activeCalls.size,
        message: 'AI call processing service is ready'
      }
    })
  } catch (error) {
    console.error('Error in GET process-call:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get call processing status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { callId, callerInput, currentStep, businessName } = body

    // Get or create call session
    let callSession = activeCalls.get(callId)
    if (!callSession) {
      // Create new call session
      callSession = await createNewCallSession(callId, businessName)
      activeCalls.set(callId, callSession)
    }

    // Process the caller's input
    const response = await processCallerInput(callSession, callerInput, currentStep)

    // Update call session
    callSession.currentStep = response.nextStep
    callSession.conversationHistory.push({
      timestamp: new Date().toISOString(),
      callerInput,
      aiResponse: response.aiResponse,
      step: currentStep
    })
    callSession.successMetrics.questionsAsked++

    // Check for completion or escalation
    if (response.outcome === 'completed' || response.outcome === 'escalated') {
      callSession.status = response.outcome
      callSession.successMetrics.outcome = response.outcome
      callSession.endTime = new Date().toISOString()
    }

    // Update the session
    activeCalls.set(callId, callSession)

    return NextResponse.json({
      success: true,
      data: {
        callId,
        aiResponse: response.aiResponse,
        nextStep: response.nextStep,
        outcome: response.outcome,
        confidence: response.confidence,
        callSession: callSession
      }
    })
  } catch (error) {
    console.error('Error processing call:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process call' },
      { status: 500 }
    )
  }
}

async function createNewCallSession(callId, businessName) {
  // Generate initial call flow
  const callFlowResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/call-flow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      phoneNumber: 'unknown', 
      businessName,
      callType: 'incoming' 
    })
  })
  
  const callFlowData = await callFlowResponse.json()
  
  return {
    callId,
    businessName,
    startTime: new Date().toISOString(),
    status: 'active',
    currentStep: 'greeting',
    conversationHistory: [],
    gatheredInformation: {},
    callFlow: callFlowData.data,
    successMetrics: {
      callDuration: 0,
      questionsAsked: 0,
      informationGathered: 0,
      outcome: 'in_progress'
    }
  }
}

async function processCallerInput(callSession, callerInput, currentStep) {
  const { callFlow } = callSession
  const input = callerInput.toLowerCase().trim()

  // Check for emergency or upset caller
  const emergencyCheck = checkForEmergency(input, callFlow.emergencyHandling)
  if (emergencyCheck.isEmergency) {
    return {
      aiResponse: emergencyCheck.response,
      nextStep: 'emergency_handling',
      outcome: 'escalated',
      confidence: 100
    }
  }

  // Check for system confusion
  const confusionCheck = checkForConfusion(input, callSession)
  if (confusionCheck.isConfused) {
    return {
      aiResponse: callFlow.emergencyHandling.backupMode.response,
      nextStep: 'backup_mode',
      outcome: 'escalated',
      confidence: 30
    }
  }

  // Process based on current step
  switch (currentStep) {
    case 'greeting':
      return processGreetingResponse(input, callFlow)
    
    case 'gathering_information':
      return processInformationGathering(input, callSession)
    
    case 'confirmation':
      return processConfirmation(input, callSession)
    
    case 'booking':
      return processBooking(input, callSession)
    
    default:
      return {
        aiResponse: "I'm not sure I understand. Could you please tell me how I can help you today?",
        nextStep: 'greeting',
        outcome: 'in_progress',
        confidence: 50
      }
  }
}

function checkForEmergency(input, emergencyHandling) {
  const emergencyKeywords = emergencyHandling.emergencyKeywords
  const upsetKeywords = emergencyHandling.upsetCallerKeywords
  
  const hasEmergency = emergencyKeywords.some(keyword => input.includes(keyword))
  const hasUpset = upsetKeywords.some(keyword => input.includes(keyword))
  
  if (hasEmergency) {
    return {
      isEmergency: true,
      response: emergencyHandling.emergencyResponse.response
    }
  }
  
  if (hasUpset) {
    return {
      isEmergency: true,
      response: "I understand you're frustrated, and I want to help resolve this quickly. Let me connect you with someone who can assist you right away."
    }
  }
  
  return { isEmergency: false }
}

function checkForConfusion(input, callSession) {
  // Check for unclear responses
  const unclearResponses = ['huh', 'what', 'i don\'t know', 'not sure', 'maybe', 'i guess']
  const hasUnclear = unclearResponses.some(response => input.includes(response))
  
  // Check for repeated confusion
  const recentConfusion = callSession.conversationHistory
    .slice(-3)
    .filter(entry => entry.confidence < 50).length
  
  return {
    isConfused: hasUnclear || recentConfusion >= 2
  }
}

function processGreetingResponse(input, callFlow) {
  // Determine caller intent
  const intent = determineCallerIntent(input)
  
  switch (intent) {
    case 'booking':
      return {
        aiResponse: callFlow.greeting.text + " I'd be happy to help you schedule a service. " + callFlow.questionFlow[0].question,
        nextStep: 'gathering_information',
        outcome: 'in_progress',
        confidence: 85
      }
    
    case 'reschedule':
      return {
        aiResponse: "I can help you reschedule your appointment. Could you please give me your name and phone number so I can look up your existing booking?",
        nextStep: 'gathering_information',
        outcome: 'in_progress',
        confidence: 80
      }
    
    case 'question':
      return {
        aiResponse: "I'd be happy to answer your questions about our services. What would you like to know?",
        nextStep: 'answering_questions',
        outcome: 'in_progress',
        confidence: 75
      }
    
    case 'emergency':
      return {
        aiResponse: "I understand this is urgent. Let me try to connect you with our emergency team right away.",
        nextStep: 'emergency_handling',
        outcome: 'escalated',
        confidence: 90
      }
    
    default:
      return {
        aiResponse: "I want to make sure I help you with exactly what you need. Are you looking to schedule a service, ask a question, or is this an emergency?",
        nextStep: 'greeting',
        outcome: 'in_progress',
        confidence: 60
      }
  }
}

function determineCallerIntent(input) {
  const bookingKeywords = ['book', 'schedule', 'appointment', 'estimate', 'service', 'repair', 'install']
  const rescheduleKeywords = ['reschedule', 'cancel', 'change', 'move', 'postpone']
  const questionKeywords = ['question', 'ask', 'wonder', 'curious', 'how much', 'price', 'cost']
  const emergencyKeywords = ['emergency', 'urgent', 'broken', 'not working', 'asap']
  
  if (emergencyKeywords.some(keyword => input.includes(keyword))) return 'emergency'
  if (bookingKeywords.some(keyword => input.includes(keyword))) return 'booking'
  if (rescheduleKeywords.some(keyword => input.includes(keyword))) return 'reschedule'
  if (questionKeywords.some(keyword => input.includes(keyword))) return 'question'
  
  return 'unclear'
}

function processInformationGathering(input, callSession) {
  const { callFlow } = callSession
  const currentQuestionIndex = callSession.successMetrics.questionsAsked
  const currentQuestion = callFlow.questionFlow[currentQuestionIndex]
  
  if (!currentQuestion) {
    // All questions answered, move to confirmation
    return {
      aiResponse: "Perfect! I have all the information I need. Let me confirm everything with you.",
      nextStep: 'confirmation',
      outcome: 'in_progress',
      confidence: 90
    }
  }
  
  // Extract information based on question type
  const extractedInfo = extractInformation(input, currentQuestion)
  
  // Store the information
  callSession.gatheredInformation[currentQuestion.id] = extractedInfo.value
  
  // Generate follow-up response
  const followUp = currentQuestion.followUp.replace(`{${currentQuestion.id}}`, extractedInfo.value)
  
  // Check if this was the last question
  const isLastQuestion = currentQuestionIndex >= callFlow.questionFlow.length - 1
  
  if (isLastQuestion) {
    return {
      aiResponse: followUp + " Let me confirm everything with you.",
      nextStep: 'confirmation',
      outcome: 'in_progress',
      confidence: extractedInfo.confidence
    }
  } else {
    const nextQuestion = callFlow.questionFlow[currentQuestionIndex + 1]
    return {
      aiResponse: followUp + nextQuestion.question,
      nextStep: 'gathering_information',
      outcome: 'in_progress',
      confidence: extractedInfo.confidence
    }
  }
}

function extractInformation(input, question) {
  switch (question.type) {
    case 'text':
      return {
        value: input,
        confidence: 85
      }
    
    case 'phone':
      const phoneMatch = input.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)
      return {
        value: phoneMatch ? phoneMatch[0] : input,
        confidence: phoneMatch ? 95 : 60
      }
    
    case 'address':
      return {
        value: input,
        confidence: 80
      }
    
    case 'select':
      const selectedOption = question.options.find(option => 
        input.includes(option.toLowerCase())
      )
      return {
        value: selectedOption || input,
        confidence: selectedOption ? 90 : 70
      }
    
    case 'datetime':
      // Simple datetime extraction (in production, use more sophisticated NLP)
      const timeKeywords = ['morning', 'afternoon', 'evening', 'tomorrow', 'today', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      const hasTimeKeyword = timeKeywords.some(keyword => input.includes(keyword))
      return {
        value: input,
        confidence: hasTimeKeyword ? 80 : 60
      }
    
    default:
      return {
        value: input,
        confidence: 70
      }
  }
}

function processConfirmation(input, callSession) {
  const { gatheredInformation, callFlow } = callSession
  
  // Check if caller confirms
  const confirmationKeywords = ['yes', 'correct', 'right', 'sounds good', 'that\'s right', 'perfect']
  const denialKeywords = ['no', 'wrong', 'incorrect', 'change', 'different']
  
  const isConfirmed = confirmationKeywords.some(keyword => input.includes(keyword))
  const isDenied = denialKeywords.some(keyword => input.includes(keyword))
  
  if (isConfirmed) {
    // Generate confirmation message
    const confirmationMessage = generateConfirmationMessage(gatheredInformation, callFlow)
    return {
      aiResponse: confirmationMessage + " Your appointment is confirmed! You'll receive a text confirmation shortly. Is there anything else I can help you with?",
      nextStep: 'booking',
      outcome: 'completed',
      confidence: 95
    }
  } else if (isDenied) {
    return {
      aiResponse: "No problem! Let me correct that. What would you like to change?",
      nextStep: 'gathering_information',
      outcome: 'in_progress',
      confidence: 80
    }
  } else {
    return {
      aiResponse: "I want to make sure I have everything right. Does the information I have sound correct to you?",
      nextStep: 'confirmation',
      outcome: 'in_progress',
      confidence: 60
    }
  }
}

function generateConfirmationMessage(information, callFlow) {
  const template = callFlow.confirmationSystem.confirmationTemplate
  return template
    .replace('{name}', information.caller_name || 'you')
    .replace('{address}', information.service_address || 'your address')
    .replace('{service}', information.service_type || 'the service')
    .replace('{date}', information.preferred_time || 'the scheduled time')
    .replace('{time}', information.preferred_time || 'the scheduled time')
}

function processBooking(input, callSession) {
  // Final booking confirmation
  return {
    aiResponse: "Perfect! Your appointment is all set. You'll receive a confirmation text and email shortly. Thank you for choosing us, and have a great day!",
    nextStep: 'completed',
    outcome: 'completed',
    confidence: 100
  }
}

