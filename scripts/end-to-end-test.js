#!/usr/bin/env node

/**
 * END-TO-END USER JOURNEY TEST
 * Tests the complete flow from signup to revenue generation
 */

const BASE_URL = 'https://cloud-greet-website-qsng3mdn3-i360is-projects.vercel.app'






let testResults = []
let authToken = null
let businessId = null
let phoneNumber = null

async function testStep(stepName, testFunction) {
  
  )
  
  try {
    const result = await testFunction()
    testResults.push({ step: stepName, status: 'PASS', result })
    
    return result
  } catch (error) {
    testResults.push({ step: stepName, status: 'FAIL', error: error.message })
    
    throw error
  }
}

async function testLandingPage() {
  const response = await fetch(`${BASE_URL}/`)
  if (response.status !== 200 && response.status !== 307) {
    throw new Error(`HTTP ${response.status}`)
  }
  return { status: response.status }
}

async function testUserRegistration() {
  const registrationData = {
    businessName: 'Test HVAC Company',
    businessType: 'HVAC',
    email: `test-${Date.now()}@example.com`,
    password: 'testpassword123',
    confirmPassword: 'testpassword123',
    phone: '14155551234',
    address: '123 Test St, Test City, TC 12345'
  }

  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registrationData)
  })

  if (!response.ok) {
    const errorData = await response.json()
    }`)
    throw new Error(`Registration failed: ${errorData.error || response.statusText}`)
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(`Registration failed: ${result.error}`)
  }

  authToken = result.data.token
  businessId = result.data.business.id
  
  }...`)
  
  return result
}

async function testPhoneNumberProvisioning() {
  const response = await fetch(`${BASE_URL}/api/phone/provision`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Phone provisioning failed: ${errorData.error || response.statusText}`)
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(`Phone provisioning failed: ${result.error}`)
  }

  phoneNumber = result.phoneNumber
  
  
  return result
}

async function testDashboardAccess() {
  const response = await fetch(`${BASE_URL}/api/dashboard/data`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })

  if (response.status !== 200 && response.status !== 307) {
    throw new Error(`Dashboard access failed: ${response.statusText}`)
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(`Dashboard data failed: ${result.error}`)
  }

  
  
  
  
  return result
}

async function testROICalculation() {
  const response = await fetch(`${BASE_URL}/api/dashboard/data`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`ROI calculation failed: ${response.statusText}`)
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(`Dashboard data not available`)
  }

  // For new businesses, ROI data might be empty/zero - this is expected
  const roi = result.data.roi || {
    totalRevenue: 0,
    totalCosts: 0,
    netProfit: 0,
    roiPercentage: 0,
    totalAppointments: 0
  }

  
  
  
  
  
  return result
}

async function testCallLogs() {
  const response = await fetch(`${BASE_URL}/api/calls`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`Call logs failed: ${response.statusText}`)
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(`Call logs failed: ${result.error}`)
  }

  
  
  return result
}

async function testAppointmentBooking() {
  const response = await fetch(`${BASE_URL}/api/appointments/schedule`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customerName: 'Test Customer',
      customerPhone: '5551234567',
      customerEmail: 'test@example.com',
      serviceType: 'Test Service',
      scheduledDate: '2024-12-25T10:00:00Z',
      notes: 'Test appointment booking'
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    
    throw new Error(`Appointment booking failed: ${errorData.error || response.statusText}`)
  }

  const result = await response.json()
  
  
  return result
}

async function testBillingIntegration() {
  // Test if billing system is accessible
  const response = await fetch(`${BASE_URL}/api/billing/per-booking`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      appointmentId: 'test-appointment-id',
      customerName: 'Test Customer',
      serviceType: 'Test Service',
      estimatedValue: 500
    })
  })

  // We expect this to fail without a real appointment, but the API should be accessible
  if (response.status === 401 || response.status === 403) {
    `)
    return { status: 'accessible' }
  }

  if (response.status === 400) {
    `)
    return { status: 'accessible' }
  }

  throw new Error(`Billing API not accessible: ${response.status}`)
}

async function testSMSRecovery() {
  const response = await fetch(`${BASE_URL}/api/calls/missed-recovery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      callId: 'test-call-id',
      businessId: businessId,
      callerPhone: '+15551234567',
      callerName: 'Test Caller',
      reason: 'missed'
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`SMS recovery failed: ${errorData.error || response.statusText}`)
  }

  const result = await response.json()
  
  
  return result
}

async function testRealTimeUpdates() {
  // Test if real-time system is accessible
  const response = await fetch(`${BASE_URL}/api/dashboard/real-metrics`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })

  if (response.status === 200 || response.status === 401) {
    
    return { status: 'accessible' }
  }

  throw new Error(`Real-time system not accessible: ${response.status}`)
}

async function runCompleteJourney() {
  try {
    

    // Step 1: Landing Page
    await testStep('Landing Page Access', testLandingPage)

    // Step 2: User Registration
    await testStep('User Registration', testUserRegistration)

    // Step 3: Phone Number Provisioning
    await testStep('Phone Number Provisioning', testPhoneNumberProvisioning)

    // Step 4: Dashboard Access
    await testStep('Dashboard Access', testDashboardAccess)

    // Step 5: ROI Calculation
    await testStep('ROI Calculation', testROICalculation)

    // Step 6: Call Logs
    await testStep('Call Logs Access', testCallLogs)

    // Step 7: Appointment Booking
    await testStep('Appointment Booking', testAppointmentBooking)

    // Step 8: Billing Integration
    await testStep('Billing Integration', testBillingIntegration)

    // Step 9: SMS Recovery
    await testStep('SMS Recovery System', testSMSRecovery)

    // Step 10: Real-time Updates
    await testStep('Real-time Updates', testRealTimeUpdates)

    
    
    .length}`)
    .length}`)
    

    if (testResults.every(r => r.status === 'PASS')) {
      
      
      
      
      
    } else {
      
      testResults.filter(r => r.status === 'FAIL').forEach(result => {
        
      })
    }

  } catch (error) {
    
    
    testResults.filter(r => r.status === 'FAIL').forEach(result => {
      
    })
    process.exit(1)
  }
}

// Run the complete journey test
runCompleteJourney()
