// Test registration system specifically
require('dotenv').config({ path: '.env.local' });

async function testRegistration() {
  try {
    console.log('🔍 Testing registration system...');
    
    const testData = {
      business_name: "Test Business",
      business_type: "Painting", 
      owner_name: "Test Owner",
      email: "test@example.com",
      password: "testpassword123",
      phone: "5551234567",
      website: "https://test.com",
      address: "123 Test St",
      services: ["Painting"],
      service_areas: ["Test City"]
    };
    
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    console.log(`Status: ${response.status}`);
    
    const result = await response.text();
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ Registration system is working!');
    } else {
      console.log('❌ Registration system has issues');
    }
    
  } catch (error) {
    console.error('❌ Error testing registration:', error.message);
  }
}

testRegistration();
