// Test registration after fixes
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function testRegistrationFixed() {
  console.log('🎯 Testing Registration After Fixes...');
  
  const uniqueEmail = `register-test-${Date.now()}@example.com`;
  const registrationBody = {
    business_name: 'Registration Test Business',
    business_type: 'Consulting',
    owner_name: 'Test Owner',
    email: uniqueEmail,
    password: 'SecurePassword123!',
    phone: '+15559876543',
    website: 'https://regtest.com',
    address: '456 Reg St, Test Town, TS 54321',
    services: ['AI Assistant'],
    service_areas: ['Global']
  };

  try {
    console.log('📤 Sending registration request...');
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationBody),
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log('✅ Registration successful!');
      console.log('Status:', response.status);
      console.log('User ID:', responseData.data?.user?.id);
      console.log('Business ID:', responseData.data?.business?.id);
      console.log('Token created:', !!responseData.data?.token);
    } else {
      console.log(`❌ Registration failed - Status: ${response.status}`);
      console.log('Error Response:', responseData);
    }
  } catch (error) {
    console.error('❌ Error during registration test:', error.message);
  }
}

testRegistrationFixed();
