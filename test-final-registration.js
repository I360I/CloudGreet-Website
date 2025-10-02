// Final Registration Test
console.log('🎯 TESTING FINAL REGISTRATION FIX...');
console.log('=====================================');

const APP_URL = 'https://cloudgreet.com';

const testData = {
  business_name: 'Final Test Business ' + Date.now(),
  business_type: 'HVAC Services',
  owner_name: 'Test Owner',
  email: `finaltest${Date.now()}@example.com`,
  password: 'testpassword123',
  phone: '5551234567',
  address: '123 Test St',
  website: 'https://test.com',
  services: ['HVAC Repair'],
  service_areas: ['Test City']
};

console.log('📤 Sending registration request...');
console.log('Business:', testData.business_name);
console.log('Email:', testData.email);

fetch(`${APP_URL}/api/auth/register`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData),
})
.then(response => {
  console.log('📥 Response status:', response.status);
  return response.json();
})
.then(data => {
  if (data.error) {
    console.log('❌ REGISTRATION FAILED');
    console.log('Error:', data.error.message);
    console.log('Code:', data.error.code);
  } else {
    console.log('🎉 REGISTRATION SUCCESSFUL!');
    console.log('✅ User ID:', data.data?.user?.id);
    console.log('✅ Business ID:', data.data?.business?.id);
    console.log('✅ Agent ID:', data.data?.agent?.id);
    console.log('✅ Token:', data.data?.token ? 'Generated' : 'Missing');
  }
})
.catch(error => {
  console.log('❌ Network error:', error.message);
});

console.log('⏳ Waiting for response...');
