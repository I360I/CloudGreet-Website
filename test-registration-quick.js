// Quick Registration Test
const APP_URL = 'https://cloudgreet.com'; // Your deployed URL

async function testRegistration() {
  console.log('🧪 Testing Registration System...');
  
  const testData = {
    business_name: 'Test Business ' + Date.now(),
    business_type: 'HVAC Services',
    owner_name: 'Test Owner',
    email: `test${Date.now()}@example.com`,
    password: 'testpassword123',
    phone: '5551234567',
    address: '123 Test St',
    website: 'https://test.com',
    services: ['HVAC Repair'],
    service_areas: ['Test City']
  };

  try {
    const response = await fetch(`${APP_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Registration working!');
      return true;
    } else {
      console.log('❌ Registration failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
    return false;
  }
}

testRegistration();
