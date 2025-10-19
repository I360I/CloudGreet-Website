// Test simple API endpoints
const fetch = require('node-fetch');

async function testAPIs() {
  console.log('🧪 Testing API Endpoints...\n');
  
  // Test health endpoint
  try {
    const healthResponse = await fetch('http://localhost:3000/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health API:', healthResponse.status, healthData);
  } catch (error) {
    console.log('❌ Health API Error:', error.message);
  }
  
  // Test admin login
  try {
    const adminResponse = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'Anthonyis42!' })
    });
    const adminData = await adminResponse.json();
    console.log('✅ Admin Login API:', adminResponse.status, adminData);
  } catch (error) {
    console.log('❌ Admin Login API Error:', error.message);
  }
  
  // Test click-to-call
  try {
    const callResponse = await fetch('http://localhost:3000/api/click-to-call/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '5551234567', businessName: 'Test Company' })
    });
    const callData = await callResponse.json();
    console.log('✅ Click-to-Call API:', callResponse.status, callData);
  } catch (error) {
    console.log('❌ Click-to-Call API Error:', error.message);
  }
  
  // Test client registration
  try {
    const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'Test Company',
        businessType: 'HVAC Services',
        email: 'test@example.com',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
        phone: '5551234567',
        address: '123 Test St'
      })
    });
    const registerData = await registerResponse.json();
    console.log('✅ Client Registration API:', registerResponse.status, registerData);
  } catch (error) {
    console.log('❌ Client Registration API Error:', error.message);
  }
}

testAPIs();
