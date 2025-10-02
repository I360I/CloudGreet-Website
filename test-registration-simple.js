// Simple registration test
const fetch = require('node-fetch');

async function testRegistration() {
  console.log('🧪 Testing registration endpoint...');
  
  try {
    // Test if the endpoint is accessible
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: 'Test Business',
        business_type: 'HVAC',
        owner_name: 'Test Owner',
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        phone: '+15551234567',
        website: 'https://test.com',
        address: '123 Test St, Test City, TS 12345',
        services: ['HVAC'],
        service_areas: ['Test City']
      }),
    });

    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Registration successful!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Registration failed');
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testRegistration();
