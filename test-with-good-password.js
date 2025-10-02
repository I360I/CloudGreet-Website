// Test with proper password length
const testWithGoodPassword = async () => {
  try {
    console.log('Testing registration with proper password...')
    
    const response = await fetch('https://cloudgreet.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: 'Test Business',
        business_type: 'HVAC',
        owner_name: 'Test Owner',
        email: `test${Date.now()}@example.com`,
        password: 'testpassword123', // 13 characters - should be good
        phone: '5551234567',
        address: '123 Test St'
      })
    })
    
    const data = await response.json()
    console.log('Status:', response.status)
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ SUCCESS!')
    } else {
      console.log('❌ FAILED')
    }
    
  } catch (error) {
    console.log('Error:', error.message)
  }
}

testWithGoodPassword()
