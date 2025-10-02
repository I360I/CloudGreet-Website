// Test SMS Notification System
// Run with: node test-sms-notifications.js

const BASE_URL = 'https://cloudgreet.com';

async function testSMSNotification(type, message, priority = 'normal') {
  try {
    console.log(`\n🧪 Testing ${type} notification...`);
    
    const response = await fetch(`${BASE_URL}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        message,
        priority,
        businessId: 'test-business-id'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${type} notification sent successfully!`);
      console.log(`📱 You should receive an SMS at +17372960092`);
    } else {
      console.log(`❌ Failed to send ${type} notification:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.log(`❌ Error testing ${type} notification:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Starting SMS Notification Tests...');
  console.log('📱 Testing notifications to: +17372960092');
  console.log('📞 From business number: +17372448305');
  
  // Test 1: New Client Signup
  await testSMSNotification(
    'client_acquisition',
    'Test Business (test@example.com) signed up for CloudGreet',
    'high'
  );
  
  // Wait 2 seconds between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: New Appointment Booking
  await testSMSNotification(
    'client_booking',
    'New appointment: John Doe - HVAC Repair on 12/25/2024 at 2:00 PM',
    'normal'
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: System Error
  await testSMSNotification(
    'system_error',
    'Database connection timeout - check server status',
    'urgent'
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 4: Payment Received
  await testSMSNotification(
    'payment_received',
    'Payment of $200 received from Test Business for monthly subscription',
    'high'
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 5: Client Support Request
  await testSMSNotification(
    'client_support',
    'Support request from Test Business: Need help with phone setup',
    'high'
  );
  
  console.log('\n🎉 All SMS notification tests completed!');
  console.log('📱 Check your phone (+17372960092) for the test messages');
  console.log('📊 View notification logs at: https://cloudgreet.com/admin/monitoring');
}

// Run the tests
runAllTests().catch(console.error);
