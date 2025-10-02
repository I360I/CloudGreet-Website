// Simple debug test
const debugTest = async () => {
  try {
    const response = await fetch('https://cloudgreet.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: 'Debug Test Business',
        business_type: 'HVAC',
        owner_name: 'Debug Test Owner',
        email: `debug${Date.now()}@example.com`,
        password: 'testpassword123',
        phone: '5551234567',
        address: '123 Debug Street'
      })
    })
    
    const data = await response.json()
    console.log('Status:', response.status)
    console.log('Response:', JSON.stringify(data, null, 2))
    
  } catch (error) {
    console.log('Error:', error.message)
  }
}

debugTest()
