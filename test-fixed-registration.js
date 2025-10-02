// Test Fixed Registration
console.log('🧪 Testing Fixed Registration...');

const APP_URL = 'https://cloudgreet.com';

const testData = {
  business_name: 'Fixed Test Business ' + Date.now(),
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

console.log('Sending registration request...');

fetch(`${APP_URL}/api/auth/register`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData),
})
.then(response => {
  console.log('Response status:', response.status);
  return response.json();
})
.then(data => {
  if (data.error) {
    console.log('❌ Registration failed:', data.error.message);
  } else {
    console.log('✅ Registration successful!');
    console.log('User ID:', data.data?.user?.id);
    console.log('Business ID:', data.data?.business?.id);
  }
})
.catch(error => {
  console.log('❌ Network error:', error.message);
});
